-- ZEHAB — Doctor Profile fields

-- 1. Missing doctor profile columns -----------------------------------------

alter table public.doctors
  add column if not exists bio text,
  add column if not exists experience_years integer,
  add column if not exists consultation_fee numeric(10, 2),
  add column if not exists education text[],
  add column if not exists certifications text[];

comment on column public.doctors.bio is
  'Professional biography shown on the public doctor profile';
comment on column public.doctors.experience_years is
  'Years of clinical experience';
comment on column public.doctors.consultation_fee is
  'Consultation fee in the display currency';
comment on column public.doctors.education is
  'Degrees and institutions, most recent first';
comment on column public.doctors.certifications is
  'Medical board certifications and licences';

-- 2. Make `upsert({ onConflict: "id" })` viable --------------------------------
--
-- ON CONFLICT needs a unique index on the conflict target.
create unique index if not exists doctors_id_key on public.doctors (id);

-- An upsert always builds a full INSERT tuple before conflict resolution, so any
-- NOT NULL column the dashboard form does not send (specialty, rating, ...)
-- fails the save with a 400 even when the doctor row already exists. The
-- dashboard intentionally leaves these unset, so drop NOT NULL rather than
-- inventing placeholder values. Only touches columns that are currently NOT NULL.
do $$
declare
  col text;
begin
  foreach col in array array[
    'specialty', 'rating', 'location', 'availability', 'avatar_url'
  ] loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'doctors'
        and column_name = col
        and is_nullable = 'NO'
    ) then
      execute format(
        'alter table public.doctors alter column %I drop not null', col
      );
    end if;
  end loop;
end $$;

-- Keep created_at NOT NULL but make inserts from the app work.
alter table public.doctors
  alter column created_at set default now();

-- 3. Guard rails so the edit form cannot store nonsense -------------------
-- (wrapped so a re-run does not abort on the duplicate constraint name)

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'doctors_experience_years_range'
  ) then
    alter table public.doctors
      add constraint doctors_experience_years_range
      check (
        experience_years is null
        or experience_years between 0 and 70
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'doctors_consultation_fee_range'
  ) then
    alter table public.doctors
      add constraint doctors_consultation_fee_range
      check (
        consultation_fee is null
        or consultation_fee >= 0
      ) not valid;
  end if;
end $$;

-- 4. Row level security ------------------------------------------------------
-- Reads already work. Writes do not: without these policies every "Save"
-- silently affected 0 rows.
--
-- NOTE: owner columns are not all `uuid` (patients.user_id is `text`), so every
-- comparison casts both sides to text. Comparing auth.uid() (uuid) straight to
-- a text column raises `42883: operator does not exist: uuid = text`.

drop policy if exists "doctors_insert_own" on public.doctors;
create policy "doctors_insert_own" on public.doctors
  for insert to authenticated
  with check (id::text = auth.uid()::text);

drop policy if exists "doctors_update_own" on public.doctors;
create policy "doctors_update_own" on public.doctors
  for update to authenticated
  using (id::text = auth.uid()::text)
  with check (id::text = auth.uid()::text);

drop policy if exists "doctor_availability_own_all" on public.doctor_availability;
create policy "doctor_availability_own_all" on public.doctor_availability
  for all to authenticated
  using (doctor_id::text = auth.uid()::text)
  with check (doctor_id::text = auth.uid()::text);

-- Patients may book against any doctor, but only for themselves.
drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own" on public.appointments
  for insert to authenticated
  with check (patient_id::text = auth.uid()::text);

-- Doctors need to read the bookings made against them in order to manage
-- status, and read their own patients to resolve names.
drop policy if exists "appointments_select_doctor" on public.appointments;
create policy "appointments_select_doctor" on public.appointments
  for select to authenticated
  using (doctor_id::text = auth.uid()::text);

drop policy if exists "patients_select_own" on public.patients;
create policy "patients_select_own" on public.patients
  for select to authenticated
  using (
    id::text = auth.uid()::text
    or user_id::text = auth.uid()::text
  );

-- 5. Seed data ---------------------------------------------------------------
-- appointments.patient_id holds the auth user id, but the doctor view resolves
-- names via patients.id. Backfill a profile row per patient so those lookups
-- succeed. The insert is built dynamically because patients.id and
-- appointments.patient_id are not guaranteed to share a type.

do $$
declare
  id_cast text;
  user_id_cast text;
begin
  select case when data_type = 'uuid' then '::uuid' else '::text' end
    into id_cast
    from information_schema.columns
   where table_schema = 'public' and table_name = 'patients'
     and column_name = 'id';

  select case when data_type = 'uuid' then '::uuid' else '::text' end
    into user_id_cast
    from information_schema.columns
   where table_schema = 'public' and table_name = 'patients'
     and column_name = 'user_id';

  if id_cast is not null and user_id_cast is not null then
    execute format(
      $seed$
        insert into public.patients (id, user_id, full_name)
        select
          a.patient_id%1$s,
          a.patient_id%2$s,
          coalesce(nullif(p.full_name, ''), 'Patient')
        from public.appointments a
        left join public.patients p on p.id::text = a.patient_id::text
        where a.patient_id is not null
        on conflict (id) do nothing
      $seed$,
      id_cast,
      user_id_cast
    );
  end if;
end $$;

-- 6. Verification -----------------------------------------------------------
-- bio / experience_years must appear as column names in the result set.

select
  id,
  full_name,
  bio,
  experience_years,
  consultation_fee,
  education,
  certifications
from public.doctors
order by full_name;
