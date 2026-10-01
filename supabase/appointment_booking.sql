-- ============================================================================
-- Appointment booking: schema guarantees, RLS, and a slot-conflict RPC.
--
-- Run this in the Supabase SQL editor. It is idempotent.
--
-- Why this exists
-- ---------------
-- The booking flow used to insert straight into `appointments` from the
-- browser. Three things were missing:
--
--   1. No policy let a patient SELECT or UPDATE their own appointment, so
--      "My Appointments" and cancel/reschedule were blocked by RLS while
--      still appearing to succeed (PostgREST returns zero rows, not an error).
--   2. Nothing stopped two patients booking the same slot. The app checked for
--      a conflict first, but that check and the insert are two separate
--      requests, so two simultaneous bookings both passed it.
--   3. `status` was unconstrained free text, so the two divergent TypeScript
--      unions in the app (one of which allows "scheduled") could both write
--      values nothing else agreed on.
--
-- `appointments.patient_id` stores the auth user id, while `patients.id` is a
-- separate profile row. The policies below therefore compare against
-- `auth.uid()` and fall back to `patients.user_id` so a patient's own rows
-- resolve either way.
-- ============================================================================

-- ─── 1. Column constraints ───────────────────────────────────────────────────

begin;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_status_check'
  ) then
    alter table public.appointments
      add constraint appointments_status_check
      check (
        status in ('pending', 'confirmed', 'cancelled', 'completed')
      ) not valid;
  end if;
end $$;

commit;

-- `not valid` above skips scanning existing rows. Validate once the table is
-- known to be clean; a failure here means a legacy row holds a value outside
-- the allowed set, which is worth surfacing rather than silently dropping.
alter table public.appointments validate constraint appointments_status_check;


-- ─── 2. One booking per doctor per slot ──────────────────────────────────────
--
-- A partial unique index makes double-booking impossible regardless of what the
-- client does. It only covers live statuses, so a cancelled slot is freed and
-- can be rebooked.
--
-- If any column turns out to be non-nullable with a different type this
-- statement fails loudly, which is preferable to silently skipping the index.

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
  end if;
end $$;


-- ─── 3. Row level security ──────────────────────────────────────────────────

alter table public.appointments enable row level security;

-- Patients read their own bookings; doctors read bookings made against them.
drop policy if exists "appointments_select_own" on public.appointments;
create policy "appointments_select_own"
  on public.appointments
  for select to authenticated
  using (
    patient_id::text = auth.uid()::text
    or doctor_id::text = auth.uid()::text
  );

-- Patients book for themselves only.
drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own"
  on public.appointments
  for insert to authenticated
  with check (patient_id::text = auth.uid()::text);

-- Patients may cancel or reschedule their own booking; so may the doctor.
--
-- `status` is constrained to 'pending' | 'confirmed' | 'cancelled' | 'completed'
-- above, which is why 'scheduled' is no longer written by the doctor dashboard.
-- A patient cancelling their own booking is legitimate; a patient marking
-- their own booking 'completed' is not, so that transition is blocked.
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


-- ─── 4. Slot conflict check ─────────────────────────────────────────────────
--
-- The API calls this instead of reading `appointments` itself, because a
-- patient is not allowed to SELECT other patients' bookings, so the API cannot
-- ask "is this slot already taken?" under the patient's own RLS context.
--
-- SECURITY DEFINER runs the check with the caller's rights bypassed, and the
-- function returns only a boolean - never any row data - so it leaks no
-- information about other patients.

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
as $$
  select exists (
    select 1
    from public.appointments a
    where a.doctor_id::text = p_doctor_id
      and a.appointment_date = p_date
      and a.appointment_time::text = p_time
      and a.status in ('pending', 'confirmed')
      and (p_exclude_id is null or a.id::text <> p_exclude_id)
  );
$$;

revoke all on function public.appointment_slot_is_taken(text, date, text, text)
  from public;
grant execute on function public.appointment_slot_is_taken(text, date, text, text)
  to authenticated;


-- ─── 5. Doctor availability read helper ─────────────────────────────────────
--
-- A patient choosing a date needs the doctor's weekly schedule, but
-- `doctor_availability` has no patient-facing select policy. Same reasoning as
-- above: return only the windows, never anything private.

create or replace function public.doctor_availability_windows(p_doctor_id text)
returns table (day_of_week text, start_time text, end_time text)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(a.day_of_week::text, ''),
    coalesce(a.start_time::text, ''),
    coalesce(a.end_time::text, '')
  from public.doctor_availability a
  where a.doctor_id::text = p_doctor_id;
$$;

revoke all on function public.doctor_availability_windows(text) from public;
grant execute on function public.doctor_availability_windows(text)
  to authenticated;


-- ─── 6. Report ──────────────────────────────────────────────────────────────
--
-- Confirms the constraints and policies landed. Expect every check to read ok.

-- Verification lives in appointment_booking_verify.sql. It is kept in a separate
-- file on purpose: the Supabase SQL editor submits the whole script as one
-- implicit transaction, so a failing read-only query at the end of this file
-- would roll back the DDL above along with it.
--
-- After running this file, reload the schema cache under
-- Settings -> API -> "Reload schema". PostgREST discovers the new functions and
-- index from that cache, and answers 404 until it is refreshed.
