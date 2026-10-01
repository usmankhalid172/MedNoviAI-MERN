/**
 * Single source of truth for doctor availability and bookable time slots.
 *
 * Both the public profile (components/doctors/DoctorProfileView.tsx) and the
 * booking wizard (app/appointment/book/page.tsx) render slots, and they used
 * to disagree:
 *
 *   - the profile read `doctor_availability` in 30-minute steps,
 *   - the wizard regex-parsed the free-text `doctors.availability` column,
 *     hardcoded 09:00-17:00, and never read `doctor_availability` at all.
 *
 * So the availability a doctor configures had no effect on the wizard. Both
 * now go through this module.
 *
 * Semantics: `doctor_availability` is authoritative. If a doctor has no rows
 * at all we fall back to a default consultation window so they stay
 * bookable; once they have configured days, unlisted weekdays are closed.
 */

import { supabase } from "@/lib/supabase";

export const WEEK_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export const SUN_FIRST_WEEK_DAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export const DEFAULT_SLOT_WINDOW = { start: "09:00", end: "17:00" };
export const SLOT_STEP_MINUTES = 30;

/** Lead time before a slot stops being offered for today. */
export const MIN_LEAD_MINUTES = 30;

export type Row = Record<string, unknown>;

export interface AvailabilityWindow {
  day: string;
  start: string;
  end: string;
}

export interface SlotOptions {
  /** Booked slots, as "HH:MM" 24-hour strings. */
  booked?: ReadonlySet<string>;
  /** Injectable clock, for tests. */
  now?: Date;
  /** Date the slots are being generated for. */
  selectedDate?: Date;
}

const AVAILABILITY_FIELDS = {
  day: ["day_of_week", "day", "weekday"],
  start: ["start_time", "start", "from", "opening_time"],
  end: ["end_time", "end", "to", "closing_time"],
};

function pickText(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

/** Accepts "9:00", "09:00", "9:00 AM" and returns "09:00". */
export function normalizeTime(
  value: string | null | undefined,
  fallback: string
): string {
  const match =
    typeof value === "string" ? value.match(/(\d{1,2}):(\d{2})/) : null;
  if (!match) return fallback;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallback;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function normalizeDay(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  const short = value.trim().slice(0, 3).toLowerCase();
  return (
    SUN_FIRST_WEEK_DAYS.find((day) => day.toLowerCase() === short) ?? ""
  );
}

export function minutesFromTime(time: string): number {
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function timeFromMinutes(total: number): string {
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "09:30" -> "9:30 AM". */
export function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  let hours = Number(hStr);
  const modifier = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${mStr} ${modifier}`;
}

/** Local-time "YYYY-MM-DD" (never UTC, or dates shift across timezones). */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Mon", "Tue", ... for a Date, in local time. */
export function weekdayForDate(date: Date): string {
  return SUN_FIRST_WEEK_DAYS[date.getDay()];
}

/** Parses "YYYY-MM-DD" as a local-midnight Date (not UTC). */
export function fromLocalDateString(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

/**
 * The window a doctor consults on `weekday`, or null when they are closed.
 * Only falls back to the default window when no schedule is configured at all.
 */
export function resolveWindow(
  hours: readonly AvailabilityWindow[],
  weekday: string
): AvailabilityWindow | null {
  if (hours.length === 0) {
    return { day: weekday, ...DEFAULT_SLOT_WINDOW };
  }
  return hours.find((entry) => entry.day === weekday) ?? null;
}

/** Weekdays the doctor actually consults on, in week order. */
export function availableWeekdays(
  hours: readonly AvailabilityWindow[]
): string[] {
  if (hours.length === 0) return [...WEEK_DAYS];
  return SUN_FIRST_WEEK_DAYS.filter((day) =>
    hours.some((entry) => entry.day === day)
  );
}

/**
 * Bookable "HH:MM" slots inside `window`, minus already-booked times and
 * minus anything too close to `now` to still be actionable.
 */
export function buildSlotTimes(
  window: AvailabilityWindow,
  { booked = new Set<string>(), now = new Date(), selectedDate }: SlotOptions = {}
): string[] {
  const start = minutesFromTime(window.start);
  const end = minutesFromTime(window.end);
  if (end <= start) return [];

  const isToday = selectedDate ? sameDay(selectedDate, now) : false;
  const earliest = now.getHours() * 60 + now.getMinutes() + MIN_LEAD_MINUTES;

  const slots: string[] = [];
  for (let minutes = start; minutes < end; minutes += SLOT_STEP_MINUTES) {
    if (isToday && minutes <= earliest) continue;

    const time = timeFromMinutes(minutes);
    if (booked.has(time)) continue;

    slots.push(time);
  }
  return slots;
}

/** Same as buildSlotTimes but display-formatted ("09:30 AM"). */
export function buildAvailableSlots(
  window: AvailabilityWindow,
  options: SlotOptions = {}
): string[] {
  return buildSlotTimes(window, options).map(formatTime);
}

/** Reads a doctor's configured weekly schedule. */
export async function fetchDoctorAvailability(
  doctorId: string
): Promise<AvailabilityWindow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("doctor_availability")
    .select("*")
    .eq("doctor_id", doctorId);

  if (error || !Array.isArray(data)) return [];

  return (data as Row[])
    .map((row) => ({
      day: normalizeDay(pickText(row, AVAILABILITY_FIELDS.day)),
      start: normalizeTime(
        pickText(row, AVAILABILITY_FIELDS.start),
        DEFAULT_SLOT_WINDOW.start
      ),
      end: normalizeTime(
        pickText(row, AVAILABILITY_FIELDS.end),
        DEFAULT_SLOT_WINDOW.end
      ),
    }))
    .filter((entry) => entry.day.length > 0);
}

/** Slots already taken for a doctor on a date, as "HH:MM" 24-hour strings. */
export async function fetchBookedTimes(
  doctorId: string,
  dateString: string
): Promise<Set<string>> {
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from("appointments")
    .select("appointment_time")
    .eq("doctor_id", doctorId)
    .eq("appointment_date", dateString)
    .in("status", ["pending", "confirmed"]);

  if (error || !Array.isArray(data)) return new Set();

  return new Set(
    (data as Row[])
      .map((row) =>
        normalizeTime(pickText(row, ["appointment_time", "time"]), "")
      )
      .filter(Boolean)
  );
}

/** Full slot pipeline for a doctor on a given date. */
export async function loadSlotsForDate(
  doctorId: string,
  selectedDate: Date
): Promise<{ closed: boolean; slots: string[] }> {
  const hours = await fetchDoctorAvailability(doctorId);
  const window = resolveWindow(hours, weekdayForDate(selectedDate));
  if (!window) return { closed: true, slots: [] };

  const booked = await fetchBookedTimes(
    doctorId,
    toLocalDateString(selectedDate)
  );

  return {
    closed: false,
    slots: buildAvailableSlots(window, { booked, selectedDate }),
  };
}
