# Dr.250

Dr.250 is a patient, doctor, and admin healthcare application. Its objective is to let patients keep their health history, book verified doctors, and control access to their records while giving doctors a traceable consultation and prescription workflow.

## Features and screenshots

- Patients add medical records and a self-reported health profile, book appointments, request care, and view prescriptions and access history.
- Verified doctors accept requested consultations, review authorized history, save visit prescriptions, and complete consultations. Patients can revoke access.
- Local accounts use database-backed passwords. Existing Supabase authentication remains supported. Doctor verification and provider record access are audited.
- Admins can review pending doctor applications at `/admin`, approve or reject them, and inspect reviewed decisions. Admin accounts cannot self-register.

The screenshots below show the running application with fictional accounts and medical details in a disposable database.

| Patient dashboard | Doctor dashboard |
| --- | --- |
| ![Patient dashboard with fictional history, prescription and doctor grant](docs/screenshots/patient-dashboard.jpg) | ![Doctor dashboard with an authorized fictional patient](docs/screenshots/doctor-dashboard.jpg) |

| Medical history | Doctor authorization | Prescriptions |
| --- | --- | --- |
| ![Fictional medical record](docs/screenshots/medical-history.jpg) | ![Active doctor grant with revoke control](docs/screenshots/doctor-access.png) | ![Fictional prescription in patient history](docs/screenshots/prescriptions.jpg) |

| Patient appointment history | Doctor's daily queue | Admin doctor review |
| --- | --- | --- |
| ![Confirmed and cancelled fictional appointments](docs/screenshots/patient-appointment.png) | ![Doctor queue after a completed fictional consultation](docs/screenshots/doctor-todays-queue.png) | ![Admin doctor verification screen](docs/screenshots/admin-verification.png) |

![Completed fictional visit with its prescription](docs/screenshots/patient-completed-visit.png)

## Run locally

Requirements: Node.js 24 for the frontend, Node.js 22 for the backend (or their Docker images), PostgreSQL 16, and npm. Copy `.env.example` to `.env`. For processes running directly on your computer, change `DATABASE_URL` to a reachable local PostgreSQL address such as `postgresql://USER:PASSWORD@localhost:5432/DB_NAME`, using your actual database values. The frontend uses `VITE_API_URL` (default `http://localhost:3000`). Supabase variables are optional for existing legacy authentication; new local accounts use the database-backed password flow. Keep `.env` private.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL`, `DATABASE_SSL` | Backend PostgreSQL connection and TLS setting |
| `PORT`, `CORS_ORIGIN` | Backend listener and allowed frontend origin |
| `VITE_API_URL` | Frontend build-time public backend URL; use a reachable HTTPS API in production |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Local Docker PostgreSQL settings |
| `BACKEND_PORT`, `FRONTEND_PORT` | Local Docker published ports |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Optional legacy Supabase authentication |
| `AUTH_INTEGRATION_URL`, `DR250_DISPOSABLE_URL` | Test-only, loopback `dr250_release_*` database URLs |

For production, provide a persistent PostgreSQL service and an HTTPS backend host separately from the static frontend. The backend Docker image runs forward-only migrations at startup. Configure database credentials and other secrets in the hosting environment, and set `CORS_ORIGIN` to the deployed frontend origin. A browser cannot call a local Docker address from a public Vercel site.

See [production deployment preparation](docs/deployment.md) for the existing Docker and Vite configuration and the required hosting inputs.

```bash
cd apps/backend
npm ci
npm run db:migrate
npm run dev
```

In a second terminal:

```bash
cd apps/frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Alternatively, from the repository root run `docker compose up --build` after configuring `.env`. Compose starts PostgreSQL and runs backend migrations. Existing database data and historical migrations are retained; do not recreate a populated database to upgrade it.

## Workflows

1. A patient registers, adds health information and records, books a verified doctor, and grants or revokes access.
2. A doctor registers as pending. An Admin checks the doctor's identity and license outside the app, then approves or rejects the application. A verified doctor can publish availability and consult only with an active patient grant.
3. An Admin reviews pending applications at `/admin`. Public registration cannot create an Admin. Production Admin creation uses the one-time private CLI described in [deployment.md](docs/deployment.md).
4. The patient requests care; the doctor accepts, reviews authorized history, writes a prescription, and completes the consultation. The patient can inspect the completed visit and access log.

The screenshots above use fictional demonstration data. Never connect a local or test database to a public deployment.
## Checks

Run backend syntax and isolated tests without a production database:

```bash
cd apps/backend
npm ci
npm run check
npm run test:isolated
```

