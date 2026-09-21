"use client";

import { useEffect, useState } from "react";
import PageLayout from "@/components/shared/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import Footer from "@/components/shared/Footer";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Appointment {
  id: string;
  patientName: string;
  scheduledStart: string;
  status: string;
  durationMinutes: number;
}

interface ApiResponse {
  success: boolean;
  data: Appointment[];
  message?: string;
}

type Filter = "today" | "week" | "all";

type AppointmentStatus =
  | "Confirmed"
  | "Completed"
  | "Cancelled"
  | "NoShow";

export default function DoctorAppointmentsPage() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<Filter>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user?.id) {
        setLoading(false);
        setError("Doctor information not found. Please sign in again.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        if (filter === "today") {
          const response = await api.get<ApiResponse>(
            `/api/doctors/${user.id}/appointments?date=today`
          );

          setAppointments(response.data.data || []);
          return;
        }

        if (filter === "week") {
          const today = new Date();

          const day = today.getDay();
          const mondayOffset = day === 0 ? -6 : 1 - day;

          const monday = new Date(today);
          monday.setDate(today.getDate() + mondayOffset);

          const dates: string[] = [];

          for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const dayNumber = String(date.getDate()).padStart(2, "0");

            dates.push(`${year}-${month}-${dayNumber}`);
          }

          const responses = await Promise.all(
            dates.map((date) =>
              api.get<ApiResponse>(
                `/api/doctors/${user.id}/appointments?date=${date}`
              )
            )
          );

          const weekAppointments = responses.flatMap(
            (response) => response.data.data || []
          );

          setAppointments(weekAppointments);
          return;
        }

        // "All" is not implemented because the provided API
        // documentation does not contain an endpoint for all appointments.
        setAppointments([]);
      } catch (err) {
        console.error("Failed to fetch doctor appointments:", err);
        setError("Failed to load appointments. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user?.id, filter]);

  const updateAppointmentStatus = async (
    appointmentId: string,
    status: AppointmentStatus
  ) => {
    try {
      setUpdatingId(appointmentId);

      await api.put(`/api/appointments/${appointmentId}/status`, {
        status,
      });

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
      toast.error("Failed to update appointment status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString();
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusClasses = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-700";

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      case "completed":
        return "bg-blue-100 text-blue-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      case "noshow":
        return "bg-gray-100 text-gray-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const filterButtons: { label: string; value: Filter }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "All", value: "all" },
  ];

  const statusOptions: AppointmentStatus[] = [
    "Confirmed",
    "Completed",
    "Cancelled",
    "NoShow",
  ];

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="font-medium text-red-600">{error}</p>

            <button
              onClick={() => window.location.reload()}
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
              onClick={() => setFilter(button.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === button.value
                  ? "bg-blue-600 text-white"
                  : "border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>

        {/* All Appointments */}
        {filter === "all" ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="font-medium text-foreground">
              All appointments require an API endpoint.
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              The current backend documentation does not provide an endpoint
              for fetching all doctor appointments.
            </p>
          </div>
        ) : appointments.length === 0 ? (
          /* Empty State */
          <EmptyState
            title="No Appointments Found"
            message={
              filter === "today"
                ? "There are no appointments scheduled for today."
                : "There are no appointments scheduled for this week."
            }
          />
        ) : (
          /* Appointments Table */
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
                    {/* Clickable Patient */}
                    <td className="p-4 font-medium">
                      <a
                        href={`/doctor/appointments/${appointment.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {appointment.patientName}
                      </a>
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
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                          appointment.status
                        )}`}
                      >
                        {appointment.status}
                      </span>
                    </td>

                    {/* Status Update */}
                    <td className="p-4">
                      <select
                        value={
                          statusOptions.includes(
                            appointment.status as AppointmentStatus
                          )
                            ? appointment.status
                            : ""
                        }
                        disabled={updatingId === appointment.id}
                        onChange={(event) =>
                          updateAppointmentStatus(
                            appointment.id,
                            event.target.value as AppointmentStatus
                          )
                        }
                        className="rounded-lg border bg-background px-3 py-2 text-sm"
                      >
                        <option value="" disabled>
                          Select status
                        </option>

                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      {updatingId === appointment.id && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Updating...
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
    </PageLayout>
  );
}