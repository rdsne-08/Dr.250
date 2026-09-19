# Dr.250 Database

The Dr.250 database targets PostgreSQL 16 with the `pgcrypto` and `vector`
extensions. Numbered files in `migrations/` are the source of truth.
`schema.sql` is the canonical `psql` entry point and applies those migrations in
dependency order.

## Environment

The backend requires:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sasthosetu
DATABASE_SSL=false
```

Use `DATABASE_SSL=true` for a hosted provider that requires TLS. The backend
does not log the connection string and converts driver failures into a sanitized
`DatabaseError`.

For the real backend service integration test, also set:

```env
DATABASE_INTEGRATION_URL=postgresql://postgres:postgres@localhost:5432/dr250_test
```

Never point `DATABASE_INTEGRATION_URL` at a production database. The integration
test creates development-only records.

## Migration order

1. `001_extensions.sql`
2. `002_users.sql`
3. `003_profiles.sql`
4. `004_patients.sql`
5. `005_doctors.sql`
6. `006_laboratories.sql`
7. `007_medical_records.sql`
8. `008_prescriptions.sql`
9. `009_lab_reports.sql`
10. `010_access_sessions.sql`
11. `011_audit_logs.sql`
12. `012_embeddings.sql`
13. `policies.sql`
14. `seed.sql` for development only

Apply a fresh development database with `psql`:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/policies.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seed.sql
```

The numbered migrations are intentionally forward-only and should be applied to
a fresh database in this order. Do not rerun `schema.sql` over an existing
schema. Add a new numbered migration for later schema changes.

## Development seed

`seed.sql` contains deterministic development identities for one patient,
doctor, laboratory, and administrator, plus representative medical data and an
active doctor-access session. It contains no production credentials or usable
access-session secret.

The seeded `users.id` values mirror the IDs that Supabase Auth must return. To
exercise authenticated HTTP APIs, provision matching development-only Supabase
users or replace the seed UUIDs with the development Auth user IDs.

## Verification

On a fresh test database, run:

```bash
psql "$DATABASE_INTEGRATION_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
psql "$DATABASE_INTEGRATION_URL" -v ON_ERROR_STOP=1 -f database/policies.sql
psql "$DATABASE_INTEGRATION_URL" -v ON_ERROR_STOP=1 -f database/seed.sql
psql "$DATABASE_INTEGRATION_URL" -v ON_ERROR_STOP=1 -f database/tests/verify.sql
psql "$DATABASE_INTEGRATION_URL" -v ON_ERROR_STOP=1 -f database/tests/security.sql
```

Then run the backend service flow:

```bash
cd apps/backend
npm run test:database
npm test
npm run check
```

The verification scripts check extensions, tables, foreign keys, indexes,
constraints, RLS enablement, seed roles, patient isolation, doctor access
sessions, laboratory assignment isolation, and administrator access. All
security test data is wrapped in a transaction and rolled back.

## Backend connection lifecycle

`apps/backend/src/database/pool.js` owns the shared PostgreSQL pool. Queries are
parameterized through `query()`, multi-step writes use `withTransaction()`, and
the server calls `closeDatabase()` during graceful shutdown. Database readiness
is exposed separately at `GET /api/health/database`.
