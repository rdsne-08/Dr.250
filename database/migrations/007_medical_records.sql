BEGIN;

CREATE TABLE public.medical_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text,
    document_url text,
    record_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT medical_records_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT medical_records_description_not_blank CHECK (
        description IS NULL OR btrim(description) <> ''
    ),
    CONSTRAINT medical_records_document_url_not_blank CHECK (
        document_url IS NULL OR btrim(document_url) <> ''
    ),
    CONSTRAINT medical_records_record_type_check CHECK (
        record_type IN (
            'CONSULTATION', 'DIAGNOSIS', 'PRESCRIPTION', 'LAB_REPORT',
            'IMAGING', 'VACCINATION', 'OTHER'
        )
    )
);

CREATE INDEX medical_records_patient_created_idx
    ON public.medical_records (patient_id, created_at DESC);
CREATE INDEX medical_records_type_idx ON public.medical_records (record_type);

CREATE TRIGGER medical_records_set_updated_at
BEFORE UPDATE ON public.medical_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
