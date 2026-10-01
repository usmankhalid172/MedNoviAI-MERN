-- ============================================================================
-- appointments.patient_name
--
-- Why this column exists
-- ---------------------
-- The doctor dashboard is supposed to show *which patient* booked, but that name
-- was resolved by reading `public.patients`. That could not work in practice:
--
--   1. Nothing in the app ever inserts a `public.patients` row. Signup creates an
--      auth user and nothing else, so a real patient who signs up and books has
--      no profile row at all and the name fell back to the literal "Patient".
--   2. The `patients_select_doctor` RLS policy matches
--      `a.patient_id::text = patients.id::text` only. It never considers
--      `patients.user_id`, so a profile row that did exist under the other
--      convention was invisible to the doctor regardless.
--
-- Storing the name on the appointment itself removes both problems: the booking
-- API already knows the authenticated caller and reads their name from the
-- token, and the doctor reads their own appointments row, which RLS already
-- permits. No profile row and no cross-table policy is involved.
--
-- Bookings created before this migration keep a NULL `patient_name`; the
-- dashboards still fall back to the `public.patients` lookup for those.
--
-- Idempotent: safe to run repeatedly.
-- ============================================================================

do $$
begin
  alter table public.appointments
    add column if not exists patient_name text;

  raise notice 'appointments.patient_name ensured';
exception
  when others then
    raise notice 'appointments.patient_name FAILED: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill from auth, so existing pending bookings are not left nameless.
--
-- `patient_id` is written as the auth user id, which is what `auth.users.id`
-- holds, so this is an exact join rather than a guess. Rows with no matching
-- auth user keep NULL and fall back at read time.
-- ---------------------------------------------------------------------------

do $$
begin
  update public.appointments a
     set patient_name = coalesce(nullif(btrim(u.raw_user_meta_data ->> 'name'), ''), nullif(btrim(u.email), ''))
    from auth.users u
   where a.patient_name is null
     and u.id = a.patient_id;

  raise notice 'appointments.patient_name backfilled from auth.users';
exception
  when others then
    raise notice 'appointments.patient_name backfill FAILED: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- Best-effort backfill for the seeded demo rows, whose `patients.id` was set to
-- the auth user id. Skipped silently when the table or policy hides the rows.
-- ---------------------------------------------------------------------------

do $$
begin
  update public.appointments a
     set patient_name = p.full_name
    from public.patients p
   where a.patient_name is null
     and p.id::text = a.patient_id::text
     and p.full_name is not null;

  raise notice 'appointments.patient_name backfilled from public.patients';
exception
  when others then
    raise notice 'appointments.patient_name patients backfill SKIPPED: %', sqlerrm;
end;
$$;

commit;

-- ---------------------------------------------------------------------------
-- Verification (read-only)
-- ---------------------------------------------------------------------------

select count(*) as total_appointments,
       count(patient_name) as with_patient_name,
       count(*) - count(patient_name) as still_missing_name
  from public.appointments;

select id, patient_id, patient_name, appointment_date, appointment_time, status
  from public.appointments
 order by created_at desc
 limit 10;
