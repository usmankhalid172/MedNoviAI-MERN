"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import PageLayout from "@/components/shared/PageLayout";
import EmptyState from "@/components/shared/EmptyState";
import {
  CalendarDays,
  ChevronRight,
  Users,
  IndianRupee,
  ClipboardList,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface Appointment {
  id: string;
  patientName?: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: string;
  fee?: string;
}

function StatCardSkeleton() {
  return (
    <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-4 h-6 w-16 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Dashboard() {
  const { user, isLoggedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const doctorId = user?.id;

  useEffect(() => {
    if (!isLoggedIn) {
      toast.success("User has been logged out successfully.", {
        duration: 5000,
        className: "!bg-blue-600 !text-white !border-blue-600",
      });
    }
  }, [isLoggedIn]);

  useEffect(() => {
    let cancelled = false;

    if (!doctorId) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setError(
            "Please sign in as a doctor to view your appointment dashboard."
          );
          setLoading(false);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    async function load() {
      try {
        setLoading(true);

        const res = await api.get(`/doctors/${doctorId}/appointments`);

        if (!cancelled) {
          const data =
            res.data?.appointments || res.data?.data || res.data;

          setAppointments(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Could not load your appointment schedule. Please try again."
          );

          toast.error("Could not load your appointment schedule.", {
            duration: 5000,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const patientsServed = new Set(
    appointments
      .map((a) => a.patientName || "Patient")
      .filter(Boolean)
  ).size;

  const ongoing = appointments.filter(
    (a) => a.status?.toLowerCase() === "scheduled"
  ).length;

  const revenue = appointments.reduce(
    (sum, a) => sum + (parseFloat(a.fee || "500") || 0),
    0
  );

  const stats = [
    {
      label: "Total Appointments",
      value: appointments.length,
      icon: ClipboardList,
    },
    {
      label: "Patients Served",
      value: patientsServed,
      icon: Users,
    },
    {
      label: "Ongoing Consultations",
      value: ongoing,
      icon: CalendarDays,
    },
    {
      label: "Revenue Earned",
      value: `Rs. ${revenue}`,
      icon: IndianRupee,
    },
  ];

  return (
    <PageLayout>
      <div className="my-6">
        <div className="space-y-6">
          <section className="flex items-center justify-between gap-3">
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              &larr; Back to Login
            </Link>
          </section>

          <nav
            aria-label="Breadcrumb"
            className="text-sm text-slate-500"
          >
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link
                  href="/login"
                  className="font-semibold transition hover:text-blue-700"
                >
                  Login
                </Link>
              </li>

              <li>
                <ChevronRight className="size-3.5 text-slate-400" />
              </li>

              <li
                aria-current="page"
                className="font-semibold text-blue-600"
              >
                Doctor Dashboard
              </li>
            </ol>
          </nav>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Information of Doctor&apos;s Appointment
          </h1>

          {/* Doctor Portal Navigation */}
          <section
            aria-label="Doctor portal navigation"
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <Link
              href="/doctor/profile"
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">
                Doctor Profile
              </p>
              <p className="mt-1 text-xs text-slate-500">
                View and update your profile
              </p>
            </Link>

            <Link
              href="/doctor/availability"
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">
                Availability
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Manage your working hours and slots
              </p>
            </Link>

            <Link
              href="/doctor/appointments"
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">
                Appointments
              </p>
              <p className="mt-1 text-xs text-slate-500">
                View and manage appointments
              </p>
            </Link>
          </section>

          {loading ? (
            <section
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Dashboard loading state"
            >
              {[1, 2, 3, 4].map((item) => (
                <StatCardSkeleton key={item} />
              ))}
            </section>
          ) : error ? (
            <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </section>
          ) : (
            <section
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Practice statistics"
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      {stat.label}
                    </span>

                    <stat.icon className="size-4 text-blue-600" />
                  </div>

                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {appointments.length === 0 ? (
              <EmptyState
                title="No appointments yet"
                message="Your appointment schedule will appear here when patient bookings are connected to your practice."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-160 text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">
                        Patient
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Doctor
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Specialty
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Date &amp; Time
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((apt) => (
                      <tr
                        key={apt.id}
                        className="hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {initials(
                                apt.patientName || "Patient"
                              )}
                            </span>

                            <span className="font-semibold text-slate-800">
                              {apt.patientName || "Patient"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3 text-slate-600">
                          {apt.doctorName}
                        </td>

                        <td className="px-5 py-3 text-slate-600">
                          {apt.specialty}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {apt.date} · {apt.time}
                        </td>

                        <td className="px-5 py-3">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <CalendarDays className="size-5 shrink-0" />

            <p>
              Live mode: showing appointments fetched from your practice API.
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
