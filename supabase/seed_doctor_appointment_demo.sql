-- ===========================================================================
-- Seed data so the doctor appointment-details page can actually be opened
-- ===========================================================================
-- The page is code-complete, but your database currently holds:
--   appointments        0 rows
--   patients            0 rows
--   patient_intakes     0 rows
--   doctor_availability 0 rows
--
-- So there is nothing for `/doctor/appointments/[id]` to render, and nothing is
-- bookable. This script creates one appointment for the first doctor account
-- found in `auth.users`, so the page can be opened and verified.
--
-- It is written to be safe to re-run: every insert is guarded, and nothing is
-- deleted or overwritten.
--
-- BEFORE RUNNING: note the doctor's email address. The script picks the first
-- doctor-like account; if you need a specific one, edit p_doctor_email below.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Resolve the doctor account.
-- ---------------------------------------------------------------------------

do $$
declare
  v_uid text;
begin
  -- Supabase stores the address in auth.users.email; auth.identities holds a
  -- copy for OAuth accounts. Either is fine.
  select u.id::text
    into v_uid
  from auth.users u
  order by u.created_at asc nulls last
  limit 1;

  if v_uid is null then
    raise notice 'No auth.users rows found -- sign up as a doctor first, then re-run.';
    return;
  end if;

  raise notice 'using doctor auth uid %', v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. doctors row for that account, if one is missing.
-- ---------------------------------------------------------------------------

insert into public.doctors (id, full_name, specialty, consultation_fee)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), 'Doctor'),
  coalesce(nullif(u.raw_user_meta_data->>'specialty', ''), 'General Medicine'),
  0
from auth.users u
where not exists (
  select 1 from public.doctors d where d.id = u.id
)
order by u.created_at asc nulls last
limit 1;

-- ---------------------------------------------------------------------------
-- 3. Weekly availability, so this doctor has bookable slots.
-- ---------------------------------------------------------------------------
-- Two schema details that are not obvious and that silently break this insert:
--
-- 1. `day_of_week` is TEXT holding a day name ("Monday" .. "Sunday"), matching
--    what `/doctor/availability` writes and what `normalizeDay` in
--    src/lib/doctorSlots.ts expects. Storing integers here would make every
--    slot lookup miss.
--
-- 2. `doctor_availability.doctor_id` is TEXT, but `doctors.id` is UUID. Comparing
--    them without a cast fails with:
--      ERROR: 42883: operator does not exist: text = uuid
--    Hence the explicit ::text casts on both sides.
--
-- The table has exactly four columns: doctor_id, day_of_week, start_time,
-- end_time. There is no `is_active` and no `id`.
--
-- No `on conflict` clause is possible, since there is no unique constraint to
-- target. The NOT EXISTS guard makes the insert idempotent instead.

insert into public.doctor_availability (doctor_id, day_of_week, start_time, end_time)
select
  d.id::text,
  day_name,
  start_t::time,
  end_t::time
from public.doctors d
cross join (values ('Monday'), ('Tuesday'), ('Wednesday'), ('Thursday'), ('Friday')) as days(day_name)
cross join (values ('09:00', '17:00')) as hours(start_t, end_t)
where not exists (
  select 1
  from public.doctor_availability a
  where a.doctor_id = d.id::text
    and a.day_of_week = day_name
    and a.start_time = start_t::time
    and a.end_time = end_t::time
);

-- ---------------------------------------------------------------------------
-- 4. A patient profile, appointment and intake to view.
-- ---------------------------------------------------------------------------
-- Id types differ per column, so each insert casts to the column's own type:
--
--   patients.id              text
--   patient_intakes.patient_id  text
--   appointments.patient_id    uuid
--   appointments.doctor_id     uuid
--   doctors.id                 uuid
--
-- The patient id is generated once as text and cast per target column, so the
-- three references stay consistent and the detail join resolves.

do $$
declare
  v_doctor uuid;
  v_patient text := gen_random_uuid()::text;
begin
  select id into v_doctor
  from public.doctors
  order by created_at asc nulls last
  limit 1;

  if v_doctor is null then
    raise notice 'no doctors row found, stopping before seeding the appointment';
    return;
  end if;

  if exists (select 1 from public.appointments where doctor_id = v_doctor) then
    raise notice 'this doctor already has an appointment, nothing seeded';
    return;
  end if;

  insert into public.patients (id, full_name, email, phone_number, medical_record_number)
  values (
    v_patient,
    'Test Patient',
    'test.patient@example.com',
    '+91 90000 00000',
    'MRN-TEST-0001'
  )
  on conflict (id) do nothing;

  insert into public.patient_intakes (
    id, patient_id, chief_complaint, symptoms_description,
    symptom_onset, pain_level, temperature_celsius,
    blood_pressure, heart_rate_bpm, additional_notes, submitted_at
  )
  values (
    gen_random_uuid(),
    v_patient,
    'Chest pain for two days',
    'Intermittent tightness in the chest, worse on exertion.',
    '2 days',
    6,
    37.2,
    '130/85',
    78,
    'Seeded record for verifying the doctor appointment details page.',
    now()
  )
  on conflict (id) do nothing;

  insert into public.appointments (
    id, patient_id, doctor_id, appointment_date, appointment_time, status, notes
  )
  values (
    gen_random_uuid(),
    v_patient::uuid,
    v_doctor,
    (current_date + 3),
    '10:00',
    'confirmed',
    'Seeded appointment for verifying the details page.'
  );

  raise notice 'seeded appointment for doctor % with patient %', v_doctor, v_patient;

exception
  when others then
    raise notice 'seeding FAILED: %', sqlerrm;
end;
$$;

commit;

-- ===========================================================================
-- Verification -- expect at least one row from each table.
-- ===========================================================================

select 'doctors' as table_name, count(*) as rows from public.doctors
union all
select 'doctor_availability', count(*) from public.doctor_availability
union all
select 'patients', count(*) from public.patients
union all
select 'patient_intakes', count(*) from public.patient_intakes
union all
select 'appointments', count(*) from public.appointments
order by 1;
