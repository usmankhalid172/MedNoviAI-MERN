"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageLayout from "@/components/shared/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import PatientInfoSection from "@/components/doctor/PatientInfoSection";
import IntakeSummary from "@/components/doctor/IntakeSummary";
import api from "@/lib/api";

/* ----------------------------- Types ------------------------------- */

interface AppointmentDetails {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId?: string;
  doctorName?: string;
  status?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  reasonForVisit?: string;
  notes?: string;
  createdAt?: string;
}

interface PatientProfile {
  dateOfBirth?: string;
  gender?: number;
  bloodGroup?: string;
  heightCm?: number;
  weightKg?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
}

interface Patient {
  id?: string;
  userId?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  medicalRecordNumber?: string;
  profile?: PatientProfile;
  createdAt?: string;
}

interface Intake {
  id: string;
  patientId: string;
  patientName?: string;
  appointmentId?: string;
  aiConversationId?: string;
  recommendedSpecialtyId?: string;
  recommendedSpecialtyName?: string;
  chiefComplaint?: string;
  symptomsDescription?: string;
  symptomOnset?: string;
  painLevel?: number;
  temperatureCelsius?: number;
  bloodPressure?: string;
  heartRateBpm?: number;
  currentMedications?: string;
  additionalNotes?: string;
  aiSummary?: string;
  status?: number;
  submittedAt?: string;
  createdAt?: string;
}

interface AppointmentResponse {
  success: boolean;
  data: AppointmentDetails;
  message?: string;
}

interface PatientResponse {
  success: boolean;
  data: Patient;
  message?: string;
}

interface IntakeResponse {
  success: boolean;
  data: Intake[];
  message?: string;
}

/* =============================== Page ============================== */

export default function AppointmentPatientPage() {
  const params = useParams();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] =
    useState<AppointmentDetails | null>(null);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ---------------------- Fetch Patient Data ---------------------- */

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!appointmentId) {
        setError("Appointment ID not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        /* 1. Get appointment details */
        const appointmentResponse =
          await api.get<AppointmentResponse>(
            `/appointments/${appointmentId}`
          );

        const appointmentData = appointmentResponse.data.data;

        setAppointment(appointmentData);

        if (!appointmentData?.patientId) {
          setError("Patient information not found.");
          return;
        }

        const patientId = appointmentData.patientId;

        /* 2. Get patient information */
        const patientResponse =
          await api.get<PatientResponse>(
            `/patients/${patientId}`
          );

        setPatient(patientResponse.data.data || null);

        /* 3. Get patient intake information */
        try {
          const intakeResponse =
            await api.get<IntakeResponse>(
              `/PatientIntakes/patient/${patientId}`
            );

          const intakes = intakeResponse.data.data || [];

          /* Prefer intake belonging to this appointment */
          const appointmentIntake =
            intakes.find(
              (item) => item.appointmentId === appointmentId
            ) || intakes[0];

          setIntake(appointmentIntake || null);
        } catch (intakeError) {
          console.error(
            "Failed to fetch patient intake:",
            intakeError
          );

          /* Intake is optional */
          setIntake(null);
        }
      } catch (err) {
        console.error(
          "Failed to fetch patient data:",
          err
        );

        setError(
          "Failed to load patient information. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [appointmentId]);

  /* -------------------------- Helpers ---------------------------- */

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) {
      return undefined;
    }

    const birthDate = new Date(dateOfBirth);
    const today = new Date();

    let age =
      today.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      today.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 &&
        today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const getGender = (gender?: number) => {
    if (gender === undefined || gender === null) {
      return undefined;
    }

    switch (gender) {
      case 0:
        return "Male";

      case 1:
        return "Female";

      default:
        return undefined;
    }
  };

  const getPainLevel = (painLevel?: number) => {
    if (painLevel === undefined || painLevel === null) {
      return undefined;
    }

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

  /* ---------------------- Patient Not Found ---------------------- */

  if (!patient) {
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

  const age = calculateAge(
    patient.profile?.dateOfBirth
  );

  /* ============================= JSX ============================== */

  return (
    <PageLayout>
      <div className="my-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Patient Information
          </h1>

          <p className="mt-1 text-muted-foreground">
            View patient details and AI intake summary.
          </p>
        </div>

        {/* Patient Information */}
        <PatientInfoSection
          name={patient.fullName}
          age={age}
          gender={getGender(patient.profile?.gender)}
          phone={patient.phoneNumber}
          email={patient.email}
          medicalRecordNumber={patient.medicalRecordNumber}
          bloodGroup={patient.profile?.bloodGroup}
          allergies={
            patient.profile?.allergies ||
            "No allergies recorded"
          }
          chronicConditions={
            patient.profile?.chronicConditions ||
            "No medical history available."
          }
          currentMedications={
            patient.profile?.currentMedications ||
            "No current medications recorded"
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
            chiefComplaint={intake.chiefComplaint}
            symptoms={intake.symptomsDescription}
            duration={intake.symptomOnset}
            onset={intake.symptomOnset}
            suggestedSpecialty={
              intake.recommendedSpecialtyName
            }
            painLevel={getPainLevel(intake.painLevel)}
            temperature={
              intake.temperatureCelsius !== undefined
                ? `${intake.temperatureCelsius} °C`
                : undefined
            }
            bloodPressure={intake.bloodPressure}
            heartRate={
              intake.heartRateBpm !== undefined
                ? `${intake.heartRateBpm} BPM`
                : undefined
            }
            aiSummary={intake.aiSummary}
            additionalNotes={intake.additionalNotes}
            submittedAt={intake.submittedAt}
          />
        )}

        {/* Appointment Context */}
        {appointment && (
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
                  {appointment.doctorName || "Not available"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Appointment Status
                </p>

                <p className="mt-1 text-sm font-medium capitalize text-slate-900">
                  {appointment.status || "Not available"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Scheduled Start
                </p>

                <p className="mt-1 text-sm font-medium text-slate-900">
                  {appointment.scheduledStart
                    ? new Date(
                        appointment.scheduledStart
                      ).toLocaleString()
                    : "Not available"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Scheduled End
                </p>

                <p className="mt-1 text-sm font-medium text-slate-900">
                  {appointment.scheduledEnd
                    ? new Date(
                        appointment.scheduledEnd
                      ).toLocaleString()
                    : "Not available"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason for Visit
                </p>

                <p className="mt-1 text-sm font-medium text-slate-900">
                  {appointment.reasonForVisit ||
                    "Not available"}
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
        )}
      </div>
    </PageLayout>
  );
}