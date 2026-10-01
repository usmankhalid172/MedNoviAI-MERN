-- ===========================================================================
-- Doctor appointment-detail read access
-- ===========================================================================
-- The doctor appointment details page needs two things the current policies
-- do not allow:
--
--   1. the patient's profile row, so the page can show name, phone, email and
--      medical record number. `patients_select_own` matches only the patient
--      themselves, so a doctor currently gets nothing.
--   2. the patient's intake record, which carries the clinical fields the
--      intake summary renders.
--
-- Both are scoped to appointments the caller actually owns, so a doctor can
-- only see patients they have a booking with. They can never enumerate the
-- patient table.
--
-- Each block is wrapped so a failure is reported as a NOTICE instead of
-- rolling back the rest of the file.
--
-- NOTE: the function is created directly inside the `do` block, NOT via
-- `execute`. Wrapping a function definition in `execute` requires a
-- dollar-quote tag for the string, and that tag cannot be the same one the
-- function body uses, because Postgres ends a dollar-quoted string at the
-- first matching tag. Using the same tag twice leaves the body as a bare
-- plpgsql statement, which fails with:
--   ERROR: syntax error at or near "exists"
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Helper: does the caller have an appointment with this patient?
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER, because it must read `public.patients` to resolve
-- `patients.user_id`, and the `patients` RLS policy does not let a doctor see
-- that row. As owner, it bypasses RLS, so the join below works.
--
-- It is called ONLY from the `patient_intakes` policy. The `patients` policy
-- does not use it, deliberately: a policy that calls a function which reads its
-- own table would recurse.
--
-- `appointments.patient_id` stores the auth user id, while `patients.id` is a
-- separate profile row joined by `patients.user_id`. The two can differ, so
-- both are matched.
--
-- Returns a single boolean scoped to the caller's own bookings.

do $$
begin
  create or replace function public.doctor_has_appointment_with(
    p_patient_id text
  )
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $fn$
    select exists (
      select 1
      from public.appointments a
      left join public.patients p
        on p.id::text = a.patient_id::text
      where a.doctor_id::text = auth.uid()::text
        and (
          a.patient_id::text = p_patient_id
          or p.user_id::text = p_patient_id
        )
    );
  $fn$;

  revoke all on function public.doctor_has_appointment_with(text)
    from public;
  grant execute on function public.doctor_has_appointment_with(text)
    to authenticated;

  raise notice 'doctor_has_appointment_with created';
exception
  when others then
    raise notice 'doctor_has_appointment_with FAILED: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Doctors may read the patient row for their own bookings.
-- ---------------------------------------------------------------------------
-- Deliberately a direct EXISTS, not a call to the helper above. A policy on
-- `patients` that reads `patients` recurses, and Postgres raises
-- "infinite recursion detected in policy" for that.
--
-- Only the `patients.id` branch is needed: the app resolves the patient by
-- `appointments.patient_id = patients.id`. The `user_id` variant lives in the
-- helper, which runs as owner and so bypasses RLS.

do $$
begin
  drop policy if exists "patients_select_doctor" on public.patients;

  create policy "patients_select_doctor"
    on public.patients
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.appointments a
        where a.doctor_id::text = auth.uid()::text
          and a.patient_id::text = patients.id::text
      )
    );

  raise notice 'patients_select_doctor created';
exception
  when others then
    raise notice 'patients_select_doctor FAILED: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Doctors may read intake for patients they have a booking with.
-- ---------------------------------------------------------------------------
-- The appointment_id branch covers intakes recorded before this appointment was
-- created; the patient_id branch covers intakes with no appointment link.

do $$
begin
  execute 'alter table public.patient_intakes enable row level security';

  drop policy if exists "patient_intakes_select_doctor"
    on public.patient_intakes;

  create policy "patient_intakes_select_doctor"
    on public.patient_intakes
    for select
    to authenticated
    using (
      public.doctor_has_appointment_with(patient_id::text)
      or exists (
        select 1
        from public.appointments a
        where a.id::text = patient_intakes.appointment_id::text
          and a.doctor_id::text = auth.uid()::text
      )
    );

  raise notice 'patient_intakes_select_doctor created';
exception
  when others then
    raise notice 'patient_intakes_select_doctor FAILED: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Patients keep their own read access to their intake.
-- ---------------------------------------------------------------------------
-- `patient_intakes.patient_id` may hold either the auth user id or the
-- `patients.id` profile id depending on how the row was written, and the
-- patient only knows their auth uid. Both are matched, mirroring the helper.

do $$
begin
  drop policy if exists "patient_intakes_select_own"
    on public.patient_intakes;

  create policy "patient_intakes_select_own"
    on public.patient_intakes
    for select
    to authenticated
    using (
      patient_intakes.patient_id::text = auth.uid()::text
      or exists (
        select 1
        from public.patients p
        where p.id::text = patient_intakes.patient_id::text
          and p.user_id::text = auth.uid()::text
      )
    );

  raise notice 'patient_intakes_select_own created';
exception
  when others then
    raise notice 'patient_intakes_select_own FAILED: %', sqlerrm;
end;
$$;

commit;

-- ===========================================================================
-- Verification
-- ===========================================================================
-- Expect four rows. If a policy is missing here, its NOTICE said FAILED above.
--
-- pg_policies exposes `policyname` and `tablename`. There is no `polname`
-- column; querying it fails with:
--   ERROR: column p.polname does not exist

select
  'doctor_has_appointment_with'::text as object,
  'function'::text as kind,
  (
    select count(*) > 0
    from pg_proc
    where proname = 'doctor_has_appointment_with'
      and pronamespace = 'public'::regnamespace
  ) as ok
union all
select
  p.policyname,
  'policy on ' || p.tablename,
  true
from pg_policies p
where p.schemaname = 'public'
  and p.policyname in (
    'patients_select_doctor',
    'patient_intakes_select_doctor',
    'patient_intakes_select_own'
  )
order by 1;
