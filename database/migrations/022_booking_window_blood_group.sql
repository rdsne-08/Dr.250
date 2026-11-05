BEGIN;

ALTER TABLE public.doctor_daily_availability
  ADD COLUMN booking_start time,
  ADD COLUMN booking_end time,
  ADD CONSTRAINT doctor_daily_booking_hours_valid CHECK (
    (booking_start IS NULL AND booking_end IS NULL)
    OR (booking_start IS NOT NULL AND booking_end IS NOT NULL AND booking_start < booking_end)
  );

ALTER TABLE public.patients DROP CONSTRAINT patients_blood_group_check;
ALTER TABLE public.patients ADD CONSTRAINT patients_blood_group_check CHECK (
  blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown')
);

COMMIT;
