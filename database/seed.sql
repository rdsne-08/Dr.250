\set ON_ERROR_STOP on

BEGIN;

INSERT INTO public.users (id, email)
VALUES
    ('00000000-0000-4000-8000-000000000001', 'patient@example.com'),
    ('00000000-0000-4000-8000-000000000002', 'doctor@example.com'),
    ('00000000-0000-4000-8000-000000000003', 'lab@example.com')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

INSERT INTO public.profiles (id, user_id, full_name, phone, role)
VALUES
    (
        '10000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000001',
        'Sample Patient', '+8801700000001', 'PATIENT'
    ),
    (
        '10000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000002',
        'Dr. Sample Physician', '+8801700000002', 'DOCTOR'
    ),
    (
        '10000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000003',
        'Sample Lab Operator', '+8801700000003', 'LAB'
    )
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

INSERT INTO public.patients (
    id, profile_id, date_of_birth, gender, blood_group, emergency_contact
)
VALUES (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    DATE '1995-05-12', 'FEMALE', 'O+', '+8801800000001'
)
ON CONFLICT (id) DO UPDATE SET
    date_of_birth = EXCLUDED.date_of_birth,
    gender = EXCLUDED.gender,
    blood_group = EXCLUDED.blood_group,
    emergency_contact = EXCLUDED.emergency_contact;

INSERT INTO public.doctors (
    id, profile_id, specialization, license_number, verification_status
)
VALUES (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'Internal Medicine', 'BMDC-SAMPLE-001', 'VERIFIED'
)
ON CONFLICT (id) DO UPDATE SET
    specialization = EXCLUDED.specialization,
    verification_status = EXCLUDED.verification_status;

INSERT INTO public.laboratories (
    id, profile_id, lab_name, license_number, verification_status
)
VALUES (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003',
    'Sample Diagnostic Centre', 'DGHS-SAMPLE-001', 'VERIFIED'
)
ON CONFLICT (id) DO UPDATE SET
    lab_name = EXCLUDED.lab_name,
    verification_status = EXCLUDED.verification_status;

INSERT INTO public.medical_records (
    id, patient_id, title, description, document_url, record_type
)
VALUES (
    '50000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Annual health check',
    'Routine consultation with no acute findings.',
    'https://example.invalid/records/annual-health-check.pdf',
    'CONSULTATION'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    document_url = EXCLUDED.document_url,
    record_type = EXCLUDED.record_type;

INSERT INTO public.prescriptions (
    id, patient_id, doctor_id, medicine, dosage, duration, instructions
)
VALUES (
    '60000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'Paracetamol', '500 mg', '3 days', 'Take after food when needed.'
)
ON CONFLICT (id) DO UPDATE SET
    medicine = EXCLUDED.medicine,
    dosage = EXCLUDED.dosage,
    duration = EXCLUDED.duration,
    instructions = EXCLUDED.instructions;

INSERT INTO public.lab_reports (
    id, patient_id, laboratory_id, requested_by_doctor_id,
    test_name, report_url, status
)
VALUES (
    '70000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'Complete Blood Count',
    'https://example.invalid/reports/cbc-sample.pdf',
    'COMPLETED'
)
ON CONFLICT (id) DO UPDATE SET
    test_name = EXCLUDED.test_name,
    report_url = EXCLUDED.report_url,
    status = EXCLUDED.status;

COMMIT;
