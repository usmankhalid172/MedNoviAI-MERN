/**
 * Server-side appointment booking.
 *
 * Both booking entry points - the wizard (app/appointment/book) and the inline
 * quick-book picker (components/doctors/DoctorProfileView) - call this, so slot
 * validation cannot drift between them again.
 *
 * Why booking moved off the browser
 * ---------------------------------
 * The insert used to run from the client, which meant every guarantee about it
 * was a suggestion the client could ignore:
 *
 *   - the duplicate-slot check and the insert were two requests, so two
 *     patients booking the same slot concurrently both passed the check,
 *   - a patient could post an arbitrary `patient_id` and book on someone
 *     else's behalf,
 *   - `status` and the time were never validated, so a crafted request could
 *     write 'completed' or a time outside the doctor's window.
 *
 * The booking identity now comes from the caller's own token rather than the
 * request body, the slot is re-validated here against the doctor's configured
 * availability, and the unique index from appointment_booking.sql closes the
 * remaining race at the database level.
 *
 * The app's own origin is also used rather than PostgREST directly, for the
 * same reason as app/api/doctor-appointments: a rejected PostgREST request
 * comes back without `Access-Control-Allow-Origin`, so the browser reports a
 * CORS error and discards the real status.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_SLOT_WINDOW,
  MIN_LEAD_MINUTES,
  SLOT_STEP_MINUTES,
  fromLocalDateString,
  minutesFromTime,
  normalizeDay,
  normalizeTime,
  sameDay,
  toLocalDateString,
  weekdayForDate,
} from "./doctorSlots";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isBookingConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";

/** Machine-readable failure reasons the client can branch on. */
export type BookingErrorCode =
  | "not_configured"
  | "unauthorized"
  | "invalid_body"
  | "invalid_doctor"
  | "invalid_date"
  | "invalid_time"
  | "doctor_closed"
  | "slot_unavailable"
  | "slot_taken"
  | "lead_time"
  | "conflict"
  | "not_found"
  | "already_cancelled"
  | "upstream";

export interface BookingFailure {
  ok: false;
  code: BookingErrorCode;
  message: string;
  status: number;
}

export interface BookingSuccess {
  ok: true;
  appointment: {
    id: string;
    doctor_id: string;
    patient_id: string;
    appointment_date: string;
    appointment_time: string;
    status: AppointmentStatus;
  };
}

export type BookingResult = BookingSuccess | BookingFailure;

export function failure(
  code: BookingErrorCode,
  message: string,
  status: number
): BookingFailure {
  return { ok: false, code, message, status };
}

