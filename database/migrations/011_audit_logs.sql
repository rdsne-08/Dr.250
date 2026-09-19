BEGIN;

CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address inet,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_action_not_blank CHECK (btrim(action) <> ''),
    CONSTRAINT audit_logs_entity_type_not_blank CHECK (
        entity_type IS NULL OR btrim(entity_type) <> ''
    ),
    CONSTRAINT audit_logs_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX audit_logs_user_created_idx
    ON public.audit_logs (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;
CREATE INDEX audit_logs_entity_idx
    ON public.audit_logs (entity_type, entity_id, created_at DESC)
    WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;
CREATE INDEX audit_logs_created_idx ON public.audit_logs (created_at DESC);

COMMIT;
