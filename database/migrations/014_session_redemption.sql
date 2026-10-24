BEGIN;

-- Preserve previously granted access. All new sessions require redemption.
ALTER TABLE public.access_sessions ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.access_sessions ADD COLUMN redeemed_at timestamptz;
ALTER TABLE public.access_sessions ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE public.access_sessions ADD CONSTRAINT access_sessions_status_check
    CHECK (status IN ('PENDING', 'ACTIVE'));
COMMENT ON COLUMN public.access_sessions.status IS
    'Legacy grants remain ACTIVE; new credentials are PENDING until single-use redemption.';

CREATE TABLE private.session_redemption_limits (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    window_start timestamptz NOT NULL,
    attempts bigint NOT NULL CHECK (attempts > 0)
);
ALTER TABLE private.session_redemption_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.session_redemption_limits FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.has_active_doctor_access(target_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.access_sessions AS session
        WHERE session.patient_id = target_patient_id
          AND session.doctor_id = private.current_doctor_id()
          AND private.current_doctor_is_verified()
          AND session.status = 'ACTIVE'
          AND session.revoked_at IS NULL AND session.expires_at > now()
    );
$$;

-- Session writes go through the authenticated backend, which owns issuance,
-- hashing, binding, expiry, redemption and revocation. Direct patient SQL must
-- not be able to self-activate or rebind an existing grant.
DROP POLICY IF EXISTS access_sessions_patient_insert ON public.access_sessions;
DROP POLICY IF EXISTS access_sessions_patient_update ON public.access_sessions;
DROP POLICY IF EXISTS access_sessions_patient_delete ON public.access_sessions;
DROP POLICY IF EXISTS access_sessions_doctor_select_active ON public.access_sessions;
CREATE POLICY access_sessions_doctor_select_active ON public.access_sessions
FOR SELECT USING (
    doctor_id = private.current_doctor_id() AND private.current_doctor_is_verified()
    AND status = 'ACTIVE' AND revoked_at IS NULL AND expires_at > now()
);

COMMIT;
