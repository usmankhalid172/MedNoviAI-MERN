"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Appointment } from "@/types/appointment";
import AppointmentCard from "@/components/appointments/AppointmentCard";
import AppointmentSkeleton from "@/components/appointments/AppointmentSkeleton";
import EmptyAppointments from "@/components/appointments/EmptyAppointments";
import CancelModal from "@/components/appointments/CancelModal";
import RescheduleModal from "@/components/appointments/RescheduleModal";
import Navbar from "@/components/shared/Navbar";
import Link from "next/link";

type Tab = "upcoming" | "past";

type AppointmentRow = Appointment & {
  doctor_id: string | null;
};

type DoctorRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  specialty: string | null;
};

function getSpecialtyName(doctor: DoctorRow) {
  return doctor.specialty ?? "General";
}

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
  const { user, isLoggedIn, isInitializing } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    if (isInitializing) return;

    let isMounted = true;

    const load = async () => {
      // ── 1. Make sure Supabase is configured ──
      if (!supabase) {
        if (isMounted) {
          setError("Supabase is not configured. Check .env.local");
          setLoading(false);
        }
        return;
      }

      // ── 2. Get the user from Supabase Auth directly (fallback to useAuth) ──
      let userId = user?.id;

      if (!userId) {
        const { data: authData } = await supabase.auth.getUser();
        userId = authData?.user?.id;
      }

      if (!userId) {
        if (isMounted) {
          setError("Please login to view your appointments");
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }

        // ── 3. Fetch appointments for this patient ──
        const { data, error: fetchError } = await supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", userId)
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false });

        if (fetchError) throw fetchError;

        const appointmentRows = (data ?? []) as AppointmentRow[];

        // ── 4. Fetch linked doctors ──
        const doctorIds = [
          ...new Set(
            appointmentRows
              .map((appointment) => appointment.doctor_id)
              .filter((id): id is string => Boolean(id))
          ),
        ];

        let doctorById = new Map<string, DoctorRow>();

        if (doctorIds.length > 0) {
          const { data: doctors, error: doctorsError } = await supabase
            .from("doctors")
            .select("id, full_name, avatar_url, specialty")
            .in("id", doctorIds);

          if (doctorsError) throw doctorsError;

          doctorById = new Map(
            ((doctors ?? []) as DoctorRow[]).map((doctor) => [doctor.id, doctor])
          );
        }

        // ── 5. Format and store ──
        const formattedAppointments: Appointment[] = appointmentRows.map(
          (appointment) => {
            const doctor = appointment.doctor_id
              ? doctorById.get(appointment.doctor_id)
              : undefined;

            return {
              ...appointment,
              doctor: doctor
                ? {
                    id: doctor.id,
                    full_name: doctor.full_name ?? undefined,
                    avatar_url: doctor.avatar_url ?? undefined,
                    specialty: getSpecialtyName(doctor),
                  }
                : null,
            };
          }
        );

        if (isMounted) {
          setAppointments(formattedAppointments);
        }
      } catch (err: unknown) {
        console.error("Appointments fetch error:", err);
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : "Failed to load appointments";
          setError(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, user?.id, isInitializing]);

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
    window.location.reload();
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-500 text-slate-200 transition-colors hover:bg-blue-700 hover:text-white px-4"
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