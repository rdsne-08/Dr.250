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

   In PowerShell, from the repository root, with `DATABASE_URL` pointing to the intended database:

   ```powershell
   Set-Location .\apps\backend
   node .\scripts\verify-demo-doctor.js "doctor@example.com" "12345678" "operator@example.com"
   ```

   Replace the example values with the registered doctor's email, their exact stored 5–12 digit BMDC registration number, and an existing trusted internal operator email. The operator must have an `ADMIN` profile. The command requires that exact doctor to be `PENDING`; success prints `Verified doctor <id>; audit event recorded.` It creates no account and exposes no public verification route. Never use a made-up operator identity or approve a license without checking it. Registration syntax checks do not prove that a license is genuine; the operator must check the BMDC register and identity first.

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

### Incomplete registration recovery

Registration now validates the license before any account write and creates the user, credentials, profile, and doctor row in one transaction. For an older failed attempt, inspect the specific email before retrying; do not delete accounts or reset the database:

```sql
SELECT u.id, u.email, p.id AS profile_id, p.role, d.id AS doctor_id,
       d.verification_status, (c.user_id IS NOT NULL) AS has_local_credentials
FROM public.users AS u
LEFT JOIN public.profiles AS p ON p.user_id = u.id
LEFT JOIN public.doctors AS d ON d.profile_id = p.id
LEFT JOIN private.account_credentials AS c ON c.user_id = u.id
WHERE lower(btrim(u.email)) = lower(btrim('doctor@example.com'));
```

If a doctor profile and local credentials exist but the doctor row is missing, a database operator can attach one after checking the identity, specialization, and license. Run this only for the reviewed email; substitute the actual values and require exactly one returned row before committing:

```sql
BEGIN;
INSERT INTO public.doctors (profile_id, specialization, license_number)
SELECT p.id, 'CHECKED_SPECIALIZATION', '12345678'
FROM public.users AS u
JOIN public.profiles AS p ON p.user_id = u.id AND p.role = 'DOCTOR'
JOIN private.account_credentials AS c ON c.user_id = u.id
WHERE lower(btrim(u.email)) = lower(btrim('doctor@example.com'))
  AND NOT EXISTS (SELECT 1 FROM public.doctors AS d WHERE d.profile_id = p.id)
RETURNING id, verification_status;
-- COMMIT only if exactly one PENDING row returned; otherwise ROLLBACK.
```

If the profile or credentials are missing, or the role differs, investigate the existing account and legacy authentication before making any change. Keep the existing user ID and have the doctor log in after repair. Verification still requires the separate trusted-operator step above.

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
