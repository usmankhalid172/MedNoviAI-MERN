"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageLayout from "@/components/shared/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import PatientInfoSection from "@/components/doctor/PatientInfoSection";
import IntakeSummary from "@/components/doctor/IntakeSummary";
import AppointmentStatusBadge from "@/components/doctor/AppointmentStatusBadge";
import { getAppointment } from "@/lib/appointmentsClient";
import type { AppointmentStatus } from "@/types/appointment";

/* ----------------------------- Types ------------------------------- */

interface DetailPatient {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  medical_record_number?: string | null;
}

interface DetailIntake {
  id?: string;
  chief_complaint?: string | null;
  symptoms_description?: string | null;
  symptom_onset?: string | null;
  pain_level?: number | null;
  temperature_celsius?: number | null;
  blood_pressure?: string | null;
  heart_rate_bpm?: number | null;
  current_medications?: string | null;
  additional_notes?: string | null;
  ai_summary?: string | null;
  submitted_at?: string | null;
}

interface DetailAppointment {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: AppointmentStatus | null;
  notes?: string | null;
  created_at?: string | null;
  doctor?: { full_name?: string | null; specialty?: string | null } | null;
  patient?: DetailPatient | null;
  intake?: DetailIntake | null;
}

const STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

/* =============================== Page ============================== */

export default function AppointmentPatientPage() {
  const params = useParams();
  const appointmentId = typeof params.id === "string" ? params.id : "";

  const [appointment, setAppointment] =
    useState<DetailAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------------------- Fetch Appointment ----------------------- */

  /**
   * Resolves the appointment, or an error message. Kept side-effect free so the
   * effect below can ignore a response that arrives after unmount, and so the
   * retry button can reuse it.
   */
  const fetchAppointment = useCallback(async () => {
    if (!appointmentId) {
      return {
        appointment: null,
        error: "Appointment ID not found.",
      };
    }

    const result = await getAppointment(appointmentId);

    if (!result.ok) {
      return {
        appointment: null,
        error:
          result.code === "not_found"
            ? "This appointment no longer exists."
            : "Failed to load patient information. Please try again.",
      };
    }

    return { appointment: result.data.appointment, error: "" };
  }, [appointmentId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { appointment: loaded, error: failure } =
        await fetchAppointment();

      if (cancelled) return;

      setAppointment((loaded ?? null) as DetailAppointment | null);
      setError(failure);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchAppointment]);

  const handleRetry = useCallback(async () => {
    setLoading(true);

    const { appointment: loaded, error: failure } =
      await fetchAppointment();

    setAppointment((loaded ?? null) as DetailAppointment | null);
    setError(failure);
    setLoading(false);
  }, [fetchAppointment]);

  /* -------------------------- Helpers ---------------------------- */

  const formatWhen = (date?: string | null, time?: string | null) => {
    if (!date) return undefined;

    // `appointment_time` is a Postgres `time`, which has no offset. Appending
    // it to the date keeps the rendering local and avoids a UTC shift that
    // would silently move a 10:00 slot to 04:00.
    if (!time) return new Date(`${date}T00:00:00`).toLocaleString();

    const normalized = time.length === 5 ? `${time}:00` : time;

    return new Date(`${date}T${normalized}`).toLocaleString();
  };

  const getPainLevel = (painLevel?: number | null) => {
    if (painLevel === null || painLevel === undefined) return undefined;
    return `${painLevel}/10`;
  };

  /* --------------------------- Loading ---------------------------- */

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  /* ---------------------------- Error ----------------------------- */

  if (error) {
    return (
      <PageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="font-medium text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void handleRetry()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
            >
              Try Again
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  /* ---------------------- Patient Not Found ---------------------- */

  if (!appointment) {
    return (
      <PageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="font-medium text-muted-foreground">
            Data not found
          </p>
        </div>
      </PageLayout>
    );
  }

  const patient = appointment.patient ?? null;
  const intake = appointment.intake ?? null;
  const when = formatWhen(
    appointment.appointment_date,
    appointment.appointment_time
  );

  /* ============================= JSX ============================== */

  return (
    <PageLayout>
      <div className="my-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Patient Information
            </h1>

            <p className="mt-1 text-muted-foreground">
              View patient details and AI intake summary.
            </p>
          </div>

          {appointment.status && (
            <AppointmentStatusBadge
              status={appointment.status}
            />
          )}
        </div>

        {/* Patient Information
            Age, gender, blood group, allergies, chronic conditions and
            medications are intentionally left undefined: `public.patients`
            has no columns for them, and inventing values would put clinical
            claims on a patient record that do not exist. The component renders
            those fields as "Not available". */}
        <PatientInfoSection
          name={patient?.full_name ?? undefined}
          phone={patient?.phone_number ?? undefined}
          email={patient?.email ?? undefined}
          medicalRecordNumber={
            patient?.medical_record_number ?? undefined
          }
        />

        {/* Intake Summary */}
        {!intake ? (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                Patient Intake Summary
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Structured summary of the patient&apos;s submitted intake.
              </p>
            </div>

            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Patient ne intake complete nahi ki
              </p>
            </div>
          </section>
        ) : (
          <IntakeSummary
            chiefComplaint={intake.chief_complaint ?? undefined}
            symptoms={intake.symptoms_description ?? undefined}
            duration={intake.symptom_onset ?? undefined}
            onset={intake.symptom_onset ?? undefined}
            painLevel={getPainLevel(intake.pain_level)}
            temperature={
              intake.temperature_celsius != null
                ? `${intake.temperature_celsius} °C`
                : undefined
            }
            bloodPressure={intake.blood_pressure ?? undefined}
            heartRate={
              intake.heart_rate_bpm != null
                ? `${intake.heart_rate_bpm} BPM`
                : undefined
            }
            aiSummary={intake.ai_summary ?? undefined}
            additionalNotes={intake.additional_notes ?? undefined}
            submittedAt={intake.submitted_at ?? undefined}
          />
        )}

        {/* Appointment Context */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              Appointment Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Information related to this patient appointment.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Appointment ID
              </p>

              <p className="mt-1 break-all text-sm font-medium text-slate-900">
                {appointment.id}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Doctor
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {appointment.doctor?.full_name || "Not available"}
                {appointment.doctor?.specialty
                  ? ` — ${appointment.doctor.specialty}`
                  : ""}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Appointment Status
              </p>

              <p className="mt-1 text-sm font-medium capitalize text-slate-900">
                {appointment.status || "Not available"}
              </p>

              {appointment.status &&
                !STATUSES.includes(appointment.status) && (
                  <p className="mt-1 text-xs text-amber-700">
                    Unrecognised status value
                  </p>
                )}
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scheduled
              </p>

              <p className="mt-1 text-sm font-medium text-slate-900">
                {when || "Not available"}
              </p>
            </div>

            {appointment.notes && (
              <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Appointment Notes
                </p>

                <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-900">
                  {appointment.notes}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}