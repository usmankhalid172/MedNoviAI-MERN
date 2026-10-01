"use client";

import { useEffect, useState } from "react";
import { Appointment } from "@/types/appointment";
import { fromLocalDateString, loadSlotsForDate } from "@/lib/doctorSlots";
import {
  isSlotConflict,
  rescheduleAppointment,
} from "@/lib/appointmentsClient";

/** Today as a local "YYYY-MM-DD" string, for the date input's `min`. */
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "09:30 AM" -> "09:30", matching the 24-hour slots the API accepts. */
function toTwentyFourHour(displayTime: string): string {
  const [timePart, modifier] = displayTime.split(" ");
  const [hStr, mStr] = timePart.split(":");

  let hours = Number(hStr);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${mStr}`;
}

interface Props {
  appointment: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RescheduleModal({
  appointment,
  onClose,
  onSuccess,
}: Props) {
  const [date, setDate] = useState(appointment.appointment_date);
  const [time, setTime] = useState(
    appointment.appointment_time?.slice(0, 5) || "10:00"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const doctorId = appointment.doctor_id;

  /**
   * Loads the doctor's real bookable slots for `date`.
   *
   * The previous version offered a free-text time input with no validation, so
   * a patient could move an appointment to a time the doctor does not consult
   * or to a slot another patient already holds. The same slot engine the
   * booking wizard uses is reused here so the offered times always match what
   * the API will accept.
   */
  useEffect(() => {
    if (!doctorId || !date) return;

    let cancelled = false;

    async function load() {
      setSlotsLoading(true);
      setSlotsError(null);

      try {
        const result = await loadSlotsForDate(doctorId!, fromLocalDateString(date));

        if (cancelled) return;

        if (result.closed) {
          setSlots([]);
          setSlotsError("The doctor does not consult on that day.");
          return;
        }

        if (result.slots.length === 0) {
          setSlots([]);
          setSlotsError("No slots are available on that date.");
          return;
        }

        setSlots(result.slots);

        // Keep the existing selection if it is still bookable, otherwise move
        // to the first free slot rather than leaving an invalid one selected.
        setTime((current) => {
          const stillFree = result.slots.some(
            (slot) => toTwentyFourHour(slot).slice(0, 5) === current
          );
          if (stillFree) return current;
          return result.slots[0].split(" ")[0];
        });
      } catch {
        if (!cancelled) {
          setSlotsError("Could not load available times. Please try again.");
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [doctorId, date]);

  const handleReschedule = async () => {
    setLoading(true);
    setError(null);

    // Goes through /api/appointments, which re-validates the slot against the
    // doctor's availability, rejects a conflict, and keeps the appointment's
    // existing status instead of letting a patient self-confirm it.
    const result = await rescheduleAppointment(appointment.id, {
      date,
      time: `${time}:00`,
      notes: appointment.notes ?? null,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.message);

      // The chosen slot is gone; reload the grid so the offered times are current.
      if (isSlotConflict(result.code)) {
        setSlots(null);
        const refreshed = await loadSlotsForDate(
          doctorId!,
          fromLocalDateString(date)
        );
        setSlots(refreshed.slots);
      }
      return;
    }

    onSuccess();
  };

  const canSubmit = Boolean(time) && !slotsLoading && slotsError === null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-slate-900">
          Reschedule Appointment
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Currently {appointment.appointment_date} at{" "}
          {appointment.appointment_time?.slice(0, 5)}
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={getTodayLocalDate()}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Time
            </label>

            {slotsLoading ? (
              <p className="text-sm text-slate-500">Loading available times…</p>
            ) : slotsError ? (
              <p className="text-sm text-slate-500">{slotsError}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots?.map((slot) => {
                  const value = toTwentyFourHour(slot).slice(0, 5);
                  const selected = value === time;

                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(value)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                        selected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 text-slate-700 hover:border-blue-300"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleReschedule}
            disabled={loading || !canSubmit}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Confirm Reschedule"}
          </button>
        </div>
      </div>
    </div>
  );
}