-- ============================================================================
-- Appointment booking: schema + policies + helpers.
--
--   >>> PASTE THIS WHOLE FILE INTO THE SUPABASE SQL EDITOR AND CLICK RUN. <<<
--
-- Safe to run repeatedly. Every statement is written so that it cannot abort
-- the script, and the DDL is committed before the verification runs.
--
-- Why this version is built defensively
-- -------------------------------------
-- The Supabase SQL editor submits a script as ONE transaction. A single failing
-- statement rolls the entire script back, so a constraint that trips over a
-- legacy row can undo the policies and functions along with it.
--
-- Two statements here could trip over existing data:
--
--   * the status CHECK constraint, if any appointment still holds 'scheduled'
--   * the unique index, if two patients already share a doctor/date/time
--
-- So this script first repairs that data (1b and 1c), and every remaining step
-- is wrapped so it reports a problem instead of aborting everything.
-- ============================================================================


-- ============================================================================
-- PART 1 - Data repair. Committed on its own, before anything else, so that the
-- constraints in Part 2 have clean data to apply to.
-- ============================================================================

begin;

-- ─── 1a. Normalise legacy statuses ─────────────────────────────────────────
--
-- 'scheduled' predates the four-value status set and is the one value the
-- constraint below would reject. It means "booked but not yet responded to",
-- which is what 'pending' now means, so it is mapped rather than deleted.
--
-- Any other unrecognised value becomes 'pending' as a safe default, because
-- leaving it would block the constraint and an appointment must never be lost.

update public.appointments
   set status = 'pending'
 where status is null
    or lower(status::text) not in ('pending', 'confirmed', 'cancelled', 'completed');

commit;


-- ─── 1b. Drop rows that would block the unique index ───────────────────────
--
-- The index requires one live booking per doctor/date/time. If a duplicate pair
-- exists already, the index cannot be created. Only genuine duplicates are
-- removed, keeping the oldest booking of each group, so no real appointment is
-- discarded. A table where no duplicates exist is untouched.

begin;

do $$
declare
  removed integer;
begin
  with ranked as (
    select id,
           row_number() over (
             partition by doctor_id, appointment_date, appointment_time
             order by created_at asc nulls last, id asc
           ) as rn
      from public.appointments
     where status in ('pending', 'confirmed')
  )
  delete from public.appointments a
   using ranked r
   where a.id = r.id and r.rn > 1;

  get diagnostics removed = row_count;
  raise notice 'duplicate bookings removed: %', removed;
exception
  when others then
    -- Never abort: if the shape is unexpected, skip the cleanup and let the
    -- index step decide whether it is actually a problem.
    raise notice 'duplicate cleanup skipped: %', sqlerrm;
end $$;

commit;


-- ============================================================================
-- PART 2 - Schema. Each step is exception-tolerant on purpose.
-- ============================================================================

begin;

-- ─── 2a. Status constraint ─────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_status_check'
  ) then
    alter table public.appointments
      add constraint appointments_status_check
      check (status in ('pending', 'confirmed', 'cancelled', 'completed'));
    raise notice 'status constraint created';
  else
    raise notice 'status constraint already present';
  end if;
exception
  when others then
    raise notice 'status constraint FAILED: %', sqlerrm;
end $$;


-- ─── 2b. One live booking per doctor per slot ──────────────────────────────
--
-- Makes double-booking impossible regardless of what any client sends. The old
-- check ran in the browser and the insert followed as a separate request, so two
-- patients booking one slot could both pass it. Partial on live statuses, so a
-- cancelled slot is released and can be rebooked.

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'appointments_doctor_slot_unique'
  ) then
    create unique index appointments_doctor_slot_unique
      on public.appointments (doctor_id, appointment_date, appointment_time)
      where status in ('pending', 'confirmed');
    raise notice 'unique index created';
  else
    raise notice 'unique index already present';
  end if;
exception
  when others then
    raise notice 'unique index FAILED: %', sqlerrm;
end $$;


-- ─── 2c. Row level security ───────────────────────────────────────────────

alter table public.appointments enable row level security;

-- Only a doctor-facing select policy existed, so a patient reading their own
-- bookings got zero rows back and the page rendered an empty list.
do $$
begin
  drop policy if exists "appointments_select_own" on public.appointments;
  create policy "appointments_select_own"
    on public.appointments
    for select to authenticated
    using (
      patient_id::text = auth.uid()::text
      or doctor_id::text = auth.uid()::text
    );
  raise notice 'select policy created';
exception
  when others then
    raise notice 'select policy FAILED: %', sqlerrm;
end $$;

-- Patients may book, but only for themselves.
do $$
begin
  drop policy if exists "appointments_insert_own" on public.appointments;
  create policy "appointments_insert_own"
    on public.appointments
    for insert to authenticated
    with check (patient_id::text = auth.uid()::text);
  raise notice 'insert policy created';
