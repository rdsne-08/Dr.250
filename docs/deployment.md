# Public deployment preparation

Status: **synthetic public demonstration deployed**. The preparation and operational notes below record the release setup and constraints; references to pre-deployment approval are historical. The public site uses synthetic demonstration accounts only. Never connect the local `sasthosetu` database or a `dr250_release_*` test database to a public service. Current verification results are recorded in the [project README](../README.md#testing-and-deployment).

## Architecture and repository settings

| Component | Configuration derived from this repository |
| --- | --- |
| Frontend | Vercel static Vite project, Root Directory `apps/frontend`, provider-generated `vercel.app` URL |
| API | Render Docker Web Service in Singapore, repository-root build context, Dockerfile path `apps/backend/Dockerfile`, provider-generated `onrender.com` URL |
| Database | New Render managed PostgreSQL 16 instance in Singapore, connected to the API by its **internal** database URL |

The frontend is self-contained in `apps/frontend`: it has its own `package.json`, `package-lock.json`, source, public assets, and Vite configuration. Its imports do not require files above that directory. The backend Dockerfile copies `apps/backend` and `database` from the repository root, so its build context must remain the repository root. It uses Node `22.23.4-alpine`, installs locked production dependencies with `npm ci --omit=dev`, then runs `node scripts/migrate.js && npm start`. `npm start` runs `node src/server.js`.

## 1. Vercel frontend setup

1. After approval, import the GitHub repository into a new Vercel project. Set **Root Directory** to `apps/frontend`, **Framework Preset** to Vite, **Node.js version** to 24.x, **Install Command** to `npm ci`, **Build Command** to `npm run build`, and **Output Directory** to `dist`.
2. Set only `VITE_API_URL` in the Vercel production environment. It must be the public HTTPS origin of the Render API, with no trailing slash. Vite embeds this value at build time; changing it requires a new frontend build.
3. Keep `apps/frontend/vercel.json`: its rewrite to `/index.html` allows direct navigation to React routes such as `/login`, `/patient`, `/doctor`, and `/admin`.
4. Use the provider-generated `vercel.app` URL. Do not add a custom domain or put database credentials, Supabase service keys, or any private value in a `VITE_` variable.

Vercel Hobby is free for **personal, non-commercial** use and cannot connect a project to a Git organization-owned repository. Confirm that this demo and the GitHub repository's ownership qualify before selecting Hobby; a commercial or organization deployment needs a suitable plan. See [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Git connection limits](https://vercel.com/docs/limits), [build settings](https://vercel.com/docs/builds/configure-a-build), and [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## 2. Render API setup

1. After approval, create a Docker Web Service from the GitHub repository. Choose **Singapore** and a free or approved paid compute plan. Keep Root Directory at the repository root; set Dockerfile Path to `apps/backend/Dockerfile` and Docker Build Context to `.`. Do not override the Dockerfile's start command.
2. The server reads the host-provided `PORT` and calls `app.listen(port)` without a loopback host, so it can accept traffic on Render's external interface. Render normally provides `PORT=10000`; do not hardcode a different value. The Dockerfile's `EXPOSE 3000` is image metadata, not the runtime listener setting.
3. Set the environment variables in the table below. `CORS_ORIGIN` must exactly match the final frontend HTTPS origin, with no trailing slash. The app currently accepts one origin through `cors({ origin: env.corsOrigin })`; preview domains are not automatically allowed.
4. Configure the HTTP health-check path as `/api/health/database` to confirm database readiness. `/api/health` checks only the HTTP process. Migrations run before the server starts; a failed migration prevents a healthy deployment.
5. Review Render logs for startup and 5xx failures. The app uses `helmet`, a 1 MB JSON request limit, structured 4xx/5xx responses, and server-side logging for unexpected errors. Do not enable request-header or secret logging.

See Render's [Docker setup](https://render.com/docs/docker), [web-service port rules](https://render.com/docs/web-services), [health checks](https://render.com/docs/health-checks), and [regions](https://render.com/docs/regions).

## 3. Fresh PostgreSQL setup and migrations

1. After approval, create a **new**, empty Render PostgreSQL 16 database in Singapore. Use its private internal URL for the Render API in the same account and region. Restrict or disable external database access when no operator connection is needed. Never use a local database URL, local volume, backup, or patient/doctor export.
2. The active migrations in `database/migrations` require `pgcrypto`; `001_extensions.sql` creates it. The old `012_embeddings.sql` that uses `vector(1536)` and an HNSW index is in `database/retired-migrations` and is **not** applied to a fresh database. Render supports both `pgcrypto` and `pgvector`; keep pgvector availability in mind only for a separately approved historical restore. Do not enable or import the legacy embeddings for this fresh deployment.
3. The Docker start command runs the complete forward-only migration chain against `DATABASE_URL`. The runner creates `dr250_meta.schema_migrations`, records checksums, uses a PostgreSQL advisory lock, applies each migration transactionally, and verifies `pgcrypto`, core tables, RLS flags, and policies. Do not run `database/schema.sql` over the new database.
4. Before connecting the API, verify the database identity and that it is empty. After migration, verify the migration ledger, `/api/health/database`, and that no users or patients were imported. Use a separate production backup plan before adding even synthetic accounts.

On 11 November 2026, the then-active chain was tested twice on a separate temporary PostgreSQL **16.15** container with an ephemeral filesystem. The first run applied 21 ledger entries including `policies.sql`; the second run recognized them as current. Verification found `pgcrypto`, 10 core application tables, and 49 policies. The test database had **zero users** and the temporary container was removed. This did not touch `sasthosetu`. Migration `023_auth_security.sql` then applied and reran successfully on disposable PostgreSQL 16. The full backend suite passed 79/79 there with no skips, including the historical pgvector fixture and Admin bootstrap test.

The patched backend Docker image was also built and started against another temporary empty database. It ran the migrations, listened on a supplied nondefault port, and returned HTTP 200 from `/api/health/database`. Those local containers and their network were removed after the check.

Render's [internal connection guidance](https://render.com/docs/postgresql-creating-connecting) and [supported extensions](https://render.com/docs/postgresql-extensions) describe the provider settings. The internal connection can use `DATABASE_SSL=false` on Render's private network; external connections require TLS. `DATABASE_SSL=true` now requires certificate verification. Test this with the provider's external hostname before using a private operator connection; do not disable verification to work around a certificate error.

## 4. Environment-variable checklist

| Location | Variable | Purpose |
| --- | --- | --- |
| Vercel build | `VITE_API_URL` | Public HTTPS Render API origin; the only required Vite variable |
| Render runtime and migration | `DATABASE_URL` | Private internal URL of the new Render PostgreSQL database; secret |
| Render runtime and migration | `DATABASE_SSL` | `false` for the private Render connection described above; evaluate TLS before changing |
| Render runtime | `NODE_ENV` | `production` |
| Render runtime | `PORT` | Render-provided listener port; normally leave unset so Render supplies it |
| Render runtime | `CORS_ORIGIN` | Exact production Vercel HTTPS origin |
| Render runtime | `TRUST_PROXY_HOPS` | `1` for Render's single trusted proxy hop; verify in public smoke tests |
| Render runtime, only if legacy accounts are explicitly migrated | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Optional legacy authentication; **not needed** for a fresh local-account database |
| Private one-time Admin job, never the web-service runtime | `DR250_ADMIN_BOOTSTRAP_SECRET`, `DR250_ADMIN_BOOTSTRAP_PASSWORD`, `DR250_ADMIN_BOOTSTRAP_DATABASE_NAME` | Random 43+ character base64url secret and a unique 16–128 character Admin password; remove after the job |

Do not set `DR250_DISPOSABLE_URL`, `AUTH_INTEGRATION_URL`, `DR250_DEMO_ADMIN_PASSWORD`, local `.env` contents, or any test credentials in production. Do not put secret values in GitHub, source code, Vercel build variables, deployment logs, or this document.

## 5. Authentication, Admin, and security gate

New accounts use salted `scrypt` password hashes in `private.account_credentials`. Local access tokens are random bearer tokens whose SHA-256 hashes are stored in `private.auth_sessions` for 24 hours. The browser stores the bearer token in session storage, or local storage when the user chooses to remember the session. This flow uses **no authentication cookie or application JWT secret**. Legacy Supabase JWT verification is optional and should remain unconfigured for the new empty database. HTTPS is required for both public origins.

Public registration cannot create an Admin. `scripts/provision-demo-admin.js` intentionally refuses production databases. After confirming the new production database identity and its empty Admin roster, run `node scripts/provision-production-admin.js <admin-email> <admin-name>` once from a private, trusted operator environment with `NODE_ENV=production`, `DATABASE_URL`, `DR250_ADMIN_BOOTSTRAP_DATABASE_NAME`, `DR250_ADMIN_BOOTSTRAP_SECRET`, and `DR250_ADMIN_BOOTSTRAP_PASSWORD` supplied privately. Do not put the password or secret in arguments, shell history, logs, or the Render web-service environment. The CLI uses the existing scrypt password hasher and one transaction to create the Admin, consume the one-time marker, and write an `ADMIN_BOOTSTRAPPED` audit event. The database marker and advisory lock reject repeat or concurrent bootstrap; remove the bootstrap variables after success. If the Admin account is lost, do not delete the marker or repeat bootstrap. Restore access through a separately reviewed, audited recovery procedure. Free Render web services have no shell access, so the private operator environment must have secure access to the new database; choose a suitable paid one-off job or another reviewed private connection method. Create synthetic demo accounts only after deployment approval, and never use real patient information for this demo.

The API now uses PostgreSQL-backed fixed-window limits shared by all backend instances: login has 10 requests per normalized email and 300 per peer address per 15 minutes; registration has 3 per email and 120 per peer address per hour. It returns the same 429 message and `Retry-After` for any identity, and fails closed with 503 if the limiter database is unavailable. No Redis is required. Set `TRUST_PROXY_HOPS=1` on Render only. Express then uses the rightmost forwarded address from its one trusted proxy hop, ignoring earlier client-supplied entries. This was tested locally with a spoofed `X-Forwarded-For` chain; verify Render's live forwarding after deployment. Every 100 successful authentication requests, the API deletes at most 128 counters expired for over one day. No cleanup service is needed. Registration returns a generic 202 response for both accepted and duplicate details, while login retains a generic invalid-credentials response. The runtime database connection currently needs schema-owner privileges to run migrations and is not a least-privilege, RLS-constrained application role; the API's role and ownership checks remain the active boundary. Plan separate migration and runtime roles before handling real patient data. Keep the production database private and protect the hosting accounts with MFA.

## 6. Cost and availability decision

| Resource | Free option and limit | Durable option |
| --- | --- | --- |
| Vercel frontend | Hobby is free for personal, non-commercial use; usage and build limits apply. | Pro or other eligible plan requires approval. |
| Render Docker API | Free web service is available, but sleeps after 15 minutes idle and can take about a minute to wake; filesystem is ephemeral and free hours are limited. Free services do not provide shell access. | Paid always-on compute requires approval. |
| Render PostgreSQL | One free database per workspace, 1 GB, expires after 30 days, then a 14-day upgrade grace period before deletion; no managed backups or point-in-time recovery. | Paid database with managed backups and recovery requires approval. |

The all-free combination is suitable only for a temporary synthetic demo. It is **not durable public hosting**. For an ongoing public service, obtain explicit approval for a paid database and likely an always-on API. Render documents the [free limits](https://render.com/docs/free) and [paid database recovery](https://render.com/docs/postgresql-backups); verify the checkout price before any paid selection.

## 7. Post-approval smoke tests and rollback

After the security gate and hosting approval, deploy the database and API first, then build the frontend with the final API URL. Confirm HTTPS on both URLs; `/api/health` and `/api/health/database` return 200; a direct frontend route reload works; registration and login work for synthetic accounts; Admin review works after controlled bootstrap; booking, consultation, prescription, consent, and revocation work; and unauthorized cross-patient and revoked-doctor reads return 403. Check CORS from the exact frontend origin and confirm the database still contains only synthetic records. Review logs without printing secret values.

For an application-only failure, revert the frontend to a verified earlier Vercel deployment and roll back the Render web-service image, then repeat health and smoke checks. Database migrations are forward-only and **are not undone by a code rollback**. On a paid database, use a tested backup or point-in-time restore into a new instance if database recovery is required; switch the API only after verifying that instance. The free database has no provider backup or recovery, so do not rely on it for durable data. Do not restore or connect the local `sasthosetu` database.