interface AvailabilityRow {
  day_of_week?: unknown;
  day?: unknown;
  weekday?: unknown;
  start_time?: unknown;
  start?: unknown;
  from?: unknown;
  end_time?: unknown;
  end?: unknown;
  to?: unknown;
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function firstText(row: AvailabilityRow, keys: (keyof AvailabilityRow)[]): string {
  for (const key of keys) {
    const text = asText(row[key]).trim();
    if (text) return text;
  }
  return "";
}

interface Window {
  start: string;
  end: string;
}

interface DailyWindow extends Window {
  weekday: string;
}

/**
 * The doctor's window for `weekday`, or null when they do not consult then.
 *
 * Mirrors `resolveWindow` in doctorSlots.ts: with no schedule configured at all
 * a doctor stays bookable on the default window, and once they have configured
 * days, unlisted weekdays are closed.
 */
function resolveWindow(
  windows: readonly DailyWindow[],
  weekday: string
): Window | null {
  if (windows.length === 0) return { ...DEFAULT_SLOT_WINDOW };
  return windows.find((w) => w.weekday === weekday) ?? null;
}

/** Reads a doctor's configured weekly schedule. */
async function fetchWindows(
  supabase: SupabaseClient,
  doctorId: string
): Promise<DailyWindow[]> {
  const { data, error } = await supabase
    .from("doctor_availability")
    .select("*")
    .eq("doctor_id", doctorId);

  if (error || !Array.isArray(data)) return [];

  return (data as AvailabilityRow[])
    .map((row) => ({
      weekday: normalizeDay(firstText(row, ["day_of_week", "day", "weekday"])),
      start: normalizeTime(
        firstText(row, ["start_time", "start", "from"]),
        DEFAULT_SLOT_WINDOW.start
      ),
      end: normalizeTime(
        firstText(row, ["end_time", "end", "to"]),
        DEFAULT_SLOT_WINDOW.end
      ),
    }))
    .filter((entry) => entry.weekday.length > 0);
}

/**
 * A Supabase client that acts as `accessToken`'s owner, so RLS applies as the
 * signed-in user rather than as the anonymous key.
 */
export function clientForToken(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The caller's own user id, taken from their token and never from the body. */
export function userIdFromToken(accessToken: string): string | undefined {
  try {
    const segment = accessToken.split(".")[1];
    if (!segment) return undefined;
    const payload = JSON.parse(
      Buffer.from(segment, "base64url").toString("utf8")
    ) as { sub?: string };
    return typeof payload.sub === "string" && payload.sub ? payload.sub : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The caller's display name, read from their own token.
 *
 * Copied onto the appointment row at booking time so the doctor can see who
 * booked without depending on a `public.patients` profile row - nothing in the
 * app creates one, and the RLS policy on that table matches `patients.id` only,
 * so a lookup there returns nothing for a real signup.
 *
 * Falls back to the email local-part when `name` is absent, which happens for
 * accounts created outside the signup form.
 */
export function patientNameFromToken(accessToken: string): string | undefined {
  try {
    const segment = accessToken.split(".")[1];
    if (!segment) return undefined;
    const payload = JSON.parse(
      Buffer.from(segment, "base64url").toString("utf8")
    ) as {
      user_metadata?: { name?: unknown; full_name?: unknown } | null;
      email?: unknown;
    };

    const meta = payload.user_metadata ?? {};

    for (const candidate of [meta.name, meta.full_name]) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim().slice(0, 120);
      }
    }

    if (typeof payload.email === "string" && payload.email.trim()) {
      return payload.email.trim().split("@")[0].slice(0, 120);
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function readAccessToken(request: Request): string {
  return (request.headers.get("authorization") ?? "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface ValidatedRequest {
  doctorId: string;
  date: string;
  time: string;
  notes: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates the request body in isolation from the database.
 *
 * A `date`/`time` pair is only checked for shape here; whether the slot is
 * actually bookable is decided against the doctor's schedule further down.
 */
export function validateBookingBody(
  body: unknown
): { ok: true; value: ValidatedRequest } | BookingFailure {
  if (!body || typeof body !== "object") {
    return failure("invalid_body", "A booking request body is required.", 400);
  }

  const input = body as Record<string, unknown>;

  const doctorId = typeof input.doctorId === "string" ? input.doctorId.trim() : "";
  if (!UUID_PATTERN.test(doctorId)) {
    return failure("invalid_doctor", "A valid doctor must be selected.", 400);
  }

  const date = typeof input.date === "string" ? input.date.trim() : "";
  if (!DATE_PATTERN.test(date)) {
    return failure("invalid_date", "A valid appointment date is required.", 400);
  }

  // Accepts "14:30" and "14:30:00"; the column is stored as a time string and
  // existing rows use both, so both are normalised to the same "HH:MM:SS".
  const rawTime = typeof input.time === "string" ? input.time.trim() : "";
  const time = normalizeTime(rawTime, "");
  if (!TIME_PATTERN.test(time)) {
    return failure("invalid_time", "A valid appointment time is required.", 400);
  }

  const rawNotes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (rawNotes.length > 2000) {
    return failure("invalid_body", "Notes must be 2000 characters or fewer.", 400);
  }

  return {
    ok: true,
    value: {
      doctorId,
      date,
      time: `${time}:00`,
      notes: rawNotes.length > 0 ? rawNotes : null,
    },
  };
}

/**
 * True when a failure is PostgREST reporting the helper function is absent,
 * which means supabase/appointment_booking.sql has not been applied yet.
 */
function errorIsMissingRpc(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "PGRST202" ||
    /could not find the function|no matches were found in the schema cache|schema cache/i.test(
      message
    )
  );
}

/**
 * Confirms the requested slot is genuinely bookable.
 *
 * Re-checked here rather than trusted from the client: the wizard hides slots
 * that are taken, but that is presentation, not enforcement.
 */
async function checkSlotIsBookable(
  supabase: SupabaseClient,
  { doctorId, date, time }: ValidatedRequest,
  excludeAppointmentId?: string,
  now: Date = new Date()
): Promise<BookingFailure | null> {
  const parsed = fromLocalDateString(date);
  if (Number.isNaN(parsed.getTime())) {
    return failure("invalid_date", "A valid appointment date is required.", 400);
  }

  if (toLocalDateString(parsed) !== date) {
    return failure("invalid_date", "A valid appointment date is required.", 400);
  }

  const today = toLocalDateString(now);
  if (date < today) {
    return failure("invalid_date", "Appointments cannot be booked in the past.", 400);
  }

  const weekday = weekdayForDate(parsed);
  const windows = await fetchWindows(supabase, doctorId);
  const window = resolveWindow(windows, weekday);

  if (!window) {
    return failure(
      "doctor_closed",
      "The doctor does not consult on that day. Please choose another date.",
      409
    );
  }

  const start = minutesFromTime(window.start);
  const end = minutesFromTime(window.end);
  const requested = minutesFromTime(time);

  if (requested < start || requested >= end) {
    return failure(
      "slot_unavailable",
      "That time is outside the doctor's consulting hours.",
      409
    );
  }

  if ((requested - start) % SLOT_STEP_MINUTES !== 0) {
    return failure(
      "slot_unavailable",
      "That time is not a valid appointment slot.",
      409
    );
  }

  if (sameDay(parsed, now) && requested < now.getHours() * 60 + now.getMinutes() + MIN_LEAD_MINUTES) {
    return failure(
      "lead_time",
      "Please choose a time at least 30 minutes from now.",
      409
    );
  }

  // A patient cannot SELECT other patients' bookings, so the conflict check
  // goes through the SECURITY DEFINER helper from appointment_booking.sql,
  // which returns only a boolean. Without it the check silently reads "free".
  const { data: taken, error: conflictError } = await supabase.rpc(
    "appointment_slot_is_taken",
    {
      p_doctor_id: doctorId,
      p_date: date,
      p_time: time,
      p_exclude_id: excludeAppointmentId ?? null,
    }
  );

  if (conflictError) {
    // Failing closed is deliberate. The only alternative to this check is
    // reading `appointments` directly, and a patient cannot see other patients'
    // bookings, so that check would always answer "free" and silently allow
    // double-bookings. Refusing to book without a trustworthy conflict answer is
    // the safe failure.
    if (errorIsMissingRpc(conflictError)) {
      return failure(
        "upstream",
        "Booking is unavailable because the database is missing the slot check. " +
          "Run supabase/appointment_booking.sql in the Supabase SQL editor, then " +
          "reload the Supabase API schema cache.",
        503
      );
    }

    return failure(
      "upstream",
      `Could not verify slot availability: ${conflictError.message}`,
      503
    );
  }

  if (taken === true) {
    return failure(
      "slot_taken",
      "That time slot has just been booked. Please choose another time.",
      409
    );
  }

  return null;
}

/**
 * True when a failure is PostgREST reporting the `patient_name` column is absent,
 * which means supabase/appointment_patient_name.sql has not been applied yet.
 */
function errorIsMissingPatientName(error: {
  code?: string;
  message?: string;
}): boolean {
  const code = error.code ?? "";
  const message = error.message ?? "";

  return (
    code === "PGRST204" ||
    code === "42703" ||
    /could not find the 'patient_name' column|column patient_name/i.test(message)
  );
}

const INSERT_RETURN_COLUMNS =
  "id, doctor_id, patient_id, appointment_date, appointment_time, status";

/**
 * Inserts the booking, retrying without `patient_name` if that column is absent.
 *
 * The column is what lets the doctor dashboard show who booked, but it only
 * exists once supabase/appointment_patient_name.sql has been pasted into the SQL
 * editor. Selecting it unconditionally would make *every* booking fail with
 * PGRST204 until the migration is applied, so the write degrades to the old
 * behaviour instead - booking still succeeds, the name just resolves from the
 * profile fallback at read time.
 */
async function insertAppointment(
  supabase: SupabaseClient,
  row: Record<string, unknown>
) {
  const first = await supabase
    .from("appointments")
    .insert(row)
    .select(INSERT_RETURN_COLUMNS)
    .single();

  if (!first.error || !("patient_name" in row) || !errorIsMissingPatientName(first.error)) {
    return first;
  }

  const rest = { ...row };
  delete rest.patient_name;

  return supabase.from("appointments").insert(rest).select(INSERT_RETURN_COLUMNS).single();
}

/**
 * Books an appointment for the caller's own account.
 *
 * `patientId` is always the token's subject, so a request cannot book on
 * someone else's behalf. Returns the created row, or a typed failure the client
 * can act on.
 */
export async function bookAppointment(
  supabase: SupabaseClient,
  patientId: string,
  request: ValidatedRequest,
  patientName?: string
): Promise<BookingResult> {
  const slotError = await checkSlotIsBookable(supabase, request);
  if (slotError) return slotError;

  const inserted = await insertAppointment(supabase, {
    patient_id: patientId,
    doctor_id: request.doctorId,
    appointment_date: request.date,
    appointment_time: request.time,
    status: "pending",
    notes: request.notes,
    ...(patientName ? { patient_name: patientName } : {}),
  });

  const { data, error } = inserted;

  if (error) {
    // 23505 is the partial unique index: a concurrent booking won the race
    // after the check above. Same user-visible outcome, different cause.
    if (error.code === "23505" || /duplicate key|already exists/i.test(error.message)) {
      return failure(
        "slot_taken",
        "That time slot has just been booked. Please choose another time.",
        409
      );
    }

    if (/row-level security|42501/i.test(error.message)) {
      return failure(
        "conflict",
        "You are not allowed to book this appointment. Please sign in again.",
        403
      );
    }

    return failure("upstream", `Could not book the appointment: ${error.message}`, 502);
  }

  if (!data) {
    // RLS rejects a write by returning no row and no error, so an empty result
    // means the insert was blocked rather than lost.
    return failure(
      "conflict",
      "The booking was not saved. Please sign in again and retry.",
      403
    );
  }

  const row = data as {
    id: string;
    doctor_id: string;
    patient_id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
  };

  return {
    ok: true,
    appointment: {
      id: row.id,
      doctor_id: row.doctor_id,
      patient_id: row.patient_id,
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      status: (row.status as AppointmentStatus) ?? "pending",
    },
  };
}

export interface RescheduleRequest {
  date: string;
  time: string;
  notes?: string | null;
}

export type RescheduleResult = BookingResult | { ok: false; code: "not_found"; message: string; status: number };

/**
 * Moves an existing appointment to a new slot.
 *
 * Validates availability and conflicts the same way booking does, and excludes
 * the appointment itself so re-picking its current slot is not treated as a
 * conflict with itself.
 */
export async function rescheduleAppointment(
  supabase: SupabaseClient,
  appointmentId: string,
  request: RescheduleRequest
): Promise<RescheduleResult> {
  const { data: current, error: readError } = await supabase
    .from("appointments")
    .select("id, doctor_id, status, notes")
    .eq("id", appointmentId)
    .maybeSingle();

  if (readError) {
    return failure("upstream", `Could not load the appointment: ${readError.message}`, 502);
  }

  // RLS hides other patients' rows, so "not found" also covers "not yours".
  if (!current) {
    return failure("not_found", "Appointment not found.", 404);
  }

  const existing = current as {
    id: string;
    doctor_id: string;
    status: string;
    notes: string | null;
  };

  if (existing.status === "cancelled") {
    return failure(
      "conflict",
      "A cancelled appointment cannot be rescheduled. Please book a new one.",
      409
    );
  }

  const validated = validateBookingBody({
    doctorId: existing.doctor_id,
    date: request.date,
    time: request.time,
    notes: request.notes ?? existing.notes,
  });

  if (!validated.ok) return validated;

  const slotError = await checkSlotIsBookable(
    supabase,
    validated.value,
    appointmentId
  );
  if (slotError) return slotError;

  const { data, error } = await supabase
    .from("appointments")
    .update({
      appointment_date: validated.value.date,
      appointment_time: validated.value.time,
      notes: validated.value.notes,
    })
    .eq("id", appointmentId)
    .select("id, doctor_id, patient_id, appointment_date, appointment_time, status")
    .maybeSingle();

  if (error) {
    if (error.code === "23505" || /duplicate key|already exists/i.test(error.message)) {
      return failure(
        "slot_taken",
        "That time slot has just been booked. Please choose another time.",
        409
      );
    }
    return failure("upstream", `Could not reschedule: ${error.message}`, 502);
  }

  if (!data) {
    return failure("conflict", "The reschedule was not saved. Please try again.", 403);
  }

  const row = data as {
    id: string;
    doctor_id: string;
    patient_id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
  };

  return {
    ok: true,
    appointment: {
      id: row.id,
      doctor_id: row.doctor_id,
      patient_id: row.patient_id,
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      status: (row.status as AppointmentStatus) ?? "pending",
    },
  };
}

/**
 * Cancels an appointment.
 *
 * A cancelled slot is released for rebooking, which the partial unique index
 * allows. Respects a `currentStatus`/`nextStatus` pair so cancelling an
 * already-cancelled appointment is not reported as a change.
 */
export async function cancelAppointment(
  supabase: SupabaseClient,
  appointmentId: string
): Promise<BookingResult | { ok: false; code: "not_found" | "already_cancelled"; message: string; status: number }> {
  const { data: current, error: readError } = await supabase
    .from("appointments")
    .select("id, doctor_id, status")
    .eq("id", appointmentId)
    .maybeSingle();

  if (readError) {
    return failure("upstream", `Could not load the appointment: ${readError.message}`, 502);
  }

  if (!current) {
    return failure("not_found", "Appointment not found.", 404);
  }

  const existing = current as { id: string; doctor_id: string; status: string };

  if (existing.status === "cancelled") {
    return failure("already_cancelled", "This appointment is already cancelled.", 409);
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .select("id, doctor_id, patient_id, appointment_date, appointment_time, status")
    .maybeSingle();

  if (error) {
    return failure("upstream", `Could not cancel: ${error.message}`, 502);
  }

  if (!data) {
    return failure("conflict", "The cancellation was not saved. Please try again.", 403);
  }

  const row = data as {
    id: string;
    doctor_id: string;
    patient_id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
  };

  return {
    ok: true,
    appointment: {
      id: row.id,
      doctor_id: row.doctor_id,
      patient_id: row.patient_id,
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      status: "cancelled",
    },
  };
}
