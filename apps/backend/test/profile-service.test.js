import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { DatabaseError } = await import('../src/database/pool.js');
const { createProfile } = await import('../src/modules/auth/services/profile.service.js');

function createDatabase({ failPatientInsert = false } = {}) {
  const commands = [];
  let released = false;
  const client = {
    async query(text, values = []) {
      const normalized = text.replace(/\s+/g, ' ').trim();
      commands.push({ text: normalized, values });

      if (normalized.startsWith('INSERT INTO public.profiles')) {
        return {
          rows: [{
            profile_id: '10000000-0000-4000-8000-000000000001',
            user_id: values[0],
            full_name: values[1],
            phone: null,
            role: values[2],
          }],
        };
      }

      if (normalized.startsWith('INSERT INTO public.patients')) {
        if (failPatientInsert) throw new Error('patient insert failed');
        return { rows: [{ id: '20000000-0000-4000-8000-000000000001' }] };
      }

      if (normalized.startsWith('INSERT INTO public.laboratories')) {
        return {
          rows: [{
            id: '30000000-0000-4000-8000-000000000001',
            lab_name: values[1],
            license_number: values[2],
            verification_status: 'PENDING',
          }],
        };
      }

      return { rows: [] };
    },
    release() {
      released = true;
    },
  };

  return {
    commands,
    database: { connect: async () => client },
    wasReleased: () => released,
  };
}

test('patient registration creates user, profile, and patient in one transaction', async () => {
  const fake = createDatabase();
  const profile = await createProfile({
    userId: '00000000-0000-4000-8000-000000000001',
    email: 'patient@example.com',
    fullName: 'Patient Example',
    role: 'PATIENT',
  }, fake.database);

  assert.equal(profile.patient_id, '20000000-0000-4000-8000-000000000001');
  assert.deepEqual(
    fake.commands.map(({ text }) => text.split(' ').slice(0, 3).join(' ')),
    ['BEGIN', 'INSERT INTO public.users', 'INSERT INTO public.profiles', 'INSERT INTO public.patients', 'COMMIT'],
  );
  assert.equal(fake.wasReleased(), true);
});

test('local password hash is persisted in the private schema with the profile transaction', async () => {
  const fake = createDatabase();
  await createProfile({
    userId: '00000000-0000-4000-8000-000000000009',
    email: 'local@example.com', fullName: 'Local Patient', role: 'PATIENT',
    passwordHash: 'scrypt:private-hash',
  }, fake.database);
  const credential = fake.commands.find(command => command.text.startsWith('INSERT INTO private.account_credentials'));
  assert.deepEqual(credential.values, ['00000000-0000-4000-8000-000000000009', 'scrypt:private-hash']);
  assert.equal(fake.commands.at(-1).text, 'COMMIT');
});

test('patient registration rolls back all database rows when patient creation fails', async () => {
  const fake = createDatabase({ failPatientInsert: true });

  await assert.rejects(
    createProfile({
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'patient@example.com',
      fullName: 'Patient Example',
      role: 'PATIENT',
      passwordHash: 'scrypt:private-hash',
    }, fake.database),
    DatabaseError,
  );

  assert.equal(fake.commands.at(-1).text, 'ROLLBACK');
  assert.ok(fake.commands.some(({ text }) => text.startsWith('INSERT INTO private.account_credentials')));
  assert.equal(fake.commands.some(({ text }) => text === 'COMMIT'), false);
  assert.equal(fake.wasReleased(), true);
});

test('laboratory registration creates user, profile, and laboratory in one transaction', async () => {
  const fake = createDatabase();
  const profile = await createProfile({
    userId: '00000000-0000-4000-8000-000000000003',
    email: 'lab@example.com',
    fullName: 'Lab Operator',
    role: 'LAB',
    labName: 'Dhaka Diagnostics',
    licenseNumber: 'DGHS-1234',
  }, fake.database);

  assert.equal(profile.laboratory_id, '30000000-0000-4000-8000-000000000001');
  assert.equal(profile.lab_name, 'Dhaka Diagnostics');
  assert.equal(profile.license_number, 'DGHS-1234');
  assert.deepEqual(
    fake.commands.map(({ text }) => text.split(' ').slice(0, 3).join(' ')),
    ['BEGIN', 'INSERT INTO public.users', 'INSERT INTO public.profiles', 'INSERT INTO public.laboratories', 'COMMIT'],
  );
});
