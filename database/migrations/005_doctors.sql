BEGIN;

CREATE TABLE public.doctors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    specialization text NOT NULL,
    license_number text NOT NULL UNIQUE,
    verification_status text NOT NULL DEFAULT 'PENDING',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT doctors_specialization_not_blank CHECK (btrim(specialization) <> ''),
    CONSTRAINT doctors_license_number_not_blank CHECK (btrim(license_number) <> ''),
    CONSTRAINT doctors_verification_status_check CHECK (
        verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')
    )
);

CREATE INDEX doctors_verification_status_idx
    ON public.doctors (verification_status);

CREATE TRIGGER doctors_enforce_profile_role
BEFORE INSERT OR UPDATE OF profile_id ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role('DOCTOR');

CREATE TRIGGER doctors_set_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
