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
  const [ready, setReady] = useState(false);

  const appointmentId =
    searchParams.get("appointmentId") ||
    searchParams.get("bookingId");

  const doctorName = searchParams.get("doctor");
  const specialty = searchParams.get("specialty");
  const date = searchParams.get("date");
  const time = searchParams.get("time");

  const location =
    searchParams.get("location") ||
    "MedNovi Medical Center, Suite 402";

  const status =
    searchParams.get("status") || "Scheduled";

  const fee = Number(searchParams.get("fee") || 0);

  useEffect(() => {
    setReady(true);
  }, []);

  async function copyAppointmentId() {
    if (!appointmentId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(appointmentId);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  function printReceipt() {
    window.print();
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl animate-pulse">
            <div className="h-10 rounded bg-muted" />
            <div className="mt-4 h-6 rounded bg-muted" />
            <div className="mt-8 h-64 rounded-xl bg-muted" />
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // ---------------------------------------------------------
  // MISSING BOOKING DATA
  // ---------------------------------------------------------

  if (
    !appointmentId ||
    !doctorName ||
    !specialty ||
    !date ||
    !time
  ) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-2xl">!</span>
            </div>

            <h1 className="text-2xl font-bold">
              Booking details unavailable
            </h1>

            <p className="mt-3 text-muted-foreground">
              We could not load the appointment details.
              Please check your appointments or book again.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/patient/appointments"
                className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                View My Appointments
              </Link>

              <Link
                href="/patient/dashboard"
                className="rounded-lg border px-5 py-3 text-sm font-medium"
              >
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
      <div className="min-h-screen bg-background print:hidden">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-8 text-sm text-muted-foreground">
            <Link
              href="/patient/dashboard"
              className="hover:text-primary"
            >
              Dashboard
            </Link>

            <span className="mx-2">/</span>

            <span className="text-foreground">
              Appointment Confirmation
            </span>
          </div>

          {/* SUCCESS */}
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border bg-card p-6 text-center sm:p-10">
              {/* Success Icon */}
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>

              <h1 className="mt-6 text-3xl font-bold">
                Appointment Confirmed!
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Your appointment has been successfully booked.
                Please keep your appointment ID for future reference.
              </p>

              {/* Appointment ID */}
              <div className="mx-auto mt-8 max-w-md rounded-xl border bg-muted/30 p-5">
                <p className="text-sm text-muted-foreground">
                  Appointment ID
                </p>

                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="break-all text-lg font-bold">
                    {appointmentId}
                  </span>

                  <button
                    type="button"
                    onClick={copyAppointmentId}
                    className="rounded-md p-2 hover:bg-muted"
                    title="Copy appointment ID"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5" />
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
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-3">
                    <UserRound className="h-5 w-5 text-primary" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Doctor
                      </p>

                      <p className="font-medium">
                        Dr. {doctorName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specialty */}
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-3">
                    <ListChecks className="h-5 w-5 text-primary" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Specialty
                      </p>

                      <p className="font-medium">
                        {specialty}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-primary" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Date
                      </p>

                      <p className="font-medium">
                        {date}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Time
                      </p>

                      <p className="font-medium">
                        {time}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="rounded-xl border p-4 sm:col-span-2">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Location
                      </p>

                      <p className="font-medium">
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

                <p className="mt-1 font-semibold text-green-700">
                  {status}
                </p>
              </div>

              {/* ACTIONS */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {/* View Appointments */}
                <Link
                  href="/patient/appointments"
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  <ListChecks className="h-4 w-4" />
                  View My Appointments
                </Link>

                {/* Dashboard */}
                <Link
                  href="/patient/dashboard"
                  className="flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium transition hover:bg-muted"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Go to Dashboard
                </Link>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {/* Print */}
                <button
                  type="button"
                  onClick={printReceipt}
                  className="flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium transition hover:bg-muted"
                >
                  <Printer className="h-4 w-4" />
                  Print Receipt
                </button>

                {/* Book Again */}
                <Link
                  href="/appointment/book"
                  className="flex items-center justify-center rounded-lg border px-5 py-3 text-sm font-medium transition hover:bg-muted"
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
          {/* Header */}
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

          {/* Details */}
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

              <p className="font-semibold">
                {status}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Doctor
              </p>

              <p className="font-semibold">
                Dr. {doctorName}
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

          {/* Fee */}
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

          {/* Footer */}
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
        <div className="min-h-screen bg-background">
          <Navbar />

          <main className="container mx-auto px-4 py-16">
            <div className="mx-auto max-w-2xl animate-pulse">
              <div className="h-10 rounded bg-muted" />

              <div className="mt-4 h-6 rounded bg-muted" />

              <div className="mt-8 h-64 rounded-xl bg-muted" />
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