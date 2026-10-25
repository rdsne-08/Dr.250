# Dr.250

Dr.250 is a small Patient–Doctor application. Patients keep a personal medical history, choose verified doctors, grant or revoke time-limited access, and view prescriptions and access history. Verified doctors can read only the records of patients who granted them active access and can write prescriptions to those patients' profiles.

## Features and screenshots

- Patients add medical records, view prescriptions and access history, and grant or revoke verified doctors.
- Verified doctors see only patients with active grants and can create prescriptions for them.
- Local accounts use database-backed passwords. Existing Supabase authentication remains supported. Doctor verification and provider record access are audited.

The screenshots below show the running application with fictional accounts and medical details in a disposable database.

| Patient dashboard | Doctor dashboard |
| --- | --- |
| ![Patient dashboard with fictional history, prescription and doctor grant](docs/images/patient-dashboard.jpg) | ![Doctor dashboard with an authorized fictional patient](docs/images/doctor-dashboard.jpg) |

| Medical history | Doctor authorization | Prescriptions |
| --- | --- | --- |
| ![Fictional medical record](docs/images/medical-history.jpg) | ![Active doctor grant with revoke control](docs/images/doctor-access.jpg) | ![Fictional prescription in patient history](docs/images/prescriptions.jpg) |

## Run locally

Requirements: Node.js 20+, PostgreSQL 16, and npm. Copy `.env.example` to `.env`. For processes running directly on your computer, change `DATABASE_URL` to a reachable local PostgreSQL address such as `postgresql://USER:PASSWORD@localhost:5432/DB_NAME`, using your actual database values. The frontend uses `VITE_API_URL` (default `http://localhost:3000`). Supabase variables are optional for existing legacy authentication; new local accounts use the database-backed password flow. Keep `.env` private.

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

## Demonstration

1. Register a patient and a doctor with real test identities. Doctor registration starts at `PENDING` and does not grant record access.
2. An operator checks the doctor's identity and medical license outside the application. With database access and an existing internal `ADMIN` identity, run the local verification command from `apps/backend`:

   ```bash
   node scripts/verify-demo-doctor.js DOCTOR_EMAIL STORED_LICENSE_NUMBER OPERATOR_EMAIL
   ```

   Replace the placeholders with the registered doctor's email, exact stored license number, and the existing internal admin email. The command requires a matching pending doctor and records the approval and audit event in one transaction. It creates no account and exposes no public verification route. Never use a made-up operator identity or approve a license without checking it.

   A fresh database has no internal operator identity. The database owner can create one for an actual operator without giving it login credentials. In `psql`, substitute the real operator's email and name before running:

   ```sql
   WITH operator_user AS (
     INSERT INTO public.users (email) VALUES ('OPERATOR_EMAIL') RETURNING id
   )
   INSERT INTO public.profiles (user_id, full_name, role)
   SELECT id, 'OPERATOR_NAME', 'ADMIN' FROM operator_user;
   ```
3. Sign in as the patient. In **Doctor access**, choose the verified doctor and grant access. The grant expires after 30 days unless revoked earlier.
4. Sign in as the doctor. Select the authorized patient, review medical records, and save a prescription.
5. Sign in as the patient to view the prescription and access history. Revoke the doctor's connection, then confirm the doctor can no longer view records or save prescriptions for that patient.

## Checks

```bash
cd apps/backend && npm test
cd apps/frontend && npm test && npm run lint && npm run build
cd ../.. && docker compose config --quiet
```

The optional database-backed release test needs a disposable PostgreSQL database configured through `DR250_DISPOSABLE_URL`. Do not point it at production data.

The backend also includes `test/patient-doctor-workflow.test.js` and an account
integration test. Set `AUTH_INTEGRATION_URL` to a **migrated, disposable,
loopback** database named `dr250_release_*`, then run `npm test` from
`apps/backend`. These tests exercise HTTP registration and login, duplicate
email rejection, doctor verification, patient grant, record access,
prescription persistence and patient visibility, access history, and revocation.
They clean up their test accounts. Keep this URL separate from your normal
application database.

Release verification on 26 October 2026: the database-backed patient and doctor workflow, account integration tests, and historical migration test passed; frontend tests (12), lint, production build, backend syntax check, and Docker health checks passed. The historical migration fixture requires pgvector, so it was run in a separate disposable PostgreSQL container. The normal application database does not require pgvector.

## Presentation workflow

1. Show patient registration and medical history using fictional demonstration details.
2. Show a pending doctor, then have a trusted operator verify the checked license with the audited command below.
3. Grant that doctor access from the patient dashboard. Show the doctor's authorized patient list and record view.
4. Save a fictional prescription as the doctor, then show it in the patient's prescription history.
5. Revoke access as the patient and confirm the doctor can no longer read the record or create a prescription.

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
