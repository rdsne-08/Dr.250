\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    application_table_count integer;
    foreign_key_count integer;
    indexed_table_count integer;
    rls_table_count integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RAISE EXCEPTION 'pgcrypto extension is missing';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'vector extension is missing';
    END IF;

    SELECT count(*) INTO application_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
          'users', 'profiles', 'patients', 'doctors', 'laboratories',
          'medical_records', 'prescriptions', 'lab_reports', 'access_sessions',
          'audit_logs', 'medical_embeddings'
      );

    IF application_table_count <> 11 THEN
        RAISE EXCEPTION 'expected 11 application tables, found %', application_table_count;
    END IF;

    SELECT count(*) INTO foreign_key_count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';

    IF foreign_key_count < 13 THEN
        RAISE EXCEPTION 'expected at least 13 foreign keys, found %', foreign_key_count;
    END IF;

    SELECT count(DISTINCT tablename) INTO indexed_table_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (
          'users', 'profiles', 'patients', 'doctors', 'laboratories',
          'medical_records', 'prescriptions', 'lab_reports', 'access_sessions',
          'audit_logs', 'medical_embeddings'
      );

    IF indexed_table_count <> 11 THEN
        RAISE EXCEPTION 'one or more application tables have no index';
    END IF;

    SELECT count(*) INTO rls_table_count
    FROM pg_class AS relation
    INNER JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relrowsecurity
      AND relation.relname IN (
          'users', 'profiles', 'patients', 'doctors', 'laboratories',
          'medical_records', 'prescriptions', 'lab_reports', 'access_sessions',
          'audit_logs', 'medical_embeddings'
      );

    IF rls_table_count <> 11 THEN
        RAISE EXCEPTION 'expected RLS on 11 tables, found %', rls_table_count;
    END IF;

    IF (SELECT count(*) FROM public.profiles WHERE role IN ('PATIENT', 'DOCTOR', 'LAB', 'ADMIN')) <> 4 THEN
        RAISE EXCEPTION 'development seed must contain exactly four demo roles';
    END IF;
END;
$$;

-- Check constraints reject invalid data without retaining test rows.
DO $$
BEGIN
    BEGIN
        INSERT INTO public.users (email) VALUES ('invalid-email');
        RAISE EXCEPTION 'invalid email was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    BEGIN
        INSERT INTO public.profiles (user_id, full_name, role)
        VALUES (gen_random_uuid(), 'Missing User', 'PATIENT');
        RAISE EXCEPTION 'missing user foreign key was accepted';
    EXCEPTION WHEN foreign_key_violation THEN
        NULL;
    END;

    BEGIN
        INSERT INTO public.lab_reports (
            patient_id, laboratory_id, test_name, status
        ) VALUES (
            '20000000-0000-4000-8000-000000000001',
            '40000000-0000-4000-8000-000000000001',
            'Invalid completed report',
            'COMPLETED'
        );
        RAISE EXCEPTION 'completed report without URL was accepted';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;
END;
$$;

ROLLBACK;

\echo 'Database schema, extensions, relationships, indexes, constraints, RLS, and seed verified.'
