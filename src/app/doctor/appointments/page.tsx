"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageLayout from "@/components/shared/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import AppointmentStatusBadge from "@/components/doctor/AppointmentStatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  setAppointmentStatus,
  type AppointmentStatus,
} from "@/lib/appointmentsClient";
import { toast } from "sonner";

interface Appointment {
  id: string;
  patientName: string;
  scheduledStart: string;
  status: string;
  durationMinutes: number;
}

type AppointmentRow = {
  id: string;
  patient_id: string | null;
  patient_name?: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: string | null;
};

type Filter = "today" | "week" | "all";

const SLOT_DURATION_MINUTES = 30;

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toDateKey(date);
  });
}

function toScheduledStart(
  date: string | null,
  time: string | null
) {
  const day = (date ?? "").slice(0, 10);

  if (!day) return "";

  const clock = (time ?? "").slice(0, 8);

  return clock ? `${day}T${clock}` : day;
}

export default function DoctorAppointmentsPage() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<Filter>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const currentUserId = user?.id;
    const client = supabase;

    if (!currentUserId || !isSupabaseConfigured || !client) {
      return;
    }

    const doctorId: string = currentUserId;
    const db = client;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        let query = db
          .from("appointments")
          .select(
            "id, patient_id, appointment_date, appointment_time, status"
          )
          .eq("doctor_id", doctorId);

        if (filter === "today") {
          query = query.eq("appointment_date", toDateKey(new Date()));
        } else if (filter === "week") {
          query = query.in("appointment_date", getWeekDates());
        }

        const { data, error: sbError } = await query
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true });

        if (cancelled) return;

        if (sbError) {
          throw new Error(sbError.message);
        }

        const rows = (data ?? []) as unknown as AppointmentRow[];

        const patientIds = Array.from(
          new Set(
            rows
              .map((row) => row.patient_id)
              .filter((id): id is string => Boolean(id))
          )
        );

        const namesByPatientId: Record<string, string> = {};

        if (patientIds.length > 0) {
          // `appointments.patient_id` holds the auth user id, but profile rows
          // in `public.patients` carry it in either `user_id` or `id` depending
          // on how they were created. Looking up only `id` left the column
          // reading "Patient" for anyone whose row was not seeded that way.
          const { data: byUserId } = await db
            .from("patients")
            .select("user_id, full_name")
            .in("user_id", patientIds);

          for (const patient of
            (byUserId ?? []) as Array<{
              user_id: string | null;
              full_name: string | null;
            }>) {
            if (patient.user_id && patient.full_name) {
              namesByPatientId[patient.user_id] = patient.full_name;
            }
          }

          const missing = patientIds.filter((id) => !namesByPatientId[id]);

          if (missing.length > 0) {
            const { data: byId } = await db
              .from("patients")
              .select("id, full_name")
              .in("id", missing);

            for (const patient of
              (byId ?? []) as Array<{
                id: string | null;
                full_name: string | null;
              }>) {
              if (patient.id && patient.full_name) {
                namesByPatientId[patient.id] = patient.full_name;
              }
            }
          }
        }

        if (cancelled) return;

        setAppointments(
          rows.map((row) => ({
            id: row.id,
            // The name stored on the booking wins; the profile lookup only covers
            // bookings made before `patient_name` existed.
            patientName:
              row.patient_name ||
              (row.patient_id
                ? namesByPatientId[row.patient_id]
                : null) ||
              "Patient",
            scheduledStart: toScheduledStart(
              row.appointment_date,
              row.appointment_time
            ),
            status: (row.status ?? "pending").toLowerCase(),
            durationMinutes: SLOT_DURATION_MINUTES,
          }))
        );
      } catch (err) {
        if (cancelled) return;

        console.error("Failed to fetch doctor appointments:", err);

        setError(
          err instanceof Error && err.message
            ? err.message
            : "Failed to load appointments. Please try again."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user?.id, filter, reloadKey]);

  /**
   * Writes the status through the app's own API rather than a direct Supabase
   * update, so the actor is read from the caller's token and row level security
   * still applies. The API also rejects the transitions a doctor is not allowed
   * to make, which a direct write would have let through silently.
   */
  const updateAppointmentStatus = async (
    appointmentId: string,
    status: string
  ) => {
    const previous = appointments;

    try {
      setUpdatingId(appointmentId);

      const result = await setAppointmentStatus(
        appointmentId,
        status as AppointmentStatus
      );

      if (!result.ok) {
        throw new Error(result.message);
      }

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.id === appointmentId
            ? { ...appointment, status }
            : appointment
        )
      );

      toast.success(`Appointment status updated to ${status}.`);
    } catch (err) {
      console.error("Failed to update appointment status:", err);

      setAppointments(previous);

      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Failed to update appointment status. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateTime: string) => {
    if (!dateTime) return "—";

    const parsed = new Date(dateTime);

    return Number.isNaN(parsed.getTime())
      ? dateTime
      : parsed.toLocaleDateString();
  };

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "—";

    const parsed = new Date(dateTime);

    return Number.isNaN(parsed.getTime())
      ? "—"
      : parsed.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
  };

  const filterButtons: { label: string; value: Filter }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "All", value: "all" },
  ];

  if (!isSupabaseConfigured || !supabase) {
    return (
      <PageLayout>
        <div className="flex min-h-75 items-center justify-center px-4 text-center">
          <p className="font-medium text-red-600">
            Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL
            and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.
          </p>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-75 items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex min-h-75 items-center justify-center">
          <div className="text-center">
            <p className="font-medium text-red-600">{error}</p>

            <button
              onClick={() =>
                setReloadKey((key) => key + 1)
              }
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="my-6 space-y-6">
        <Link
          href="/doctor/dashboard"
          className="mb-3 inline-flex items-center text-sm text-white bg-blue-500 hover:bg-blue-700 
            rounded-2xl px-4 py-2"
        >
          &larr; Back to Dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Doctor Appointments
          </h1>

          <p className="mt-1 text-muted-foreground">
            View and manage your patient appointments.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((button) => (
            <button
              key={button.value}
              type="button"
              onClick={() => setFilter(button.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filter === button.value
                  ? "bg-blue-600 text-white"
                  : "border bg-card text-foreground hover:bg-muted"
                }`}
            >
              {button.label}
            </button>
          ))}
        </div>

        {/* Appointments Table */}
        {appointments.length === 0 ? (
          <EmptyState
            title="No Appointments Found"
            message={
              filter === "today"
                ? "There are no appointments scheduled for today."
                : filter === "week"
                  ? "There are no appointments scheduled for this week."
                  : "You have no appointments on record yet."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left font-semibold">
                    Patient
                  </th>

                  <th className="p-4 text-left font-semibold">
                    Date
                  </th>

                  <th className="p-4 text-left font-semibold">
                    Time
                  </th>

                  <th className="p-4 text-left font-semibold">
                    Status
                  </th>

                  <th className="p-4 text-left font-semibold">
                    Update Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {appointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="border-b last:border-b-0 hover:bg-muted/30"
                  >
                    {/* Patient */}
                    <td className="p-4 font-medium">
                      <Link
                        href={`/doctor/appointments/${appointment.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {appointment.patientName}
                      </Link>
                    </td>

                    {/* Date */}
                    <td className="p-4">
                      {formatDate(appointment.scheduledStart)}
                    </td>

                    {/* Time */}
                    <td className="p-4">
                      {formatTime(appointment.scheduledStart)}
                    </td>

                    {/* Current Status */}
                    <td className="p-4">
                      <AppointmentStatusBadge
                        status={appointment.status}
                      />
                    </td>

                    {/* Status Update */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={
                            STATUS_OPTIONS.some(
                              (option) =>
                                option.value === appointment.status
                            )
                              ? appointment.status
                              : ""
                          }
                          disabled={updatingId === appointment.id}
                          onChange={(event) => {
                            if (!event.target.value) return;

                            updateAppointmentStatus(
                              appointment.id,
                              event.target.value
                            );
                          }}
                          className="rounded-lg border bg-background px-3 py-2 text-sm"
                        >
                          <option value="" disabled>
                            Select status
                          </option>

                          {STATUS_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>

                        {updatingId === appointment.id && (
                          <span className="text-xs text-muted-foreground">
                            Updating...
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
