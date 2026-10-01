-- Fixes: POST /rest/v1/doctors?on_conflict=id -> 400
--   PGRST204 "Could not find the 'bio' column of 'doctors' in the schema cache"
--
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to run more than once.
--
-- Why each statement is needed:
--   1. bio / experience_years  - the dashboard writes these; they do not exist
--   2. created_at default      - the dashboard upsert does not send created_at
--   3. unique index on id      - ON CONFLICT (onConflict: "id") requires it
--   4. RLS write policies      - writes are currently blocked (42501), so a
--                                "successful" save would save nothing
--   5. NOT NULL relaxed        - an upsert builds a full INSERT tuple, so a
--                                NOT NULL column the form omits fails the save

alter table public.doctors
  add column if not exists bio text,
  add column if not exists experience_years integer,
  add column if not exists consultation_fee numeric(10, 2),
  add column if not exists education text[],
  add column if not exists certifications text[];

alter table public.doctors
  alter column created_at set default now();

create unique index if not exists doctors_id_key on public.doctors (id);

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

drop policy if exists "doctors_insert_own" on public.doctors;
create policy "doctors_insert_own" on public.doctors
  for insert to authenticated
  with check (id::text = auth.uid()::text);

drop policy if exists "doctors_update_own" on public.doctors;
create policy "doctors_update_own" on public.doctors
  for update to authenticated
  using (id::text = auth.uid()::text)
  with check (id::text = auth.uid()::text);

-- Verification: bio / experience_years must appear in the result set.
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
