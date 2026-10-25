# Dr.250 API

The API lives under `/api`. Responses normally use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "...", "error": "CODE" }`. Logout returns `204` with no body.

Register and log in with a patient or doctor account. Send the returned access token on protected requests:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Local accounts use database-backed passwords. Existing Supabase accounts can continue to authenticate. All protected routes load the account's application profile. Patient ownership, active patient grants, and doctor verification are enforced by the backend.

## Public routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | HTTP readiness |
| `GET` | `/api/health/database` | Database connectivity |
| `POST` | `/api/auth/register` | Register a patient or pending doctor |
| `POST` | `/api/auth/login` | Sign in |

## Authenticated routes

| Method | Route | Access |
| --- | --- | --- |
| `GET` | `/api/auth/me` | Current account |
| `POST` | `/api/auth/logout` | Current account |
| `GET` | `/api/patients/profile` | Patient |
| `GET` | `/api/patients/records` | Patient's own records |
| `GET` | `/api/patients/prescriptions` | Patient's own prescriptions |
| `GET` | `/api/patients/access-logs` | Patient's access history |
| `GET` | `/api/doctors/profile` | Doctor, including pending status |
| `GET` | `/api/doctors/patients` | Verified doctor with active grants |
| `GET` | `/api/doctors/sessions` | Verified doctor's active grants |
| `POST` | `/api/doctors/prescriptions` | Verified doctor with active patient grant |
| `GET` | `/api/medical-records/:patientId` | Patient owner or verified doctor with active grant |
| `POST` | `/api/medical-records` | Patient owner or verified doctor with active grant |
| `GET` | `/api/prescriptions/:patientId` | Patient owner or verified doctor with active grant |
| `POST` | `/api/prescriptions` | Verified doctor with active patient grant |
| `GET` | `/api/sessions` | Patient's grants or verified doctor's grants |
| `GET` | `/api/sessions/doctors` | Patient's verified doctor choices |
| `POST` | `/api/sessions` | Patient grants a verified doctor |
| `PATCH` | `/api/sessions/:sessionId/revoke` | Patient revokes own grant |

Doctor registration starts as `PENDING`. Verification is performed by the audited local operator command documented in the [root README](../../../README.md); there is no public verification endpoint. A revoked or expired grant stops further doctor record reads and prescription writes.

Use the frontend for the full demonstration and its request shapes. The backend tests cover ownership, verification, grant and revocation behavior, audit events, and prescription persistence. For disposable database integration testing, follow the root README.
