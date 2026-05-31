-- ============================================================
-- Seed data: 5 patients + 10 appointments
-- Run AFTER 0001_init.sql.
-- Note: patients here have no profile_id (walk-in records).
-- Create admin login separately via Supabase Auth, then:
--   update public.profiles set role = 'admin' where email = 'admin@clinic.test';
-- ============================================================

do $$
declare
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid;
begin
  insert into public.patients (full_name, phone, email, gender, date_of_birth, blood_type, allergies)
  values
    ('Ahmed Hassan',   '+201001112233', 'ahmed@example.com',  'male',   '1985-03-12', 'O+',  'Penicillin'),
    ('Sara Mahmoud',   '+201002223344', 'sara@example.com',   'female', '1992-07-25', 'A+',  null),
    ('Omar Khaled',    '+201003334455', 'omar@example.com',   'male',   '1978-11-02', 'B+',  'Aspirin'),
    ('Layla Ibrahim',  '+201004445566', 'layla@example.com',  'female', '2000-01-18', 'AB+', null),
    ('Youssef Adel',   '+201005556677', 'youssef@example.com','male',   '1965-09-30', 'O-',  'Sulfa drugs')
  returning id into p1; -- captures first only; fetch rest below

  select id into p1 from public.patients where email = 'ahmed@example.com';
  select id into p2 from public.patients where email = 'sara@example.com';
  select id into p3 from public.patients where email = 'omar@example.com';
  select id into p4 from public.patients where email = 'layla@example.com';
  select id into p5 from public.patients where email = 'youssef@example.com';

  insert into public.appointments (patient_id, scheduled_at, status, reason) values
    (p1, now() - interval '10 days', 'completed',  'General checkup'),
    (p1, now() + interval '2 days',  'scheduled',  'Follow-up'),
    (p2, now() - interval '5 days',  'completed',  'Flu symptoms'),
    (p2, now() + interval '1 day',   'scheduled',  'Lab review'),
    (p3, now() - interval '2 days',  'no_show',    'Back pain'),
    (p3, now() + interval '3 days',  'scheduled',  'Consultation'),
    (p4, now(),                      'waiting',    'Skin rash'),
    (p4, now() + interval '7 days',  'scheduled',  'Allergy test'),
    (p5, now() - interval '1 day',   'cancelled',  'Hypertension'),
    (p5, now() + interval '4 days',  'scheduled',  'Blood pressure check');

  insert into public.prescriptions (patient_id, medication, dosage, frequency, duration, instructions)
  values
    (p1, 'Paracetamol', '500mg', 'Twice daily', '5 days', 'After meals'),
    (p2, 'Oseltamivir', '75mg',  'Twice daily', '5 days', 'Complete full course');
end $$;
