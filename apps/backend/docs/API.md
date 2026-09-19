# Dr.250 Backend API

The API is served under `/api`. Except for health, registration, and login, requests require a Supabase access token:

```http
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

Responses never include database diagnostics or Supabase service credentials. Validation and authorization failures use an `error` message and may include a stable `code`.

```json
{
  "error": "An active patient access session is required.",
  "code": "PATIENT_ACCESS_DENIED"
}
```

## Health

### `GET /api/health`

- Authentication: No
- Purpose: Tests the application and PostgreSQL connection.

```json
{
  "status": "OK",
  "service": "Dr.250 backend",
  "database": "connected"
}
```

Returns `503` with `status: "DEGRADED"` when PostgreSQL is unavailable.

## Authentication

### `POST /api/auth/register`

- Authentication: No
- Roles: `PATIENT`, `DOCTOR`, `LAB`, `ADMIN`

```json
{
  "email": "patient@example.com",
  "password": "a-secure-password",
  "full_name": "Example Patient",
  "role": "PATIENT"
}
```

Success: `201 Created`

```json
{
  "user": {
    "profile_id": "uuid",
    "user_id": "uuid",
    "email": "patient@example.com",
    "full_name": "Example Patient",
    "role": "PATIENT"
  }
}
```

### `POST /api/auth/login`

- Authentication: No

```json
{
  "email": "patient@example.com",
  "password": "a-secure-password"
}
```

Success: `200 OK`. The response is marked `Cache-Control: no-store`.

```json
{
  "access_token": "supabase-jwt",
  "refresh_token": "supabase-refresh-token",
  "expires_in": 3600,
  "token_type": "bearer",
  "user": { "user_id": "uuid", "full_name": "Example Patient", "role": "PATIENT" },
  "role": "PATIENT"
}
```

### `POST /api/auth/logout`

- Authentication: Required
- Success: `204 No Content`

### `GET /api/auth/me`

- Authentication: Required

```json
{
  "user": { "id": "uuid", "email": "patient@example.com" },
  "profile": { "profile_id": "uuid", "full_name": "Example Patient", "role": "PATIENT" },
  "role": "PATIENT"
}
```

## Patients

Every patient endpoint requires a `PATIENT` token and resolves data from the authenticated user's profile; a patient ID cannot be supplied to bypass ownership checks.

| Method | Endpoint | Response |
| --- | --- | --- |
| `GET` | `/api/patients/profile` | `{ "patient": { ... } }` |
| `GET` | `/api/patients/records` | `{ "records": [ ... ] }` |
| `GET` | `/api/patients/prescriptions` | `{ "prescriptions": [ ... ] }` |
| `GET` | `/api/patients/reports` | `{ "reports": [ ... ] }` |

## Doctors

Every doctor endpoint requires a `DOCTOR` token and a `VERIFIED` doctor profile. Patient lists and writes require a non-revoked `access_sessions` row whose expiry is in the future.

| Method | Endpoint | Response |
| --- | --- | --- |
| `GET` | `/api/doctors/profile` | `{ "doctor": { ... } }` |
| `GET` | `/api/doctors/patients` | `{ "patients": [ ... ] }` |
| `GET` | `/api/doctors/sessions` | `{ "sessions": [ ... ] }` |

### `POST /api/doctors/prescriptions`

- Authentication: Verified `DOCTOR`
- Authorization: Active access session for `patient_id`

```json
{
  "patient_id": "patient-uuid",
  "medicine": "Paracetamol",
  "dosage": "500 mg",
  "duration": "3 days",
  "instructions": "Take after food when needed."
}
```

Success: `201 Created`

```json
{
  "prescription": {
    "id": "uuid",
    "patient_id": "patient-uuid",
    "doctor_id": "doctor-uuid",
    "medicine": "Paracetamol",
    "dosage": "500 mg",
    "duration": "3 days",
    "instructions": "Take after food when needed."
  }
}
```

## Laboratories

Every laboratory endpoint requires a `LAB` token and a `VERIFIED` laboratory profile.

| Method | Endpoint | Response |
| --- | --- | --- |
| `GET` | `/api/labs/profile` | `{ "laboratory": { ... } }` |
| `GET` | `/api/labs/reports` | Assigned reports only |

### `POST /api/labs/reports`

Uploads or advances an already assigned report. The laboratory cannot change its patient, requesting doctor, assigned laboratory, or test name.

```json
{
  "report_id": "report-uuid",
  "test_name": "Complete Blood Count",
  "result": "Values within reference ranges.",
  "file_url": "https://files.example.com/reports/cbc.pdf",
  "status": "COMPLETED"
}
```

`file_url` is required for `COMPLETED`. The existing schema stores the URL and status in `lab_reports`; textual `result` content is preserved as a `LAB_REPORT` medical record.

Success: `201 Created`

## Medical records

### `GET /api/medical-records/:patientId`

- Authentication: Required
- Roles: Patient owner, verified doctor with active access, or admin

```json
{
  "records": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "diagnosis": "Seasonal viral infection",
      "notes": "Hydration and rest advised.",
      "attachments": ["https://files.example.com/record.pdf"],
      "type": "DIAGNOSIS",
      "date": "2026-09-19T10:00:00.000Z"
    }
  ]
}
```

### `POST /api/medical-records`

- Authentication: Required
- Roles: Patient owner or verified doctor with active access

```json
{
  "patient_id": "patient-uuid",
  "diagnosis": "Seasonal viral infection",
  "notes": "Hydration and rest advised.",
  "attachments": ["https://files.example.com/record.pdf"],
  "date": "2026-09-19T10:00:00Z"
}
```

The current database schema has one `document_url`, so this API accepts at most one attachment. Success: `201 Created`.

## Prescriptions

### `GET /api/prescriptions/:patientId`

- Authentication: Required
- Roles: Patient owner, verified doctor with active access, or admin
- Response: `{ "prescriptions": [ ... ] }`

### `POST /api/prescriptions`

- Authentication: Verified `DOCTOR`
- Authorization: Active access session for `patient_id`
- Request and response: Same format as `POST /api/doctors/prescriptions`
- Success: `201 Created`

## Reports

### `GET /api/reports/:patientId`

- Authentication: Required
- Patient: Own reports only
- Doctor: Active patient access required
- Lab: Only reports assigned to the authenticated laboratory
- Admin: Allowed by platform administrator policy
- Response: `{ "reports": [ ... ] }`

### `POST /api/reports`

For a doctor, creates a request assigned to a verified laboratory:

```json
{
  "patient_id": "patient-uuid",
  "laboratory_id": "laboratory-uuid",
  "test_name": "Complete Blood Count",
  "status": "REQUESTED"
}
```

For a laboratory, uses the same request body and behavior as `POST /api/labs/reports`. Success: `201 Created`.

## Administration

All endpoints require an `ADMIN` token.

| Method | Endpoint | Response |
| --- | --- | --- |
| `GET` | `/api/admin/users` | `{ "users": [ ... ] }` |
| `GET` | `/api/admin/doctors` | `{ "doctors": [ ... ] }` |
| `GET` | `/api/admin/labs` | `{ "laboratories": [ ... ] }` |

### `PATCH /api/admin/verify/:id`

```json
{
  "entity_type": "DOCTOR",
  "status": "VERIFIED"
}
```

`entity_type` is `DOCTOR` or `LAB`. `status` is `VERIFIED`, `REJECTED`, or `SUSPENDED`. The change is recorded in `audit_logs` in the same transaction.

```json
{
  "verification": {
    "id": "uuid",
    "entity_type": "DOCTOR",
    "verification_status": "VERIFIED",
    "updated_at": "2026-09-19T10:00:00.000Z"
  }
}
```

## Access sessions

These supporting endpoints expose the existing temporary doctor-access model.

### `GET /api/sessions`

- Authentication: `PATIENT` or verified `DOCTOR`
- Patient response: Sessions granted by that patient
- Doctor response: Sessions assigned to that doctor

### `POST /api/sessions`

- Authentication: `PATIENT`

```json
{
  "doctor_id": "doctor-uuid",
  "expires_at": "2026-09-20T10:00:00Z"
}
```

Success: `201 Created`. The plaintext access token is returned only once. Only its SHA-256 digest is stored.

### `PATCH /api/sessions/:sessionId/revoke`

- Authentication: Patient owner
- Success: `200 OK`

## Status codes

| Code | Meaning |
| --- | --- |
| `200` | Successful read or update |
| `201` | Resource created or report submitted |
| `204` | Logout completed |
| `400` | Invalid request data |
| `401` | Missing, invalid, or expired bearer token |
| `403` | Role, verification, ownership, or access-session denial |
| `404` | Resource not found within the authorized scope |
| `409` | Conflicting account or data state |
| `429` | Authentication rate limit |
| `500` | Sanitized internal failure |
| `503` | Authentication service or database unavailable |
