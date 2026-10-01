/**
 * Browser client for the appointment API.
 *
 * The booking flow used to insert into `appointments` directly from the page,
 * which meant the guarantees around it were suggestions the client could
 * ignore: the duplicate-slot check and the insert were separate requests, and
 * `patient_id`, `status` and the time were never validated. Booking now goes
 * through the app's own origin, where the slot is re-validated server-side and
 * `patient_id` is taken from the caller's token.
 *
 * A same-origin call also avoids a misleading failure mode: a rejected PostgREST
 * request comes back without `Access-Control-Allow-Origin`, so the browser
 * reports "blocked by CORS policy" and discards the real status code.
 */

import { supabase } from "@/lib/supabase";
import type { AppointmentStatus } from "@/lib/appointmentsApi";

export type { AppointmentStatus };

export type AppointmentErrorCode =
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
  | "forbidden"
  | "invalid_action"
  | "invalid_status"
  | "not_found"
  | "already_cancelled"
  | "upstream"
  | "network";

export interface AppointmentRecord {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  doctor?: {
    id: string;
    full_name: string | null;
    specialty: string | null;
    avatar_url: string | null;
  } | null;
  patient?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface BookAppointmentInput {
  doctorId: string;
  date: string;
  /** "HH:MM" or "HH:MM:SS", in the doctor's local time. */
  time: string;
  notes?: string | null;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AppointmentErrorCode; message: string; status: number };

const DEFAULT_TIMEOUT_MS = 15000;

/** Human-facing copy for each failure code. */
const MESSAGES: Record<AppointmentErrorCode, string> = {
  not_configured: "Booking is not available right now. Please try again later.",
  unauthorized: "Your session has expired. Please sign in again.",
  invalid_body: "The booking request was incomplete. Please try again.",
  invalid_doctor: "Please choose a doctor to book with.",
  invalid_date: "Please choose a valid appointment date.",
  invalid_time: "Please choose a valid appointment time.",
  doctor_closed: "The doctor does not consult on that day.",
  slot_unavailable: "That time is not available. Please choose another slot.",
  slot_taken: "That time slot has just been booked. Please choose another time.",
  lead_time: "Please choose a time at least 30 minutes from now.",
  conflict: "That change could not be saved. Please try again.",
  forbidden: "You are not allowed to do that.",
  invalid_action: "That action is not supported.",
  invalid_status: "That status is not valid.",
  not_found: "Appointment not found.",
  already_cancelled: "This appointment is already cancelled.",
  upstream: "Something went wrong on our side. Please try again.",
  network: "Network error. Please check your internet connection.",
};

function messageFor(code: AppointmentErrorCode, fallback?: string): string {
  return fallback?.trim() || MESSAGES[code] || MESSAGES.upstream;
}

/**
 * A PostgREST error carries no HTTP status, so network faults are matched on
 * the message. These are all worth retrying; a rejected claim is not.
 */
function isTransientNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|failed to fetch|network|load failed|timeout/i.test(message);
}

async function callApi<T>(
  path: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<ApiResult<T>> {
  let token: string | undefined;

  try {
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    token = data.session?.access_token;
  } catch {
    token = undefined;
  }

  if (!token) {
    return { ok: false, code: "unauthorized", message: MESSAGES.unauthorized, status: 401 };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      ...init,
      signal: controller.signal,
      // Appointment lists must never be served from a stale cache: a booking made
      // moments ago would be missing from the history the user just navigated to.
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; code?: AppointmentErrorCode; [key: string]: unknown }
      | null;

    if (!response.ok) {
      const code = payload?.code ?? "upstream";
      return {
        ok: false,
        code,
        message: messageFor(code, payload?.error),
        status: response.status,
      };
    }

    return { ok: true, data: payload as T };
  } catch (error) {
    const aborted = controller.signal.aborted;

    return {
      ok: false,
      code: isTransientNetworkError(error) ? "network" : "upstream",
      message: aborted
        ? "The request took too long. Please check your internet connection."
        : MESSAGES.network,
      status: 0,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Books an appointment. `patient_id` is derived server-side from the token. */
export function bookAppointment(
  input: BookAppointmentInput
): Promise<ApiResult<{ appointment: AppointmentRecord }>> {
  return callApi("/api/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** The caller's own appointments, joined with doctor details. */
export function listAppointments(options?: {
  scope?: "patient" | "doctor";
  upcomingOnly?: boolean;
}): Promise<ApiResult<{ appointments: AppointmentRecord[] }>> {
  const params = new URLSearchParams();

  if (options?.scope) params.set("scope", options.scope);
  if (options?.upcomingOnly) params.set("upcoming", "1");

  const query = params.toString();

  return callApi(`/api/appointments${query ? `?${query}` : ""}`, { method: "GET" });
}

/** A single appointment, with doctor and patient details resolved. */
export function getAppointment(
  id: string
): Promise<ApiResult<{ appointment: AppointmentRecord }>> {
  return callApi(`/api/appointments/${encodeURIComponent(id)}`, { method: "GET" });
}

/** Cancels an appointment and releases its slot. */
export function cancelAppointment(
  id: string
): Promise<ApiResult<{ appointment: AppointmentRecord }>> {
  return callApi(`/api/appointments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "cancel" }),
  });
}

/**
 * Moves an appointment to a new date and time.
 *
 * The API re-validates the slot against the doctor's availability and rejects a
 * conflict, which the previous free-text modal could not do.
 */
export function rescheduleAppointment(
  id: string,
  input: { date: string; time: string; notes?: string | null }
): Promise<ApiResult<{ appointment: AppointmentRecord }>> {
  return callApi(`/api/appointments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "reschedule", ...input }),
  });
}

/**
 * Sets a status. `confirmed` and `completed` are restricted to the doctor
 * server-side, so only a doctor's Approve button can produce them.
 */
export function setAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<ApiResult<{ appointment: AppointmentRecord; previousStatus: string }>> {
  return callApi(`/api/appointments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "set_status", status }),
  });
}

/**
 * Whether a failure means the requested slot is gone and the UI should send the
 * user back to the slot picker rather than showing a generic error.
 */
export function isSlotConflict(code: AppointmentErrorCode): boolean {
  return (
    code === "slot_taken" ||
    code === "slot_unavailable" ||
    code === "doctor_closed" ||
    code === "lead_time"
  );
}
