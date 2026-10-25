BEGIN;

CREATE TABLE public.medical_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_id uuid NOT NULL UNIQUE
        REFERENCES public.medical_records(id) ON DELETE CASCADE,
    embedding vector(1536) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- HNSW is immediately query-ready and does not require a training phase.
CREATE INDEX medical_embeddings_embedding_hnsw_idx
    ON public.medical_embeddings
    USING hnsw (embedding vector_cosine_ops);

CREATE TRIGGER medical_embeddings_set_updated_at
BEFORE UPDATE ON public.medical_embeddings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
