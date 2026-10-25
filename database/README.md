# Dr.250 database

PostgreSQL 16 and `pgcrypto` are required. The numbered SQL files in `migrations/` are forward-only schema history. Legacy laboratory and access-session columns remain to preserve existing data. `retired-migrations/012_embeddings.sql` archives the former AI migration and is excluded from fresh installs.

Set `DATABASE_URL` and `DATABASE_SSL` as described in the [root README](../README.md). For a new or existing application database, run `npm run db:migrate` from `apps/backend`. The migration runner tracks applied files and preserves existing rows. Do not recreate a populated database or rerun `schema.sql` over one.

`schema.sql` is a historical `psql` bootstrap for the original schema. Its seed and security scripts also cover former roles; they are retained for historical compatibility and are not the current two-role application setup. Use the backend migration runner and the root README's patient and doctor demonstration for current work.

For disposable database integration tests, set `DR250_DISPOSABLE_URL` and `AUTH_INTEGRATION_URL` to a migrated, loopback PostgreSQL database named `dr250_release_*`, then run `npm test` from `apps/backend`. The tests cover migration compatibility and the patient grant, doctor read, prescription, and revocation flow. Never point these variables at production data.

`apps/backend/src/database/pool.js` owns the shared pool. The server exposes separate HTTP and database readiness endpoints at `/api/health` and `/api/health/database`.
