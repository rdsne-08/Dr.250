BEGIN;

ALTER TABLE public.appointments
  ADD COLUMN consultation_status text NOT NULL DEFAULT 'NONE',
  ADD COLUMN care_requested_at timestamptz,
  ADD COLUMN care_decided_at timestamptz,
  ADD COLUMN consultation_started_at timestamptz,
  ADD COLUMN consultation_completed_at timestamptz;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_consultation_status_check
  CHECK (consultation_status IN ('NONE','PENDING','DECLINED','ACTIVE','COMPLETED'));
ALTER TABLE public.appointments ADD CONSTRAINT appointments_consultation_booking_check
  CHECK (status <> 'CANCELLED' OR consultation_status NOT IN ('ACTIVE','COMPLETED'));
CREATE UNIQUE INDEX appointments_one_active_consultation_per_doctor
  ON public.appointments (doctor_id) WHERE consultation_status='ACTIVE';

ALTER TABLE public.access_sessions ADD COLUMN appointment_id uuid
  REFERENCES public.appointments(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX access_sessions_appointment_unique ON public.access_sessions (appointment_id)
  WHERE appointment_id IS NOT NULL;

ALTER TABLE public.prescriptions ADD COLUMN appointment_id uuid
  REFERENCES public.appointments(id) ON DELETE RESTRICT;
CREATE INDEX prescriptions_appointment_idx ON public.prescriptions (appointment_id)
  WHERE appointment_id IS NOT NULL;
CREATE UNIQUE INDEX prescriptions_visit_line_unique ON public.prescriptions
  (appointment_id, lower(btrim(medicine)), btrim(dosage), coalesce(btrim(duration),''), btrim(instructions))
  WHERE appointment_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.prevent_prescription_reassignment()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id
     OR NEW.appointment_id IS DISTINCT FROM OLD.appointment_id
     OR NEW.medicine IS DISTINCT FROM OLD.medicine
     OR NEW.dosage IS DISTINCT FROM OLD.dosage
     OR NEW.duration IS DISTINCT FROM OLD.duration
     OR NEW.instructions IS DISTINCT FROM OLD.instructions THEN
    RAISE EXCEPTION 'prescription history is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER prescriptions_prevent_reassignment ON public.prescriptions;
CREATE TRIGGER prescriptions_prevent_reassignment BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_prescription_reassignment();

COMMIT;
