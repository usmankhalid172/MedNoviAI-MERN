"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageLayout from "@/components/shared/PageLayout";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import api from "@/lib/api";

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

export default function AppointmentPatientPage() {
  const params = useParams();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] =
    useState<AppointmentDetails | null>(null);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        // 1. Get appointment details
        const appointmentResponse =
          await api.get<AppointmentResponse>(
            `/api/appointments/${appointmentId}`
          );

        const appointmentData = appointmentResponse.data.data;

        setAppointment(appointmentData);

        if (!appointmentData?.patientId) {
          setError("Patient information not found.");
          return;
        }

        const patientId = appointmentData.patientId;

        // 2. Get patient information
        const patientResponse =
          await api.get<PatientResponse>(
            `/api/patients/${patientId}`
          );

        setPatient(patientResponse.data.data || null);

        // 3. Get patient intake information
        try {
          const intakeResponse =
            await api.get<IntakeResponse>(
              `/api/PatientIntakes/patient/${patientId}`
            );

          const intakes = intakeResponse.data.data || [];

          // Prefer intake belonging to this appointment
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

          // Intake is optional.
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

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) {
      return null;
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
      return "Not available";
    }

    switch (gender) {
      case 0:
        return "Male";

      case 1:
        return "Female";

      default:
        return "Not available";
    }
  };

  const getPainLevel = (painLevel?: number) => {
    if (painLevel === undefined || painLevel === null) {
      return "Not available";
    }

    return `${painLevel}/10`;
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="font-medium text-red-600">
              {error}
            </p>

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
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Patient Details
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">
                Name
              </p>

              <p className="mt-1 font-medium">
                {patient.fullName || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Age
              </p>

              <p className="mt-1 font-medium">
                {age !== null
                  ? age
                  : "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Gender
              </p>

              <p className="mt-1 font-medium">
                {getGender(patient.profile?.gender)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Contact
              </p>

              <p className="mt-1 font-medium">
                {patient.phoneNumber ||
                  patient.email ||
                  "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Email
              </p>

              <p className="mt-1 font-medium">
                {patient.email || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Medical Record Number
              </p>

              <p className="mt-1 font-medium">
                {patient.medicalRecordNumber ||
                  "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Blood Group
              </p>

              <p className="mt-1 font-medium">
                {patient.profile?.bloodGroup ||
                  "Not available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Allergies
              </p>

              <p className="mt-1 font-medium">
                {patient.profile?.allergies ||
                  "No allergies recorded"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">
                Medical History
              </p>

              <p className="mt-1 font-medium">
                {patient.profile?.chronicConditions ||
                  "No medical history available."}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">
                Current Medications
              </p>

              <p className="mt-1 font-medium">
                {patient.profile?.currentMedications ||
                  "No current medications recorded"}
              </p>
            </div>
          </div>
        </div>

        {/* Intake Summary */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Patient Intake Summary
          </h2>

          {!intake ? (
            <p className="mt-4 text-muted-foreground">
              Patient ne intake complete nahi ki
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {/* Chief Complaint */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Chief Complaint
                </p>

                <p className="mt-1 font-medium">
                  {intake.chiefComplaint ||
                    "Not available"}
                </p>
              </div>

              {/* Symptoms */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Symptoms
                </p>

                <p className="mt-1 font-medium">
                  {intake.symptomsDescription ||
                    "Not available"}
                </p>
              </div>

              {/* Duration / Onset */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Duration / Onset
                </p>

                <p className="mt-1 font-medium">
                  {intake.symptomOnset ||
                    "Not available"}
                </p>
              </div>

              {/* Suggested Specialty */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Suggested Specialty
                </p>

                <p className="mt-1 font-medium">
                  {intake.recommendedSpecialtyName ||
                    "Not available"}
                </p>
              </div>

              {/* Pain Level */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Pain Level
                </p>

                <p className="mt-1 font-medium">
                  {getPainLevel(intake.painLevel)}
                </p>
              </div>

              {/* Temperature */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Temperature
                </p>

                <p className="mt-1 font-medium">
                  {intake.temperatureCelsius !==
                  undefined
                    ? `${intake.temperatureCelsius} °C`
                    : "Not available"}
                </p>
              </div>

              {/* Blood Pressure */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Blood Pressure
                </p>

                <p className="mt-1 font-medium">
                  {intake.bloodPressure ||
                    "Not available"}
                </p>
              </div>

              {/* Heart Rate */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Heart Rate
                </p>

                <p className="mt-1 font-medium">
                  {intake.heartRateBpm !== undefined
                    ? `${intake.heartRateBpm} BPM`
                    : "Not available"}
                </p>
              </div>

              {/* AI Summary */}
              <div>
                <p className="text-sm text-muted-foreground">
                  AI Summary
                </p>

                <p className="mt-1 leading-6">
                  {intake.aiSummary ||
                    "Not available"}
                </p>
              </div>

              {/* Additional Notes */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Additional Notes
                </p>

                <p className="mt-1 leading-6">
                  {intake.additionalNotes ||
                    "No additional notes"}
                </p>
              </div>

              {/* Submitted At */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Submitted At
                </p>

                <p className="mt-1 font-medium">
                  {intake.submittedAt
                    ? new Date(
                        intake.submittedAt
                      ).toLocaleString()
                    : "Not available"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}