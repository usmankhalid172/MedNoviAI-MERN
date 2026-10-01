"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/shared/Footer";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  CalendarClock,
  MessageSquare,
  Heart,
  Activity,
  ArrowRight,
  ChevronRight,
  History,
  LogOut,
  Stethoscope,
  Menu,
  X,
  UserRound,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast, Toaster } from "sonner";
import { Appointment, AppointmentStatus } from "@/types/appointment";

// ─── Minimal local types for raw Supabase rows ───
interface AppointmentDbRow {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface DoctorDbRow {
  id: string;
  full_name: string | null;
  specialty: string | null;
  avatar_url: string | null;
}

interface PostgrestErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Returns today's date as YYYY-MM-DD in LOCAL time (not UTC).
 */
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date + time into a short readable string for the preview row.
 * Example: "Mon, Sep 28 · 9:00 AM"
 */
function formatAppointmentPreview(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time || "00:00:00"}`);
    if (isNaN(d.getTime())) return `${date} · ${time}`;

    const day = d.toLocaleDateString("en-US", { weekday: "short" });
    const monthDay = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // Format time as "9:00 AM"
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const modifier = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const timeStr = `${hours}:${minutes} ${modifier}`;

    return `${day}, ${monthDay} · ${timeStr}`;
  } catch {
    return `${date} · ${time}`;
  }
}

/**
 * How a booking reads on the patient's side.
 *
 * The doctor writes `confirmed` to approve and `cancelled` to reject, so both
 * decisions are spelled out here rather than showing the raw column value -
 * "Cancelled" on its own does not tell the patient their request was declined.
 *
 * Each entry carries two chips: `chip` for the navy gradient cards, where the
 * text has to stay light, and `chipLight` for the white approval table.
 */
const STATUS_PRESENTATION: Record<
  AppointmentStatus,
  { label: string; chip: string; chipLight: string; note: string }
> = {
  pending: {
    label: "Awaiting Approval",
    chip: "bg-amber-500/20 text-amber-100 border-amber-400/30",
    chipLight: "bg-amber-50 text-amber-700 border-amber-200",
    note: "Your doctor has not responded yet.",
  },
  confirmed: {
    label: "Approved",
    chip: "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
    chipLight: "bg-emerald-50 text-emerald-700 border-emerald-200",
    note: "Your doctor approved this appointment.",
  },
  cancelled: {
    label: "Rejected",
    chip: "bg-red-500/20 text-red-100 border-red-400/30",
    chipLight: "bg-red-50 text-red-700 border-red-200",
    note: "Your doctor declined this appointment.",
  },
  completed: {
    label: "Completed",
    chip: "bg-blue-500/20 text-blue-100 border-blue-400/30",
    chipLight: "bg-blue-50 text-blue-700 border-blue-200",
    note: "This visit has already taken place.",
  },
};

const DEFAULT_STATUS_PRESENTATION = {
  label: "Unknown",
  chip: "bg-slate-500/20 text-slate-100 border-slate-400/30",
  chipLight: "bg-slate-100 text-slate-700 border-slate-200",
  note: "This appointment has an unrecognised status.",
};

export default function PatientDashboardPage() {
  const router = useRouter();
  const { user, isInitializing, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ─── Appointments state ───
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLogout = () => {
    logout();
    toast.success("User has been logout successfully", {
      style: {
        background: "#2563eb",
        color: "#ffffff",
        border: "none",
      },
    });
    router.push("/login");
  };

  useEffect(() => {
    if (isInitializing) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const frame = window.requestAnimationFrame(() => setLoading(false));
    return () => window.cancelAnimationFrame(frame);
  }, [user, isInitializing, router]);

  // ─── Fetch patient's appointments (two-query pattern — no FK join) ───
  const userId = user?.id;
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!userId || !supabase) {
      return;
    }

    let cancelled = false;
    const silent = !firstLoadRef.current;

    async function loadAppointments() {
      try {
        if (!silent) {
          setAppointmentsLoading(true);
        }

        const { data: appointments, error: apptError } = await supabase!
          .from("appointments")
          .select("*")
          .eq("patient_id", userId)
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false });

        if (apptError) {
          console.error("Appointments query failed:", {
            message: apptError.message,
            code: apptError.code,
            details: apptError.details,
            hint: apptError.hint,
          });
          throw apptError;
        }

        const rows = (appointments || []) as AppointmentDbRow[];

        const doctorIds = [
          ...new Set(
            rows
              .map((r) => r.doctor_id)
              .filter((id): id is string => Boolean(id))
          ),
        ];

        let doctorMap = new Map<string, DoctorDbRow>();

        if (doctorIds.length > 0) {
          const { data: doctors, error: docError } = await supabase!
            .from("doctors")
            .select("id, full_name, specialty, avatar_url")
            .in("id", doctorIds);

          if (docError) {
            console.error("Doctors query failed:", {
              message: docError.message,
              code: docError.code,
            });
          } else {
            doctorMap = new Map(
              ((doctors || []) as DoctorDbRow[]).map((d) => [d.id, d])
            );
          }
        }

        const merged: Appointment[] = rows.map((r) => {
          const doctor = r.doctor_id ? doctorMap.get(r.doctor_id) : undefined;
          return {
            id: r.id,
            patient_id: r.patient_id,
            doctor_id: r.doctor_id,
            appointment_date: r.appointment_date,
            appointment_time: r.appointment_time,
            status: r.status as AppointmentStatus,
            notes: r.notes,
            created_at: r.created_at,
            doctor: doctor
              ? {
                  id: doctor.id,
                  full_name: doctor.full_name ?? undefined,
                  specialty: doctor.specialty ?? undefined,
                  avatar_url: doctor.avatar_url ?? undefined,
                }
              : null,
          };
        });

        const today = getTodayLocalDate();

        const upcoming = merged
          .filter(
            (a) =>
              a.appointment_date >= today &&
              a.status !== "cancelled" &&
              a.status !== "completed"
          )
          .slice(0, 3);

        const recent = merged
          .filter(
            (a) =>
              a.appointment_date < today ||
              a.status === "cancelled" ||
              a.status === "completed"
          )
          .slice(0, 3);

        if (!cancelled) {
          setAllAppointments(merged);
          setUpcomingAppointments(upcoming);
          setRecentAppointments(recent);
        }
      } catch (err) {
        const e = err as PostgrestErrorLike;
        console.error("Dashboard appointments fetch error:", {
          message: e?.message,
          code: e?.code,
          details: e?.details,
          hint: e?.hint,
        });
      } finally {
        if (!cancelled && !silent) {
          setAppointmentsLoading(false);
        }
      }
    }

    loadAppointments();
    firstLoadRef.current = false;

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  // ─── Pick up approve / reject decided on the doctor's dashboard ───
  useEffect(() => {
    // The doctor acts in their own session, so there is nothing to subscribe to
    // here: the dashboard re-asks whenever the patient comes back to the tab.
    // "focus" covers switching windows, and "visibilitychange" covers returning
    // from another tab or route on mobile, where focus is not reliably fired.
    // Bumping `refreshKey` re-runs the fetch effect, which then swaps the rows
    // in place instead of reloading the page.
    const refetch = () => {
      setRefreshKey((key) => key + 1);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };

    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/70 text-slate-800">
        <Toaster position="top-right" />
        <header className="sticky top-0 z-40 bg-[#173b68] px-4 sm:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-white/20 animate-pulse" />
              <div className="h-5 w-28 rounded bg-white/20 animate-pulse" />
            </div>
            <div className="h-9 w-9 rounded-xl bg-white/20 animate-pulse md:hidden" />
            <div className="hidden md:flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 animate-pulse" />
              <div className="h-9 w-40 rounded-xl bg-white/20 animate-pulse" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm animate-pulse space-y-3">
            <div className="h-7 w-52 rounded bg-slate-200" />
            <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
            <div className="h-10 w-44 rounded-xl bg-slate-200" />
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-slate-200 animate-pulse p-6 sm:p-8">
            <div className="space-y-3">
              <div className="h-4 w-32 rounded bg-slate-300/60" />
              <div className="h-6 w-72 max-w-full rounded bg-slate-300/60" />
              <div className="h-10 w-48 rounded-xl bg-slate-300/60" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm animate-pulse space-y-3"
              >
                <div className="h-3 w-20 rounded bg-slate-200" />
                <div className="h-7 w-24 rounded bg-slate-200" />
                <div className="h-4 w-14 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const userName = user?.name || "Patient";
  const firstName = userName.split(" ")[0];
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navLinks = [
    { label: "How does it work?", href: "/#how-it-works" },
    { label: "About us", href: "/#about" },
    { label: "FAQ", href: "/#faq" },
    { label: "Contact", href: "/#contact" },
  ];

  // ─── Preview data for summary cards ───
  const nextUpcoming = upcomingAppointments[0] ?? null;
  const lastRecent = recentAppointments[0] ?? null;

  /**
   * Bookings the doctor still owes an answer on.
   *
   * Surfaced separately because a rejection is written as `cancelled`, which the
   * upcoming/recent split files under history - a booking the doctor declined
   * could otherwise sink below older completed visits and look like it simply
   * never happened.
   */
  const decidedBookings = allAppointments
    .filter(
      (appointment) =>
        appointment.status === "confirmed" ||
        appointment.status === "cancelled"
    )
    .slice(0, 4);

  // ─── Waiting on the doctor ───
  const awaitingApproval = allAppointments.filter(
    (appointment) => appointment.status === "pending"
  );

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800">
      <Toaster position="top-right" />
      <header className="sticky top-0 z-40 bg-[#173b68] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#93c5fd]" />
            <span className="text-lg font-bold text-white tracking-tight">
              MedNoviAI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-semibold text-[#dbeafe] hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
  <Link
    href="/patient/profile"
    className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2
      text-xs font-semibold text-white transition-colors hover:bg-white/20"
  >
    <UserRound className="w-4 h-4" />
    My Profile
  </Link>
  <button
    type="button"
    onClick={handleLogout}
    className="flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-600 px-4 py-2
      text-xs font-semibold text-white transition-colors hover:bg-red-700 cursor-pointer"
  >
    <LogOut className="w-4 h-4" />
    Logout
  </button>
</div>

          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:bg-white/10 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-white/20 space-y-3 pb-2 animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-[#dbeafe] hover:bg-white/10 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-white/20 flex items-center justify-between px-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 bg-[#2563eb] text-white">
                  <AvatarFallback className="bg-[#2563eb] text-white font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-bold text-white">{userName}</p>
                  <p className="text-[10px] text-[#93c5fd] font-semibold">Patient Account</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg border border-red-400/40 bg-red-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="font-semibold transition-colors hover:text-[#2563eb]">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li aria-current="page" className="font-semibold text-[#2563eb]">
              Patient Dashboard
            </li>
          </ol>
        </nav>

        {/* Welcome */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4
         bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Good Day, {firstName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Welcome to your personal health portal. Manage consultations and AI symptom analysis.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/appointment/book" className="w-full sm:w-auto">
              <Button className="w-full bg-blue-500 hover:bg-blue-700 text-white font-semibold text-xs
                rounded-xl shadow-md shadow-[#2563eb]/20 h-10 px-4 gap-2 cursor-pointer">
                <Calendar className="w-4 h-4" />
                <span>Book Appointment</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* AI Banner */}
        <div className="relative overflow-hidden bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] text-white p-6 sm:p-8 rounded-3xl shadow-xl">
          <div className="relative z-10 max-w-xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
              <Stethoscope className="w-3.5 h-3.5" /> MedNovi AI Active
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Feeling unwell or need quick medical guidance?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed">
              Start a session with our interactive AI assistant to analyze symptoms and find suitable specialist recommendations.
            </p>
            <div className="pt-2">
              <Link href="/chat">
                <Button className="bg-blue-500 hover:bg-blue-700 text-white cursor-pointer font-bold
                  text-xs rounded-xl h-10 px-5 gap-2 transition-all">
                  <MessageSquare className="w-4 h-4" /> Start AI Consultation <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ─── Upcoming + Recent Appointments — summary cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* UPCOMING APPOINTMENTS CARD */}
          <div className="bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] text-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl underline font-bold text-white flex items-center gap-2">
                <CalendarClock className="w-5 h-5" /> Upcoming Appointments
              </h3>
              <span className="text-xs font-semibold bg-blue-500/20 border border-blue-400/30 text-blue-200 px-3 py-1 rounded-full">
                {appointmentsLoading ? "…" : upcomingAppointments.length}
              </span>
            </div>

            <p className="text-sm text-white">
              {appointmentsLoading
                ? "Loading your upcoming visits…"
                : upcomingAppointments.length === 0
                ? "You have no upcoming appointments scheduled. Book a visit with a specialist to get started."
                : `You have ${upcomingAppointments.length} upcoming ${
                    upcomingAppointments.length === 1 ? "visit" : "visits"
                  } scheduled.`}
            </p>

            {/* Preview of next appointment */}
            {!appointmentsLoading && nextUpcoming && (
              <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-200">
                    Next Visit
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      (
                        STATUS_PRESENTATION[nextUpcoming.status] ??
                        DEFAULT_STATUS_PRESENTATION
                      ).chip
                    }`}
                  >
                    {(
                      STATUS_PRESENTATION[nextUpcoming.status] ??
                      DEFAULT_STATUS_PRESENTATION
                    ).label}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white truncate">
                  {nextUpcoming.doctor?.full_name ?? "Doctor"}
                  {nextUpcoming.doctor?.specialty
                    ? ` · ${nextUpcoming.doctor.specialty}`
                    : ""}
                </p>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  {formatAppointmentPreview(
                    nextUpcoming.appointment_date,
                    nextUpcoming.appointment_time
                  )}
                </p>
                <p className="mt-1 text-[11px] text-blue-100/70">
                  {(
                    STATUS_PRESENTATION[nextUpcoming.status] ??
                    DEFAULT_STATUS_PRESENTATION
                  ).note}
                </p>
              </div>
            )}

            {awaitingApproval.length > 0 && (
              <p className="text-xs text-blue-100/80">
                {awaitingApproval.length}{" "}
                {awaitingApproval.length === 1 ? "booking is" : "bookings are"}{" "}
                waiting on your doctor&apos;s approval.
              </p>
            )}

            <Link href="/patient/appointments" className="block">
              <Button
                variant="outline"
                className="w-fit text-white text-xs font-semibold rounded-xl h-10 bg-blue-500 hover:bg-blue-700 cursor-pointer gap-2"
              >
                View Upcoming
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* RECENT APPOINTMENTS CARD */}
          <div className="bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] text-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl underline font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5" /> Recent Appointments
              </h3>
              <span className="text-xs font-semibold bg-blue-500/20 border border-blue-400/30 text-blue-200 px-3 py-1 rounded-full">
                {appointmentsLoading ? "…" : recentAppointments.length}
              </span>
            </div>

            <p className="text-sm text-white">
              {appointmentsLoading
                ? "Loading your appointment history…"
                : recentAppointments.length === 0
                ? "No past or cancelled appointments yet. Your history will appear here once you complete a visit."
                : `You have ${recentAppointments.length} past ${
                    recentAppointments.length === 1 ? "appointment" : "appointments"
                  } on record.`}
            </p>

            {/* Preview of last appointment */}
            {!appointmentsLoading && lastRecent && (
              <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-200">
                    Last Visit
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      (
                        STATUS_PRESENTATION[lastRecent.status] ??
                        DEFAULT_STATUS_PRESENTATION
                      ).chip
                    }`}
                  >
                    {(
                      STATUS_PRESENTATION[lastRecent.status] ??
                      DEFAULT_STATUS_PRESENTATION
                    ).label}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white truncate">
                  {lastRecent.doctor?.full_name ?? "Doctor"}
                  {lastRecent.doctor?.specialty
                    ? ` · ${lastRecent.doctor.specialty}`
                    : ""}
                </p>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  {formatAppointmentPreview(
                    lastRecent.appointment_date,
                    lastRecent.appointment_time
                  )}
                </p>
                <p className="mt-1 text-[11px] text-blue-100/70">
                  {(
                    STATUS_PRESENTATION[lastRecent.status] ??
                    DEFAULT_STATUS_PRESENTATION
                  ).note}
                </p>
              </div>
            )}

            <Link href="/patient/appointments" className="block">
              <Button
                variant="outline"
                className="w-fit text-white text-xs font-semibold rounded-xl h-10 bg-blue-500 hover:bg-blue-700 cursor-pointer gap-2"
              >
                View History
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* ─── Doctor's decision on each booking ─── */}
        <section
          aria-label="Doctor's decision on your bookings"
          className="bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] text-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-white underline flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-white" />
              Booking Approval Status
            </h2>

            <span className="text-xs font-semibold bg-blue-50 text-[#2563eb] px-3 py-1 rounded-full">
              {appointmentsLoading
                ? "Checking…"
                : `${awaitingApproval.length} awaiting doctor`}
            </span>
          </div>

          <p className="text-[14px] text-white">
            Every booking you make is sent to the doctor&apos;s dashboard. They
            approve or reject it there, and their decision appears below.
          </p>

          {appointmentsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-14 w-full rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...awaitingApproval, ...decidedBookings]
                .slice(0, 6)
                .map((appointment) => {
                  const presentation =
                    STATUS_PRESENTATION[appointment.status] ??
                    DEFAULT_STATUS_PRESENTATION;

                  return (
                    <li
                      key={appointment.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {appointment.doctor?.full_name ?? "Doctor"}
                          {appointment.doctor?.specialty
                            ? ` · ${appointment.doctor.specialty}`
                            : ""}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatAppointmentPreview(
                            appointment.appointment_date,
                            appointment.appointment_time
                          )}
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1
                             text-[11px] font-bold ${presentation.chipLight}`}
                        >
                          {presentation.label}
                        </span>
                        <p className="text-[11px] text-slate-200 mt-1">
                          {presentation.note}
                        </p>
                      </div>
                    </li>
                  );
                })}

              {awaitingApproval.length === 0 &&
                decidedBookings.length === 0 && (
                  <li className="py-6 text-center text-sm text-red-600">
                    You have not booked any appointments yet.
                  </li>
                )}
            </ul>
          )}

          <Link href="/patient/appointments" className="block">
            <Button
              variant="outline"
              className="w-fit text-white text-xs rounded-2xl h-10 bg-blue-500 hover:bg-blue-700
               cursor-pointer gap-2 hover:text-white"
            >
              View all my appointments
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </section>

        {/* Vitals */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#2563eb]" /> Health Vitals Overview
          </h2>
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#e8f1ff] text-[#2563eb]">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No vital signs recorded yet</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">
              Your heart rate, blood pressure, blood sugar, and temperature readings will appear here once your health records are connected.
            </p>
          </div>
        </div>

        {/* Bottom Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] text-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl underline font-bold text-white"> Find Specialists: </h3>
              <Link
                href="/doctors"
                className="text-xs font-semibold bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 cursor-pointer rounded-lg"
              >
                View All
              </Link>
            </div>

            <p className="text-sm text-white">
              Browse verified doctors, check ratings, and schedule instant video or physical visits.
            </p>
            <Link href="/doctors" className="block">
              <Button
                variant="outline"
                className="w-fit text-white text-xs font-semibold rounded-xl h-10 bg-blue-500 hover:bg-blue-700 cursor-pointer"
              >
                Explore Doctor Directory
              </Button>
            </Link>
          </div>

          <div className="bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] text-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl underline font-bold text-white"> Appointments: </h3>
              <Link
                href="/patient/appointments"
                className="text-xs font-semibold bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 cursor-pointer rounded-lg"
              >
                Check Status
              </Link>
            </div>
            <p className="text-sm text-white">
              Track pending appointment confirmations or view past consultation history.
            </p>
            <Link href="/patient/appointments" className="block">
              <Button
                variant="outline"
                className="w-fit text-white text-xs font-semibold rounded-xl h-10 bg-blue-500 hover:bg-blue-700 cursor-pointer"
              >
                View My Consultations
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}