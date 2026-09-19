BEGIN;

CREATE TABLE public.laboratories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    lab_name text NOT NULL,
    license_number text NOT NULL UNIQUE,
    verification_status text NOT NULL DEFAULT 'PENDING',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT laboratories_lab_name_not_blank CHECK (btrim(lab_name) <> ''),
    CONSTRAINT laboratories_license_number_not_blank CHECK (btrim(license_number) <> ''),
    CONSTRAINT laboratories_verification_status_check CHECK (
        verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')
    )
);

CREATE INDEX laboratories_verification_status_idx
    ON public.laboratories (verification_status);

CREATE TRIGGER laboratories_enforce_profile_role
BEFORE INSERT OR UPDATE OF profile_id ON public.laboratories
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role('LAB');

CREATE TRIGGER laboratories_set_updated_at
BEFORE UPDATE ON public.laboratories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
