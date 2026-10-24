BEGIN;

CREATE TABLE private.account_credentials (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    password_hash text NOT NULL
);
ALTER TABLE private.account_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.account_credentials FROM PUBLIC;

INSERT INTO private.account_credentials (user_id, password_hash)
SELECT id, password_hash FROM public.users WHERE password_hash IS NOT NULL;
ALTER TABLE public.users DROP COLUMN password_hash;

COMMIT;