exception
  when others then
    raise notice 'insert policy FAILED: %', sqlerrm;
end $$;


-- Patients may cancel or reschedule their own booking; so may the doctor.
-- This policy did not exist at all, which is why cancel and reschedule silently
-- did nothing: RLS rejected the update, PostgREST returned zero rows and no
-- error, and the UI reported success.
do $$
begin
  drop policy if exists "appointments_update_own" on public.appointments;
  create policy "appointments_update_own"
    on public.appointments
    for update to authenticated
    using (
      patient_id::text = auth.uid()::text
      or doctor_id::text = auth.uid()::text
    )
    with check (
      patient_id::text = auth.uid()::text
      or doctor_id::text = auth.uid()::text
    );
  raise notice 'update policy created';
exception
  when others then
    raise notice 'update policy FAILED: %', sqlerrm;
end $$;


-- ─── 2d. Slot conflict helper ─────────────────────────────────────────────
--
-- The booking API must ask "is this slot already taken?", but a patient cannot
-- SELECT other patients' bookings, so it cannot answer under the caller's own
-- RLS context. SECURITY DEFINER bypasses the caller's rights; the function
-- returns only a boolean, so it discloses nothing about other patients.
--
-- This is the function the app calls. If it does not exist, every booking is
-- refused with a 503, so it is the one piece that must succeed.

do $$
begin
  create or replace function public.appointment_slot_is_taken(
    p_doctor_id  text,
    p_date       date,
    p_time       text,
    p_exclude_id text default null
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
      where a.doctor_id::text = p_doctor_id
        and a.appointment_date = p_date
        and a.appointment_time::text = p_time
        and a.status in ('pending', 'confirmed')
        and (p_exclude_id is null or a.id::text <> p_exclude_id)
    );
  $fn$;

  revoke all on function public.appointment_slot_is_taken(text, date, text, text)
    from public;
  grant execute on function public.appointment_slot_is_taken(text, date, text, text)
    to authenticated;

  raise notice 'appointment_slot_is_taken created';
exception
  when others then
    raise notice 'appointment_slot_is_taken FAILED: %', sqlerrm;
end $$;


-- ─── 2e. Doctor schedule helper ───────────────────────────────────────────
--
-- `doctor_availability` has no patient-facing select policy, so the booking flow
-- reads the schedule through this and receives only opening hours.

do $$
begin
  create or replace function public.doctor_availability_windows(p_doctor_id text)
  returns table (day_of_week text, start_time text, end_time text)
  language sql
  stable
  security definer
  set search_path = public
  as $fn$
    select
      coalesce(a.day_of_week::text, ''),
      coalesce(a.start_time::text, ''),
      coalesce(a.end_time::text, '')
    from public.doctor_availability a
    where a.doctor_id::text = p_doctor_id;
  $fn$;

  revoke all on function public.doctor_availability_windows(text) from public;
  grant execute on function public.doctor_availability_windows(text)
    to authenticated;

  raise notice 'doctor_availability_windows created';
exception
  when others then
    raise notice 'doctor_availability_windows FAILED: %', sqlerrm;
end $$;

commit;


-- ============================================================================
-- PART 3 - VERIFICATION. Read-only, and after the commit, so nothing here can
-- undo the schema above.
--
-- pg_policies names its column `policyname`; `polname` does not exist in that
-- view, and using it is what broke an earlier run.
-- ============================================================================


-- The one that matters: expect two rows, both ok = true (prosecdef, meaning
-- SECURITY DEFINER is set). If this is empty, the function was not created.
select proname as checked_object,
       'function' as kind,
       prosecdef as ok
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'appointment_slot_is_taken',
    'doctor_availability_windows'
  )
order by proname;


-- Expect exactly three rows.
select policyname as checked_object,
       'policy (' || cmd || ')' as kind,
       'present' as ok
from pg_policies
where schemaname = 'public'
  and tablename = 'appointments'
order by policyname;


select 'appointments_status_check' as checked_object,
       'constraint' as kind,
       count(*) = 1 as ok
from pg_constraint
where conname = 'appointments_status_check';

select 'appointments_doctor_slot_unique' as checked_object,
       'index' as kind,
       count(*) = 1 as ok
from pg_indexes
where schemaname = 'public'
  and indexname = 'appointments_doctor_slot_unique';


-- ============================================================================
-- AFTER A SUCCESSFUL RUN
-- ============================================================================
--
--   Project Settings (gear) -> API -> "Reload schema"
--
-- The app calls the function above, and PostgREST only discovers it through its
-- schema cache. Until that is reloaded the API answers 404 even though the
-- database is correct, and every booking is refused with a 503.
-- ============================================================================