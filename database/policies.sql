\set ON_ERROR_STOP on

BEGIN;

-- These helpers read Supabase's JWT session settings directly. That keeps the
-- policies Supabase-compatible while still allowing local PostgreSQL testing by
-- setting request.jwt.claim.sub for a transaction.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO PUBLIC;

CREATE OR REPLACE FUNCTION private.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid,
        (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
    );
$$;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT p.role
    FROM public.profiles AS p
    WHERE p.user_id = private.current_user_id()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_patient_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT patient.id
    FROM public.patients AS patient
    JOIN public.profiles AS profile ON profile.id = patient.profile_id
    WHERE profile.user_id = private.current_user_id()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_doctor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT doctor.id
    FROM public.doctors AS doctor
    JOIN public.profiles AS profile ON profile.id = doctor.profile_id
    WHERE profile.user_id = private.current_user_id()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.current_laboratory_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT laboratory.id
    FROM public.laboratories AS laboratory
    JOIN public.profiles AS profile ON profile.id = laboratory.profile_id
    WHERE profile.user_id = private.current_user_id()
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT COALESCE(private.current_user_role() = 'ADMIN', false);
$$;

CREATE OR REPLACE FUNCTION private.current_doctor_is_verified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.doctors AS doctor
        WHERE doctor.id = private.current_doctor_id()
          AND doctor.verification_status = 'VERIFIED'
    );
$$;

CREATE OR REPLACE FUNCTION private.current_laboratory_is_verified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.laboratories AS laboratory
        WHERE laboratory.id = private.current_laboratory_id()
          AND laboratory.verification_status = 'VERIFIED'
    );
$$;

CREATE OR REPLACE FUNCTION private.has_active_doctor_access(target_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.access_sessions AS session
        WHERE session.patient_id = target_patient_id
          AND session.doctor_id = private.current_doctor_id()
          AND private.current_doctor_is_verified()
          AND session.revoked_at IS NULL
          AND session.expires_at > now()
    );
$$;

REVOKE ALL ON FUNCTION private.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_patient_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_doctor_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_laboratory_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_doctor_is_verified() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.current_laboratory_is_verified() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_active_doctor_access(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_patient_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_doctor_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_laboratory_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_doctor_is_verified() TO PUBLIC;
GRANT EXECUTE ON FUNCTION private.current_laboratory_is_verified() TO PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_active_doctor_access(uuid) TO PUBLIC;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Every application table receives the same relationally-derived administrator
-- override. Supabase's service role also bypasses RLS at the database role level.
DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'users', 'profiles', 'patients', 'doctors', 'laboratories',
        'medical_records', 'prescriptions', 'lab_reports', 'access_sessions',
        'audit_logs'
    ]
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS admin_full_access ON public.%I',
            table_name
        );
        EXECUTE format(
            'CREATE POLICY admin_full_access ON public.%I FOR ALL '
            'USING (private.is_admin()) WITH CHECK (private.is_admin())',
            table_name
        );
    END LOOP;
END;
$$;

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users
FOR SELECT USING (id = private.current_user_id());

DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self ON public.profiles
FOR SELECT USING (user_id = private.current_user_id());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE
USING (user_id = private.current_user_id())
WITH CHECK (user_id = private.current_user_id());

DROP POLICY IF EXISTS profiles_doctor_select_authorized_patient ON public.profiles;
CREATE POLICY profiles_doctor_select_authorized_patient ON public.profiles
FOR SELECT USING (
    EXISTS (
        SELECT 1
        FROM public.patients AS patient
        WHERE patient.profile_id = profiles.id
          AND private.has_active_doctor_access(patient.id)
    )
);

DROP POLICY IF EXISTS patients_select_self ON public.patients;
CREATE POLICY patients_select_self ON public.patients
FOR SELECT USING (id = private.current_patient_id());

DROP POLICY IF EXISTS patients_update_self ON public.patients;
CREATE POLICY patients_update_self ON public.patients
FOR UPDATE
USING (id = private.current_patient_id())
WITH CHECK (id = private.current_patient_id());

DROP POLICY IF EXISTS patients_doctor_select_authorized ON public.patients;
CREATE POLICY patients_doctor_select_authorized ON public.patients
FOR SELECT USING (private.has_active_doctor_access(id));

DROP POLICY IF EXISTS doctors_select_self ON public.doctors;
CREATE POLICY doctors_select_self ON public.doctors
FOR SELECT USING (id = private.current_doctor_id());

DROP POLICY IF EXISTS laboratories_select_self ON public.laboratories;
CREATE POLICY laboratories_select_self ON public.laboratories
FOR SELECT USING (id = private.current_laboratory_id());

