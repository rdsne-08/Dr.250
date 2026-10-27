BEGIN;

CREATE TABLE public.patient_health_profiles (
  patient_id uuid PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  conditions text NOT NULL DEFAULT '',
  allergies text NOT NULL DEFAULT '',
  current_medications text NOT NULL DEFAULT '',
  medical_history text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT health_profile_lengths CHECK (
    length(conditions) <= 3000 AND length(allergies) <= 3000
    AND length(current_medications) <= 3000 AND length(medical_history) <= 5000
    AND length(notes) <= 5000)
);
CREATE TRIGGER patient_health_profiles_set_updated_at
  BEFORE UPDATE ON public.patient_health_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.patient_health_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  measured_on date NOT NULL,
  systolic_mmhg smallint,
  diastolic_mmhg smallint,
  pulse_bpm smallint,
  weight_kg numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT health_measurement_values CHECK (
    (systolic_mmhg IS NULL AND diastolic_mmhg IS NULL)
    OR (systolic_mmhg BETWEEN 40 AND 300 AND diastolic_mmhg BETWEEN 20 AND 200
      AND systolic_mmhg > diastolic_mmhg)),
  CONSTRAINT health_measurement_pulse CHECK (pulse_bpm IS NULL OR pulse_bpm BETWEEN 20 AND 250),
  CONSTRAINT health_measurement_weight CHECK (weight_kg IS NULL OR weight_kg BETWEEN 1 AND 500),
  CONSTRAINT health_measurement_present CHECK (
    systolic_mmhg IS NOT NULL OR pulse_bpm IS NOT NULL OR weight_kg IS NOT NULL)
);
CREATE INDEX patient_health_measurements_patient_date_idx
  ON public.patient_health_measurements(patient_id, measured_on DESC);
CREATE TRIGGER patient_health_measurements_set_updated_at
  BEFORE UPDATE ON public.patient_health_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.patient_health_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_health_profiles_owner ON public.patient_health_profiles FOR ALL
  USING (patient_id = private.current_patient_id())
  WITH CHECK (patient_id = private.current_patient_id());
CREATE POLICY patient_health_profiles_doctor_read ON public.patient_health_profiles FOR SELECT
  USING (private.has_active_doctor_access(patient_id));
CREATE POLICY admin_full_access ON public.patient_health_profiles FOR ALL
  USING (private.is_admin()) WITH CHECK (private.is_admin());
ALTER TABLE public.patient_health_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY patient_health_measurements_owner ON public.patient_health_measurements FOR ALL
  USING (patient_id = private.current_patient_id())
  WITH CHECK (patient_id = private.current_patient_id());
CREATE POLICY patient_health_measurements_doctor_read ON public.patient_health_measurements FOR SELECT
  USING (private.has_active_doctor_access(patient_id));
CREATE POLICY admin_full_access ON public.patient_health_measurements FOR ALL
  USING (private.is_admin()) WITH CHECK (private.is_admin());

COMMIT;
