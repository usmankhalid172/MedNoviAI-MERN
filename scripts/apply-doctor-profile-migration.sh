#!/usr/bin/env bash
#
# Applies the ZEHAB doctor-profile schema migration.
#
# DDL (CREATE/ALTER TABLE) cannot be executed through PostgREST, so this
# cannot be done with the anon key the app ships with. Two supported paths:
#
#   1. Supabase CLI (preferred, repeatable):
#        npx supabase link --project-ref zchrsfxmnujsvjbedmdc
#        npx supabase db push
#
#   2. Dashboard: SQL Editor -> New query -> paste the migration -> Run.
#
# This script reports which of those is available and verifies the result.

set -uo pipefail

MIGRATION="supabase/migrations/20260930_zehab_doctor_profile_fields.sql"
ENV_FILE=".env.local"

if [ ! -f "$MIGRATION" ]; then
  echo "Migration not found: $MIGRATION" >&2
  exit 1
fi

echo "==> Checking required columns on public.doctors"
echo "    (expected before migration: 'column doctors.bio does not exist')"
echo

URL=$(grep -oP '(?<=NEXT_PUBLIC_SUPABASE_URL=).*' "$ENV_FILE" | tr -d ' \r')
KEY=$(grep -oP '(?<=NEXT_PUBLIC_SUPABASE_ANON_KEY=).*' "$ENV_FILE" | tr -d ' \r')

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "Could not read NEXT_PUBLIC_SUPABASE_URL / ANON_KEY from $ENV_FILE" >&2
  exit 1
fi

probe() {
  curl -s "$URL/rest/v1/doctors?select=$1&limit=1" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
}

bio_state=$(probe bio | head -c 200)
echo "bio            -> $bio_state"
echo "experience_years -> $(probe experience_years | head -c 200)"
echo

if echo "$bio_state" | grep -q "does not exist"; then
  echo "==> MIGRATION NOT YET APPLIED"
  echo
  echo "Apply it with one of:"
  echo
  echo "  A) Supabase CLI"
  echo "     npx supabase link --project-ref zchrsfxmnujsvjbedmdc"
  echo "     npx supabase db push"
  echo
  echo "  B) Dashboard"
  echo "     https://supabase.com/dashboard/project/zchrsfxmnujsvjbedmdc/editor"
  echo "     New query -> paste $MIGRATION -> Run"
  echo
  echo "The migration ends with a verification SELECT, so the result set will"
  echo "show the five new columns once it succeeds."
  exit 1
fi

echo "==> MIGRATION APPLIED"
echo "    Columns exist. Fill in the values as the doctor from"
echo "    Doctor -> Profile -> Practice Information (bio, years of"
echo "    experience, consultation fee, education, certifications)."