DROP POLICY IF EXISTS medical_records_patient_select ON public.medical_records;
CREATE POLICY medical_records_patient_select ON public.medical_records
FOR SELECT USING (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS medical_records_patient_insert ON public.medical_records;
CREATE POLICY medical_records_patient_insert ON public.medical_records
FOR INSERT WITH CHECK (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS medical_records_patient_update ON public.medical_records;
CREATE POLICY medical_records_patient_update ON public.medical_records
FOR UPDATE
USING (patient_id = private.current_patient_id())
WITH CHECK (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS medical_records_patient_delete ON public.medical_records;
CREATE POLICY medical_records_patient_delete ON public.medical_records
FOR DELETE USING (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS medical_records_doctor_select_authorized ON public.medical_records;
CREATE POLICY medical_records_doctor_select_authorized ON public.medical_records
FOR SELECT USING (private.has_active_doctor_access(patient_id));

DROP POLICY IF EXISTS prescriptions_patient_select ON public.prescriptions;
CREATE POLICY prescriptions_patient_select ON public.prescriptions
FOR SELECT USING (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS prescriptions_doctor_select_authorized ON public.prescriptions;
CREATE POLICY prescriptions_doctor_select_authorized ON public.prescriptions
FOR SELECT USING (private.has_active_doctor_access(patient_id));

DROP POLICY IF EXISTS prescriptions_doctor_insert_authorized ON public.prescriptions;
CREATE POLICY prescriptions_doctor_insert_authorized ON public.prescriptions
FOR INSERT WITH CHECK (
    doctor_id = private.current_doctor_id()
    AND private.has_active_doctor_access(patient_id)
);

DROP POLICY IF EXISTS prescriptions_doctor_update_authorized ON public.prescriptions;
CREATE POLICY prescriptions_doctor_update_authorized ON public.prescriptions
FOR UPDATE
USING (
    doctor_id = private.current_doctor_id()
    AND private.has_active_doctor_access(patient_id)
)
WITH CHECK (
    doctor_id = private.current_doctor_id()
    AND private.has_active_doctor_access(patient_id)
);

DROP POLICY IF EXISTS lab_reports_patient_select ON public.lab_reports;
CREATE POLICY lab_reports_patient_select ON public.lab_reports
FOR SELECT USING (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS lab_reports_doctor_select_authorized ON public.lab_reports;
CREATE POLICY lab_reports_doctor_select_authorized ON public.lab_reports
FOR SELECT USING (private.has_active_doctor_access(patient_id));

DROP POLICY IF EXISTS lab_reports_doctor_insert_authorized ON public.lab_reports;
CREATE POLICY lab_reports_doctor_insert_authorized ON public.lab_reports
FOR INSERT WITH CHECK (
    requested_by_doctor_id = private.current_doctor_id()
    AND private.has_active_doctor_access(patient_id)
);

DROP POLICY IF EXISTS lab_reports_laboratory_select_assigned ON public.lab_reports;
CREATE POLICY lab_reports_laboratory_select_assigned ON public.lab_reports
FOR SELECT USING (
    laboratory_id = private.current_laboratory_id()
    AND private.current_laboratory_is_verified()
);

DROP POLICY IF EXISTS lab_reports_laboratory_update_assigned ON public.lab_reports;
CREATE POLICY lab_reports_laboratory_update_assigned ON public.lab_reports
FOR UPDATE
USING (
    laboratory_id = private.current_laboratory_id()
    AND private.current_laboratory_is_verified()
)
WITH CHECK (
    laboratory_id = private.current_laboratory_id()
    AND private.current_laboratory_is_verified()
);

DROP POLICY IF EXISTS access_sessions_patient_select ON public.access_sessions;
CREATE POLICY access_sessions_patient_select ON public.access_sessions
FOR SELECT USING (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS access_sessions_patient_insert ON public.access_sessions;
CREATE POLICY access_sessions_patient_insert ON public.access_sessions
FOR INSERT WITH CHECK (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS access_sessions_patient_update ON public.access_sessions;
CREATE POLICY access_sessions_patient_update ON public.access_sessions
FOR UPDATE
USING (patient_id = private.current_patient_id())
WITH CHECK (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS access_sessions_patient_delete ON public.access_sessions;
CREATE POLICY access_sessions_patient_delete ON public.access_sessions
FOR DELETE USING (patient_id = private.current_patient_id());

DROP POLICY IF EXISTS access_sessions_doctor_select_active ON public.access_sessions;
CREATE POLICY access_sessions_doctor_select_active ON public.access_sessions
FOR SELECT USING (
    doctor_id = private.current_doctor_id()
    AND private.current_doctor_is_verified()
    AND revoked_at IS NULL
    AND expires_at > now()
);

DROP POLICY IF EXISTS audit_logs_select_self ON public.audit_logs;
CREATE POLICY audit_logs_select_self ON public.audit_logs
FOR SELECT USING (user_id = private.current_user_id());

COMMIT;
