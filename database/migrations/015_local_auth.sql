BEGIN;

ALTER TABLE public.users ADD COLUMN password_hash text;

CREATE TABLE private.auth_sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_sessions_user_id_idx ON private.auth_sessions (user_id);
CREATE INDEX auth_sessions_expires_at_idx ON private.auth_sessions (expires_at);
ALTER TABLE private.auth_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.auth_sessions FROM PUBLIC;

COMMIT;
