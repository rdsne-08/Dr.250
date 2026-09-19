BEGIN;

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    phone text,
    role text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT profiles_full_name_not_blank CHECK (btrim(full_name) <> ''),
    CONSTRAINT profiles_phone_format CHECK (
        phone IS NULL OR phone ~ '^\+?[0-9]{7,15}$'
    ),
    CONSTRAINT profiles_role_check CHECK (role IN ('PATIENT', 'DOCTOR', 'LAB', 'ADMIN'))
);

CREATE INDEX profiles_role_idx ON public.profiles (role);

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- A role change would invalidate the one-to-one subtype relationship. Migrations may
-- deliberately replace a profile, but normal updates cannot mutate its role in place.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'profile role cannot be changed in place';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_prevent_role_change
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

-- Reused by each profile subtype to prevent a PATIENT profile from becoming a
-- doctor/laboratory row (and vice versa).
CREATE OR REPLACE FUNCTION public.enforce_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    actual_role text;
BEGIN
    SELECT role INTO actual_role
    FROM public.profiles
    WHERE id = NEW.profile_id;

    IF actual_role IS DISTINCT FROM TG_ARGV[0] THEN
        RAISE EXCEPTION 'profile % must have role %, found %',
            NEW.profile_id, TG_ARGV[0], actual_role;
    END IF;

    RETURN NEW;
END;
$$;

COMMIT;
