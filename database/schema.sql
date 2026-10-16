\set ON_ERROR_STOP on

-- Canonical schema entry point for psql. Numbered migrations remain the source
-- of truth so this file cannot silently drift from incremental deployments.
\ir migrations/001_extensions.sql
\ir migrations/002_users.sql
\ir migrations/003_profiles.sql
\ir migrations/004_patients.sql
\ir migrations/005_doctors.sql
\ir migrations/006_laboratories.sql
\ir migrations/007_medical_records.sql
\ir migrations/008_prescriptions.sql
\ir migrations/009_lab_reports.sql
\ir migrations/010_access_sessions.sql
\ir migrations/011_audit_logs.sql
