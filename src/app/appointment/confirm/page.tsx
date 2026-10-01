"use client";

import React, {
  Suspense,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { AuthContext } from "@/context/AuthContext";
import {
  getAppointment,
  type AppointmentRecord,
} from "@/lib/appointmentsClient";
import {
  CheckCircle2,
  Copy,
  Check,
  Printer,
  CalendarDays,
  Clock,
  MapPin,
  UserRound,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { user } = useContext(AuthContext);

  const [copied, setCopied] = useState(false);

  // Only the id is taken from the URL. The doctor, date, time and status used to
  // be read from query parameters too, so the page rendered whatever the link
  // claimed - including ?status=confirmed on a booking that was never made. The
  // record is now fetched and the URL is treated as an identifier only.
  const appointmentId =
    searchParams.get("appointmentId") ||
    searchParams.get("bookingId");

  const [appointment, setAppointment] = useState<AppointmentRecord | null>(null);
  const [bookingResolved, setBookingResolved] = useState(false);

  const location = "MedNovi Medical Center, Suite 402";

  useEffect(() => {
    if (!appointmentId) return;

    let cancelled = false;

    async function load() {
      const result = await getAppointment(appointmentId!);

      if (cancelled) return;

      setAppointment(result.ok ? result.data.appointment : null);
      setBookingResolved(true);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const doctorName = appointment?.doctor?.full_name ?? "Your doctor";
  const specialty = appointment?.doctor?.specialty ?? "General Medicine";
  const date = appointment?.appointment_date ?? "";
  const time = appointment?.appointment_time?.slice(0, 5) ?? "";
  const status = appointment?.status ?? "pending";

  const fee = Number(searchParams.get("fee") || 0);

  async function copyAppointmentId() {
    if (!appointmentId) return;

    try {
      await navigator.clipboard.writeText(appointmentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  function printReceipt() {
    window.print();
  }

  // ---------------------------------------------------------
  // MISSING BOOKING DATA — clean fallback
  // ---------------------------------------------------------

  if (!bookingResolved && appointmentId) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">
              Loading your booking
            </h1>
            <p className="mt-2 text-slate-500">
              Please wait a moment.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-2xl font-bold text-red-600">!</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Booking details unavailable
            </h1>

            <p className="mt-3 text-slate-500">
              We could not load the appointment details.
              Please check your appointments or book again.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/patient/appointments"
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                <ListChecks className="h-4 w-4" />
                View My Appointments
              </Link>

              <Link
                href="/patient/dashboard"
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <>
      {/* MAIN PAGE */}
      <div className="min-h-screen bg-slate-50 print:hidden">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-8 text-sm text-slate-500">
            <Link
              href="/patient/dashboard"
              className="transition hover:text-blue-600"
            >
              Dashboard
            </Link>

            <span className="mx-2">/</span>

            <span className="font-medium text-slate-900">
              Appointment Confirmation
            </span>
          </div>

          {/* SUCCESS */}
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
              {/* Success Icon */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>

              <h1 className="mt-6 text-3xl font-bold text-slate-900">
                Appointment Confirmed!
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-slate-500">
                Your appointment has been successfully booked.
                Please keep your appointment ID for future reference.
              </p>

              {/* Appointment ID */}
              <div className="mx-auto mt-8 max-w-md rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Appointment ID
                </p>

                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="break-all text-lg font-bold text-slate-900">
                    {appointmentId}
                  </span>

                  <button
                    type="button"
                    onClick={copyAppointmentId}
                    className="rounded-md p-2 transition hover:bg-slate-200"
                    title="Copy appointment ID"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5 text-slate-600" />
                    )}
                  </button>
                </div>

                {copied && (
                  <p className="mt-2 text-xs text-green-600">
                    Appointment ID copied!
                  </p>
                )}
              </div>

              {/* APPOINTMENT DETAILS */}
              <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
                {/* Doctor */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <UserRound className="h-5 w-5 text-blue-600" />

                    <div>
                      <p className="text-xs text-slate-500">
                        Doctor
                      </p>

                      <p className="font-medium text-slate-900">
                        {doctorName?.startsWith("Dr.") ? doctorName : `Dr. ${doctorName}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specialty */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <ListChecks className="h-5 w-5 text-blue-600" />

                    <div>
                      <p className="text-xs text-slate-500">
                        Specialty
                      </p>

                      <p className="font-medium text-slate-900">
                        {specialty}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-blue-600" />

                    <div>
                      <p className="text-xs text-slate-500">
                        Date
                      </p>

                      <p className="font-medium text-slate-900">
                        {date}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-600" />

                    <div>
                      <p className="text-xs text-slate-500">
                        Time
                      </p>

                      <p className="font-medium text-slate-900">
                        {time}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-blue-600" />

                    <div>
                      <p className="text-xs text-slate-500">
                        Location
                      </p>

                      <p className="font-medium text-slate-900">
                        {location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* STATUS */}
              <div className="mt-6 rounded-xl bg-green-50 p-4 text-center">
                <p className="text-sm text-green-700">
                  Booking Status
                </p>

                <p className="mt-1 font-semibold capitalize text-green-700">
                  {status}
                </p>
              </div>

              {/* ACTIONS */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/patient/appointments"
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  <ListChecks className="h-4 w-4" />
                  View My Appointments
                </Link>

                <Link
                  href="/patient/dashboard"
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                </Link>

                <button
                  type="button"
                  onClick={printReceipt}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4" />
                  Print Receipt
                </button>

                <Link
                  href={
                    appointment.doctor_id
                      ? `/appointment/book?doctorId=${encodeURIComponent(appointment.doctor_id)}`
                      : "/appointment/book"
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Book Another Appointment
                </Link>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* PRINT RECEIPT */}
      <div className="hidden print:block">
        <div className="mx-auto max-w-3xl p-8">
          <div className="border-b pb-6 text-center">
            <h1 className="text-3xl font-bold">
              MedNoviAI
            </h1>

            <p className="mt-1 text-sm">
              Medical Appointment Booking
            </p>

            <h2 className="mt-6 text-xl font-semibold">
              Appointment Booking Receipt
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500">
                Appointment ID
              </p>

              <p className="font-semibold">
                {appointmentId}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Booking Status
              </p>

              <p className="font-semibold capitalize">
                {status}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Doctor
              </p>

              <p className="font-semibold">
                {doctorName}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Specialty
              </p>

              <p className="font-semibold">
                {specialty}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Date
              </p>

              <p className="font-semibold">
                {date}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Time
              </p>

              <p className="font-semibold">
                {time}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-sm text-gray-500">
                Location
              </p>

              <p className="font-semibold">
                {location}
              </p>
            </div>
          </div>

          <div className="mt-10 border-t pt-6">
            <div className="flex justify-between">
              <span>Appointment Fee</span>

              <span>
                Rs. {fee.toLocaleString()}
              </span>
            </div>

            <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold">
              <span>Total</span>

              <span>
                Rs. {fee.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-10 border-t pt-6 text-sm text-gray-500">
            <p>
              This receipt confirms your appointment booking
              with MedNoviAI.
            </p>

            <p className="mt-2">
              Patient: {user?.email || "Registered Patient"}
            </p>
          </div>
        </div>
      </div>

      {/* PRINT STYLES */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }

          body {
            background: white !important;
          }

          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}

export default function AppointmentConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <Navbar />

          <main className="container mx-auto px-4 py-16">
            <div className="mx-auto max-w-2xl animate-pulse">
              <div className="h-10 rounded bg-slate-200" />
              <div className="mt-4 h-6 rounded bg-slate-200" />
              <div className="mt-8 h-64 rounded-xl bg-slate-200" />
            </div>
          </main>

          <Footer />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}