BEGIN;

CREATE TABLE public.prescriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
    doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
    medicine text NOT NULL,
    dosage text NOT NULL,
    duration text,
    instructions text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT prescriptions_medicine_not_blank CHECK (btrim(medicine) <> ''),
    CONSTRAINT prescriptions_dosage_not_blank CHECK (btrim(dosage) <> ''),
    CONSTRAINT prescriptions_duration_not_blank CHECK (
        duration IS NULL OR btrim(duration) <> ''
    ),
    CONSTRAINT prescriptions_instructions_not_blank CHECK (btrim(instructions) <> '')
);

CREATE INDEX prescriptions_patient_created_idx
    ON public.prescriptions (patient_id, created_at DESC);
CREATE INDEX prescriptions_doctor_created_idx
    ON public.prescriptions (doctor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_prescription_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id THEN
        RAISE EXCEPTION 'prescription patient and doctor cannot be reassigned';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER prescriptions_prevent_reassignment
BEFORE UPDATE OF patient_id, doctor_id ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.prevent_prescription_reassignment();

CREATE TRIGGER prescriptions_set_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
