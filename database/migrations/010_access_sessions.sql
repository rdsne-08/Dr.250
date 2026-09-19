BEGIN;

CREATE TABLE public.access_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    access_token text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    last_accessed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT access_sessions_token_is_digest CHECK (length(access_token) >= 32),
    CONSTRAINT access_sessions_expiry_after_creation CHECK (expires_at > created_at),
    CONSTRAINT access_sessions_revocation_after_creation CHECK (
        revoked_at IS NULL OR revoked_at >= created_at
    ),
    CONSTRAINT access_sessions_last_access_after_creation CHECK (
        last_accessed_at IS NULL OR last_accessed_at >= created_at
    )
);

COMMENT ON COLUMN public.access_sessions.access_token IS
    'Store only a one-way digest of the QR/PIN secret; never store the plaintext secret.';

CREATE INDEX access_sessions_active_lookup_idx
    ON public.access_sessions (patient_id, doctor_id, expires_at)
    WHERE revoked_at IS NULL;
CREATE INDEX access_sessions_doctor_expiry_idx
    ON public.access_sessions (doctor_id, expires_at DESC);

CREATE TRIGGER access_sessions_set_updated_at
BEFORE UPDATE ON public.access_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
