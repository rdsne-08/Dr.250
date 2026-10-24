BEGIN;

-- Protect legacy mixed-case or padded addresses as one identity. PostgreSQL's
-- unique index arbitrates concurrent inserts without modifying existing users.
CREATE UNIQUE INDEX users_email_canonical_uidx
ON public.users (lower(btrim(email)));

COMMIT;
