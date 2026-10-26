BEGIN;

ALTER TABLE public.doctors
  ADD COLUMN qualifications text,
  ADD COLUMN years_experience integer,
  ADD COLUMN biography text,
  ADD COLUMN chamber_name text,
  ADD COLUMN chamber_address text,
  ADD COLUMN city text,
  ADD COLUMN practice_country char(2),
  ADD COLUMN practice_timezone text,
  ADD COLUMN consultation_start time,
  ADD COLUMN consultation_end time,
  ADD COLUMN consultation_fee numeric(12,2),
  ADD COLUMN consultation_currency char(3);

ALTER TABLE public.doctors
  ADD CONSTRAINT doctors_years_experience_nonnegative CHECK (years_experience IS NULL OR years_experience >= 0),
  ADD CONSTRAINT doctors_consultation_fee_nonnegative CHECK (consultation_fee IS NULL OR consultation_fee >= 0),
  ADD CONSTRAINT doctors_consultation_hours_valid CHECK (
    consultation_start IS NULL OR consultation_end IS NULL OR consultation_start < consultation_end
  ),
  ADD CONSTRAINT doctors_country_format CHECK (practice_country IS NULL OR practice_country ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT doctors_currency_format CHECK (consultation_currency IS NULL OR consultation_currency ~ '^[A-Z]{3}$');

CREATE TABLE public.doctor_daily_availability (
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  practice_timezone text NOT NULL,
  available boolean NOT NULL,
  max_patients integer,
  consultation_start time,
  consultation_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (doctor_id, local_date),
  CONSTRAINT doctor_daily_capacity_valid CHECK (max_patients IS NULL OR max_patients BETWEEN 1 AND 100),
  CONSTRAINT doctor_daily_hours_valid CHECK (
    consultation_start IS NULL OR consultation_end IS NULL OR consultation_start < consultation_end
  ),
  CONSTRAINT doctor_daily_available_complete CHECK (
    NOT available OR (max_patients IS NOT NULL AND consultation_start IS NOT NULL AND consultation_end IS NOT NULL)
  )
);

CREATE TRIGGER doctor_daily_availability_set_updated_at
BEFORE UPDATE ON public.doctor_daily_availability
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.doctor_daily_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY doctor_daily_availability_select_self ON public.doctor_daily_availability
FOR SELECT USING (doctor_id = private.current_doctor_id());

CREATE POLICY doctor_daily_availability_insert_self ON public.doctor_daily_availability
FOR INSERT WITH CHECK (doctor_id = private.current_doctor_id());

CREATE POLICY doctor_daily_availability_update_self ON public.doctor_daily_availability
FOR UPDATE USING (doctor_id = private.current_doctor_id())
WITH CHECK (doctor_id = private.current_doctor_id());

COMMIT;
