"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Appointment } from "@/types/appointment";
import { listAppointments } from "@/lib/appointmentsClient";
import AppointmentCard from "@/components/appointments/AppointmentCard";
import AppointmentSkeleton from "@/components/appointments/AppointmentSkeleton";
import EmptyAppointments from "@/components/appointments/EmptyAppointments";
import CancelModal from "@/components/appointments/CancelModal";
import RescheduleModal from "@/components/appointments/RescheduleModal";
import Navbar from "@/components/shared/Navbar";
import Link from "next/link";

type Tab = "upcoming" | "past";

/**
 * Returns today's date in YYYY-MM-DD using LOCAL time, not UTC.
 * This avoids the timezone bug where a late-night booking
 * gets classified as "past" because UTC is already tomorrow.
 */
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AppointmentsPage() {
  const { isInitializing } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);

  // Bumped after a cancel or reschedule so the list refetches. This used to be
  // window.location.reload(), which discarded the whole page and lost the active
  // tab and scroll position.
  const [refreshKey, setRefreshKey] = useState(0);

  // Guards against a state update after the page unmounts. The fetch is fired
  // from window/document listeners, so it can resolve after navigation.
  const mountedRef = useRef(true);

  /**
   * Reloads the list from the API.
   *
   * `silent` is used for the focus/visibility refetch: it replaces the rows in
   * place instead of flipping `loading`, so a booking made elsewhere appears
   * without the whole list collapsing into skeletons and back.
   */
  const fetchAppointments = async (silent = false) => {
    if (!mountedRef.current) return;

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    const result = await listAppointments({ scope: "patient" });

    if (!mountedRef.current) return;

    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }

    setAppointments(
      result.data.appointments.map(
        (row): Appointment => ({
          id: row.id,
          patient_id: row.patient_id,
          doctor_id: row.doctor_id,
          appointment_date: row.appointment_date,
          appointment_time: row.appointment_time,
          status: row.status,
          notes: row.notes,
          created_at: row.created_at,
          doctor: row.doctor
            ? {
                id: row.doctor.id,
                full_name: row.doctor.full_name ?? undefined,
                avatar_url: row.doctor.avatar_url ?? undefined,
                specialty: row.doctor.specialty ?? undefined,
              }
            : null,
        })
      )
    );
    setLoading(false);
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isInitializing) return;

    const load = () => {
      void fetchAppointments();
    };

    load();

    // A booking completes on a separate route, so by the time the user reaches
    // this list the appointment already exists server-side. These listeners pick
    // it up without a manual reload: "focus" covers coming back to the tab, and
    // "visibilitychange" covers returning from the confirmation page on mobile
    // where focus events are not reliably fired.
    // Both handlers pass `silent`, so the rows are swapped in place rather than
    // the list dropping back to skeletons. The listeners are wrapped rather than
    // passing `fetchAppointments` directly, because the event object would
    // otherwise arrive as the `silent` argument.
    const onFocus = () => {
      void fetchAppointments(true);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchAppointments(true);
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isInitializing, refreshKey]);

  // ── 6. Split into upcoming / past using LOCAL today (not UTC) ──
  const today = getTodayLocalDate();

  const upcoming = appointments.filter(
    (a) =>
      a.status !== "cancelled" &&
      a.status !== "completed" &&
      a.appointment_date >= today
  );

  const past = appointments.filter(
    (a) =>
      a.status === "cancelled" ||
      a.status === "completed" ||
      a.appointment_date < today
  );

  const displayed = activeTab === "upcoming" ? upcoming : past;

  const refresh = () => {
    setRefreshKey((key) => key + 1);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 py-24 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          <Link
            href="/patient/dashboard"
            aria-label="Back to your dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-500 text-white
             hover:bg-blue-700 px-4"
          >
            <span aria-hidden="true">&larr;</span> Go to Dashboard
          </Link>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              My Appointments
            </h1>
            <p className="max-w-xl text-sm text-slate-500">
              Review upcoming visits, manage changes, and keep track of your care history.
            </p>
          </div>

          <div className="flex gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === "upcoming"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === "past"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              Past ({past.length})
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <AppointmentSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600">
              {error}
            </div>
          ) : displayed.length === 0 ? (
            <EmptyAppointments tab={activeTab} />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {displayed.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  onCancel={() => setCancelId(appt.id)}
                  onReschedule={() => setRescheduleAppt(appt)}
                  showActions={activeTab === "upcoming"}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {cancelId && (
        <CancelModal
          appointmentId={cancelId}
          onClose={() => setCancelId(null)}
          onSuccess={refresh}
        />
      )}

      {rescheduleAppt && (
        <RescheduleModal
          appointment={rescheduleAppt}
          onClose={() => setRescheduleAppt(null)}
          onSuccess={refresh}
        />
      )}
    </>
  );
}