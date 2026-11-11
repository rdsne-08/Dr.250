BEGIN;

CREATE TABLE private.auth_rate_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  reset_at timestamptz NOT NULL
);
REVOKE ALL ON private.auth_rate_limits FROM PUBLIC;
CREATE INDEX auth_rate_limits_reset_idx ON private.auth_rate_limits (reset_at);

CREATE TABLE private.admin_bootstrap (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  secret_hash text NOT NULL,
  admin_user_id uuid NOT NULL REFERENCES public.users(id),
  used_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.admin_bootstrap FROM PUBLIC;

COMMIT;
