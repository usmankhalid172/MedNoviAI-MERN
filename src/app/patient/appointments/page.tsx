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
import Footer from "@/components/shared/Footer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

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
      if (!isLoggedIn || !user?.id) {
        if (isMounted) {
          setError("Please login to view your appointments");
          setLoading(false);
        }
        return;
      }

      if (!supabase) {
        if (isMounted) {
          setError("Supabase is not configured. Check .env.local");
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }

        const { data, error: fetchError } = await supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", user.id)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true });

        if (fetchError) throw fetchError;

        if (isMounted) {
          const appointmentRows = (data ?? []) as AppointmentRow[];
          const doctorIds = [
            ...new Set(
              appointmentRows
                .map((appointment) => appointment.doctor_id)
                .filter((id): id is string => Boolean(id))
            ),
          ];

          const { data: doctors, error: doctorsError } = doctorIds.length
            ? await supabase
                .from("doctors")
                .select("id, full_name, avatar_url, specialty")
                .in("id", doctorIds)
            : { data: [], error: null };

          if (doctorsError) throw doctorsError;

          const doctorById = new Map(
            ((doctors ?? []) as DoctorRow[]).map((doctor) => [doctor.id, doctor])
          );

          const formattedAppointments = appointmentRows.map((appointment) => {
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
          });

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

  const today = new Date().toISOString().split("T")[0];

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-600 animate-pulse">
          Loading appointments...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans overflow-x-hidden">
      <Navbar />
      
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          
          {/* Back Navigation Button */}
          <div>
            <Link
              href="/patient/dashboard"
              aria-label="Back to your dashboard"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Dashboard
            </Link>
          </div>

          {/* Header Description */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              My Appointments
            </h1>
            <p className="max-w-xl text-xs sm:text-sm text-slate-500">
              Review upcoming visits, manage changes, and keep track of your care history.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex w-full sm:w-fit gap-2 rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "upcoming"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-transparent text-slate-600 hover:bg-slate-100"
              }`}
            >
              Upcoming ({upcoming.length})
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "past"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-transparent text-slate-600 hover:bg-slate-100"
              }`}
            >
              Past ({past.length})
            </button>
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <AppointmentSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
              {error}
            </div>
          ) : displayed.length === 0 ? (
            <EmptyAppointments tab={activeTab} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
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
      </main>

      <Footer />

      {/* Modals */}
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
    </div>
  );
}