import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/dr250_test';
process.env.SUPABASE_URL ||= 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key';

const { DatabaseError, query, testDatabaseConnection, withTransaction } = await import(
  '../src/database/pool.js'
);

test('query delegates parameterized SQL to the selected database client', async () => {
  const database = {
    query: async (text, values) => ({ rows: [{ text, values }] }),
  };

  const result = await query('SELECT $1::text AS value', ['safe-value'], database);
  assert.deepEqual(result.rows[0], {
    text: 'SELECT $1::text AS value',
    values: ['safe-value'],
  });
});

test('query converts driver failures into DatabaseError', async () => {
  const database = {
    query: async () => {
      throw Object.assign(new Error('sensitive driver message'), { code: '08006' });
    },
  };

  await assert.rejects(query('SELECT 1', [], database), (error) => {
    assert.ok(error instanceof DatabaseError);
    assert.equal(error.code, '08006');
    assert.equal(error.message, 'A database operation failed.');
    return true;
  });
});

test('withTransaction commits successful work and releases the client', async () => {
  const commands = [];
  let released = false;
  const client = {
    query: async (text) => {
      commands.push(text);
      return { rows: [{ ok: true }] };
    },
    release: () => {
      released = true;
    },
  };
  const database = { connect: async () => client };

  const result = await withTransaction(
    async (transaction) => (await transaction.query('SELECT 1')).rows[0],
    database,
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(commands, ['BEGIN', 'SELECT 1', 'COMMIT']);
  assert.equal(released, true);
});

test('withTransaction rolls back failed work and releases the client', async () => {
  const commands = [];
  let released = false;
  const client = {
    query: async (text) => {
      commands.push(text);
      return { rows: [] };
    },
    release: () => {
      released = true;
    },
  };
  const database = { connect: async () => client };

  await assert.rejects(
    withTransaction(async () => {
      throw new Error('work failed');
    }, database),
    DatabaseError,
  );

  assert.deepEqual(commands, ['BEGIN', 'ROLLBACK']);
  assert.equal(released, true);
});

test('database connection check validates the query result', async () => {
  const connected = await testDatabaseConnection({
    query: async () => ({ rows: [{ connected: 1 }] }),
  });
  const disconnected = await testDatabaseConnection({
    query: async () => ({ rows: [{ connected: 0 }] }),
  });

  assert.equal(connected, true);
  assert.equal(disconnected, false);
});
