\set ON_ERROR_STOP on

BEGIN;

CREATE ROLE dr250_rls_test NOLOGIN;
GRANT USAGE ON SCHEMA public, private TO dr250_rls_test;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dr250_rls_test;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO dr250_rls_test;

-- Add unrelated patient/laboratory data inside this transaction so isolation
-- policies can be tested without changing the development seed.
INSERT INTO public.users (id, email) VALUES
    ('00000000-0000-4000-8000-000000000011', 'unrelated.patient@example.com'),
    ('00000000-0000-4000-8000-000000000012', 'unrelated.lab@example.com');

INSERT INTO public.profiles (id, user_id, full_name, role) VALUES
    (
        '10000000-0000-4000-8000-000000000011',
        '00000000-0000-4000-8000-000000000011',
        'Unrelated Patient', 'PATIENT'
    ),
    (
        '10000000-0000-4000-8000-000000000012',
        '00000000-0000-4000-8000-000000000012',
        'Unrelated Laboratory', 'LAB'
    );

INSERT INTO public.patients (id, profile_id) VALUES (
    '20000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000011'
);

INSERT INTO public.laboratories (
    id, profile_id, lab_name, license_number, verification_status
) VALUES (
    '40000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000012',
    'Unrelated Lab', 'DGHS-RLS-002', 'VERIFIED'
);

INSERT INTO public.medical_records (
    id, patient_id, title, record_type
) VALUES (
    '50000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000011',
    'Unrelated private record', 'OTHER'
);

INSERT INTO public.lab_reports (
    id, patient_id, laboratory_id, test_name, status
) VALUES (
    '70000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000011',
    '40000000-0000-4000-8000-000000000012',
    'Unrelated test', 'REQUESTED'
);

SET ROLE dr250_rls_test;

SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000001',
    true
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.medical_records
        WHERE patient_id <> '20000000-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'patient can access another patient record';
    END IF;
END;
$$;

SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000002',
    true
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.medical_records
        WHERE patient_id = '20000000-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'doctor cannot access the authorized patient';
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.medical_records
        WHERE patient_id = '20000000-0000-4000-8000-000000000011'
    ) THEN
        RAISE EXCEPTION 'doctor can access an unauthorized patient';
    END IF;
END;
$$;

SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000003',
    true
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.lab_reports
        WHERE laboratory_id <> '40000000-0000-4000-8000-000000000001'
    ) THEN
        RAISE EXCEPTION 'laboratory can access an unrelated report';
    END IF;
END;
$$;

SELECT set_config(
    'request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000004',
    true
);

DO $$
BEGIN
    IF (SELECT count(*) FROM public.medical_records) < 2 THEN
        RAISE EXCEPTION 'administrator cannot access all medical records';
    END IF;

    UPDATE public.doctors
    SET verification_status = 'SUSPENDED'
    WHERE id = '30000000-0000-4000-8000-000000000001';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'administrator cannot manage verification status';
    END IF;
END;
$$;

RESET ROLE;
ROLLBACK;

\echo 'Patient, doctor, laboratory, and administrator RLS policies verified.'
