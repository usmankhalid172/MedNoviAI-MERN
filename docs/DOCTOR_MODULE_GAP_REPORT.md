# Doctor Module Gap Report
**Prepared by:** Hamid Shoukat  
**Date:** 29 September 2026  
**Repository:** https://github.com/usmankhalid172/MedNoviAI-MERN  
**Branch reviewed:** `dev`  
**Scope:** Day 22–25 — Doctor Module verification

---

## 1. Summary

The Doctor Module has UI pages for listing, profile, availability, appointments, and dashboard.  
Several flows still depend on mixed data sources (Supabase vs old API), incomplete endpoints, or empty/seed data on the team Supabase project.

| Area | Status | Notes |
|------|--------|------|
| Doctor listing / search | Partially working | Works with Supabase; schema fields limited |
| Specialty filter | Partially working | Loads from `specialties`; filter is client-side |
| Public doctor profile | Partially working | Page exists; depends on `DoctorProfileView` + data |
| Doctor availability UI | UI present | Still calls old API (`/availability/...`) |
| Doctor appointments | UI present | Calls old API; “All” filter not implemented |
| Doctor dashboard | Partially working | Mixed Supabase + API; hard-coded Supabase client |
| Doctor profile edit | UI present | Uses API `/doctors/user/{id}` and `/doctors/profile` |
| Patient info display | Incomplete | Limited patient fields on appointment lists |

---

## 2. Detailed findings

### 2.1 Doctor listing / search (`/doctors`)

**What works**
- Page loads with search + specialty dropdown
- Debounced search (300ms)
- Loading skeletons, empty state, retry on error
- Uses team/personal Supabase `doctors` table

**Gaps / issues**
- Selects only: `id, full_name, specialty, rating, avatar_url`
- Experience often shows placeholder: “Experience available on profile”
- No reliable join to `specialties` table (uses `specialty` text column)
- On team Supabase, table can be empty → “No doctors found”
- Avatar often missing → initials fallback needed (partially handled)

**Broken / missing data states**
- Empty list when no rows
- Error + Retry when Supabase fails
- Specialty dropdown fails if `specialties` table empty or RLS blocks

---

### 2.2 Public doctor profile (`/doctors/[id]`)

**What works**
- Route and page shell exist
- Uses `DoctorProfileView` component

**Gaps / issues**
- Depends on doctor row existing in Supabase
- Need to verify: bio, experience, fee, reviews, availability slots, Book Visit CTA
- If doctor ID invalid → must show clear empty/error state (verify on UI)

---

### 2.3 Specialty information

**What works**
- `specialties` table query on listing page
- Filter by specialty name (client-side)

**Gaps / issues**
- Doctors store `specialty` as text, not always `specialty_id` FK
- Inconsistent specialty values across rows
- No dedicated specialty management UI for doctors

---

### 2.4 Doctor availability (`/doctor/availability`)

**What works**
- Full UI: list, add, edit, delete, active/inactive
- Form validation (time range, slot duration)

**Gaps / issues**
- Still uses **old API** (`api.get/post/put/delete` on `/availability/...`)
- Not wired to team Supabase `doctor_availability` table
- Without running .NET/API backend, page shows load errors or empty data
- Doctor must be logged in; otherwise “Doctor login required”

**Broken / missing data states**
- Loading spinner
- Error message when API fails
- Empty list when no rules

---

### 2.5 Doctor appointments (`/doctor/appointments`)

**What works**
- Filters: Today / This Week / All
- Status update dropdown (Confirmed, Completed, Cancelled, NoShow)
- Link to appointment detail `/doctor/appointments/[id]`

**Gaps / issues**
- Uses old API: `/api/doctors/{id}/appointments?date=...`
- “All” filter explicitly not implemented (message shown)
- Status values may not match Supabase (`pending/confirmed/cancelled/completed`)
- Patient name depends on API payload; may be missing on Supabase-only setup

**Broken / missing data states**
- Loading, error + retry, empty state per filter

---

### 2.6 Doctor dashboard (`/doctor/dashboard`)

**What works**
- Stats UI (appointments, patients, ongoing, revenue)
- Profile edit section (bio, experience, photo)
- Navigation via `DoctorPortalNav`

**Gaps / issues**
- Appointments loaded via **old API** (`/doctors/{id}/appointments`)
- Profile load/save uses a **hard-coded Supabase client** (different project URL/key), not shared `@/lib/supabase`
- Risk of wrong project / broken auth vs rest of app
- Revenue/patient stats may be inaccurate if API returns incomplete data

---

### 2.7 Doctor profile page (`/doctor/profile`)

**What works**
- View + edit professional fields (license, experience, bio, fee, clinic)
- Validation and save flow

**Gaps / issues**
- Depends on API: `GET /doctors/user/{userId}`, `PATCH /doctors/profile`
- Without backend, page fails to load
- Name/specialty/email often read-only from auth; may not sync with `doctors` table

---

### 2.8 Patient information display (doctor side)

**What works**
- Appointment lists show patient name when API provides it

**Gaps / issues**
- Limited patient details (often only name)
- No clear link to full patient profile/history on doctor side
- On pure Supabase path, need join `appointments` → `profiles` for name/email/phone

---

## 3. Cross-cutting issues

1. **Dual data sources**  
   Patient-facing pages lean on Supabase; many doctor pages still call old REST API (`@/lib/api`).

2. **Team Supabase empty / incomplete data**  
   `doctors`, `appointments`, `specialties` may be empty → correct empty states, but hard to demo.

3. **Schema mismatches**  
   - Listing expects simple columns  
   - Dashboard expects `experience_years`, `bio`  
   - Status enums differ (API vs Supabase)

4. **Hard-coded Supabase in doctor dashboard**  
   Should use shared `src/lib/supabase.ts` and env vars only.

5. **Auth role**  
   Doctor pages require `user.role === "doctor"` and matching `user.id` as doctor id — verify signup/metadata sets this.

---

## 4. Priority recommendations

| Priority | Action |
|----------|--------|
| P0 | Unify all doctor pages on team Supabase (or document that API must be running) |
| P0 | Remove hard-coded Supabase URL/key from `doctor/dashboard` |
| P1 | Seed team Supabase with sample doctors, specialties, availability, appointments |
| P1 | Align status values across patient + doctor flows |
| P2 | Implement “All appointments” for doctor or hide the tab |
| P2 | Enrich patient info on doctor appointment views (name, phone, notes) |
| P3 | Ensure public profile shows experience, fee, reviews, book CTA consistently |

---

## 5. Conclusion

The Doctor Module UI is largely in place.  
Main gaps are **data integration** (API vs Supabase), **empty team data**, and **inconsistent schema/auth**.  

Once the team standardizes on one backend (team Supabase or live API) and seeds data, most pages will work with only small code fixes.

---

**Report status:** Ready for Team Lead review  
**Next step after approval:** Fix P0/P1 items or wait for backend/data ownership assignment.
