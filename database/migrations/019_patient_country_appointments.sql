BEGIN;

ALTER TABLE public.patients ADD COLUMN country_code char(2);
ALTER TABLE public.patients ADD CONSTRAINT patients_country_code_format
  CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  queue_position integer NOT NULL CHECK (queue_position >= 1),
  status text NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CONSTRAINT appointments_cancelled_at_consistent CHECK (
    (status = 'CANCELLED') = (cancelled_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX appointments_position ON public.appointments
  (doctor_id, local_date, queue_position);
CREATE UNIQUE INDEX appointments_active_patient_day ON public.appointments
  (patient_id, local_date) WHERE status = 'BOOKED';
CREATE INDEX appointments_patient_recent ON public.appointments (patient_id, local_date DESC);
CREATE INDEX appointments_doctor_day ON public.appointments (doctor_id, local_date);

CREATE TRIGGER appointments_set_updated_at BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointments_select_patient ON public.appointments FOR SELECT
  USING (patient_id = private.current_patient_id());
CREATE POLICY appointments_select_doctor ON public.appointments FOR SELECT
  USING (doctor_id = private.current_doctor_id());
CREATE POLICY appointments_insert_patient ON public.appointments FOR INSERT
  WITH CHECK (patient_id = private.current_patient_id());
CREATE POLICY appointments_update_patient ON public.appointments FOR UPDATE
  USING (patient_id = private.current_patient_id())
  WITH CHECK (patient_id = private.current_patient_id());

COMMIT;
