BEGIN;

CREATE TABLE public.patients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    date_of_birth date,
    gender text,
    blood_group text,
    emergency_contact text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT patients_gender_check CHECK (
        gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')
    ),
    CONSTRAINT patients_blood_group_check CHECK (
        blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
    ),
    CONSTRAINT patients_date_of_birth_reasonable CHECK (
        date_of_birth IS NULL OR date_of_birth >= DATE '1900-01-01'
    ),
    CONSTRAINT patients_emergency_contact_not_blank CHECK (
        emergency_contact IS NULL OR btrim(emergency_contact) <> ''
    )
);

CREATE OR REPLACE FUNCTION public.validate_patient_date_of_birth()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth > CURRENT_DATE THEN
        RAISE EXCEPTION 'patient date_of_birth cannot be in the future';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER patients_validate_date_of_birth
BEFORE INSERT OR UPDATE OF date_of_birth ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.validate_patient_date_of_birth();

CREATE TRIGGER patients_enforce_profile_role
BEFORE INSERT OR UPDATE OF profile_id ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role('PATIENT');

CREATE TRIGGER patients_set_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
