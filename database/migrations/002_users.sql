BEGIN;

CREATE TABLE public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_not_blank CHECK (btrim(email) <> ''),
    CONSTRAINT users_email_has_at_sign CHECK (position('@' IN email) > 1)
);

-- Email identity is case-insensitive without requiring another extension.
CREATE UNIQUE INDEX users_email_lower_uidx ON public.users (lower(email));

COMMENT ON TABLE public.users IS
    'Application identity mirror. In Supabase, id must equal auth.users.id.';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