For the complete database integration and migration suite, use a migrated, disposable PostgreSQL 16 database on loopback named `dr250_release_*`. Set both `AUTH_INTEGRATION_URL` and `DR250_DISPOSABLE_URL` to that database, then run `npm run test:isolated`. The historical restore fixture also requires `pgvector`; a fresh application database does not. Never use `sasthosetu` or production data.

Frontend checks from `apps/frontend` are `npm test`, `npm run lint`, and `npm run build`. Vercel builds with Node 24.

On 11 November 2026, Migration 023 applied and reran on disposable PostgreSQL 16. The full backend suite passed 79/79 with no skips, including rate limiting, Admin bootstrap, migration, authentication, authorization, consent, and prescription tests. Frontend tests passed 15/15, lint passed, and the Node 24 production build passed. Public smoke tests remain separate from local tests.
## Presentation workflow

1. Show patient registration and medical history using fictional demonstration details.
2. Show a pending doctor, then have a trusted operator verify the checked license with the audited command below.
3. Complete the doctor's professional profile and today's availability, then add the patient's self-reported health profile and country.
4. Book the doctor between 9:00 AM and noon in the doctor's chamber timezone. Request Care during the configured consultation hours.
5. Accept the request as the doctor, review the authorized history, save a fictional prescription, and complete the consultation.
6. Refresh or sign in again as the patient to view the completed visit and prescription. Confirm the doctor can no longer open that consultation or write another prescription.

## Project structure

- `apps/frontend/src/app`, `portals/patient`, and `portals/doctor`: the two role interfaces.
- `apps/frontend/src/services`: authenticated API calls.
- `apps/backend/src/modules`: authentication, patient and doctor APIs, records,
  prescriptions, access sessions, and auditing.
- `apps/backend/scripts/verify-demo-doctor.js`: local audited verification command.
- `database/migrations`: forward-only schema history. Earlier lab and access
  session columns remain for compatibility with existing data; the application
  does not expose laboratory or QR/PIN workflows.
- `database/retired-migrations`: preserved historical SQL that is excluded from
  fresh migrations. The old embedding migration stays archived so its history
  is available without activating the removed AI workflow.

## Technology and architecture

The frontend uses React, Vite, and Tailwind CSS. The Node.js and Express API uses PostgreSQL 16 with numbered SQL migrations. Docker Compose runs the local frontend, backend, and database. Existing pgvector data and its HNSW index remain in the historical database; the current patient and doctor workflow does not depend on AI features.

```mermaid
flowchart LR
  Browser[Patient, Doctor, Admin browser] --> UI[React frontend]
  UI --> API[Express API]
  API --> DB[(PostgreSQL)]
  API --> Auth[Local and legacy authentication]
  DB --> Audit[Audit records]
```

```mermaid
flowchart LR
  Register[Patient registers] --> Profile[Health profile and records]
  Profile --> Book[Book verified doctor]
  Book --> Grant[Grant record access]
  Grant --> Visit[Doctor consultation]
  Visit --> Rx[Prescription and visit history]
  Grant --> Revoke[Patient revokes access]
```

```mermaid
flowchart TD
  Request[Authenticated request] --> Role{Role}
  Role -->|Patient| Own[Own profile, records, bookings, grants]
  Role -->|Doctor| Verified{Verified and consent active?}
  Verified -->|Yes| Care[Authorized history and consultation]
  Verified -->|No| Deny[Access denied]
  Role -->|Admin| Review[Doctor application review and audit]
```

## Data and security

`database/migrations/` is the forward-only schema history. The migration ledger is `dr250_meta.schema_migrations`; Migration 022 adds doctor booking windows and accepts a patient-reported `Unknown` blood group. Migration 023 adds shared rate-limit counters and the one-time Admin bootstrap marker. Patient and doctor identities are stored in `users`, `profiles`, and role tables. Medical records, prescriptions, appointments, consultations, and access sessions have separate tables. See [database/README.md](database/README.md) for migration and disposable test database guidance.

Local passwords are stored as salted scrypt hashes in the private schema. Bearer session token hashes are stored in PostgreSQL; the browser uses session storage or optional local storage, not authentication cookies. Registration and login use shared PostgreSQL rate limits, and public registration cannot create an Admin. Protected API routes require authentication and enforce role, ownership, verified doctor status, and active patient consent. Patient revocation closes subsequent provider access. Doctor verification and provider record reads are audited. Production requires HTTPS, a persistent PostgreSQL service, private environment secrets, and an exact `CORS_ORIGIN` matching the frontend origin. Never expose database credentials or the service role key to Vite client variables.
