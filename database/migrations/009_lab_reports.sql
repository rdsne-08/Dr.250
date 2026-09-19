BEGIN;

CREATE TABLE public.lab_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    laboratory_id uuid NOT NULL REFERENCES public.laboratories(id) ON DELETE RESTRICT,
    requested_by_doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
    test_name text NOT NULL,
    report_url text,
    status text NOT NULL DEFAULT 'REQUESTED',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lab_reports_test_name_not_blank CHECK (btrim(test_name) <> ''),
    CONSTRAINT lab_reports_report_url_not_blank CHECK (
        report_url IS NULL OR btrim(report_url) <> ''
    ),
    CONSTRAINT lab_reports_status_check CHECK (
        status IN ('REQUESTED', 'SAMPLE_COLLECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED')
    ),
    CONSTRAINT lab_reports_completed_has_url CHECK (
        status <> 'COMPLETED' OR report_url IS NOT NULL
    )
);

CREATE INDEX lab_reports_patient_created_idx
    ON public.lab_reports (patient_id, created_at DESC);
CREATE INDEX lab_reports_laboratory_status_idx
    ON public.lab_reports (laboratory_id, status);
CREATE INDEX lab_reports_requesting_doctor_idx
    ON public.lab_reports (requested_by_doctor_id)
    WHERE requested_by_doctor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_lab_report_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.laboratory_id IS DISTINCT FROM OLD.laboratory_id
       OR NEW.requested_by_doctor_id IS DISTINCT FROM OLD.requested_by_doctor_id THEN
        RAISE EXCEPTION 'lab report patient, laboratory, and requester cannot be reassigned';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER lab_reports_prevent_reassignment
BEFORE UPDATE OF patient_id, laboratory_id, requested_by_doctor_id ON public.lab_reports
FOR EACH ROW EXECUTE FUNCTION public.prevent_lab_report_reassignment();

CREATE TRIGGER lab_reports_set_updated_at
BEFORE UPDATE ON public.lab_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
