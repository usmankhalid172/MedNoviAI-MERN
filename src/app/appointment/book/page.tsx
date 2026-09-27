"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import EmptyState from "@/components/shared/EmptyState";
import { supabase } from "@/lib/supabase";
import { ChevronRight, Loader2 } from "lucide-react";
import Footer from "@/components/shared/Footer";

interface Doctor {
  id: string;
  name: string;
  specialtyId: string;
  experience: number;
  rating: number;
  avatar: string;
}

interface Specialty {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface FieldErrors {
  specialty?: string;
  doctor?: string;
  date?: string;
  time?: string;
}

const STEPS = ["Specialty", "Doctor", "Date & Time", "Confirm"];

function getTodayLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function convertDisplayTimeTo24Hour(time: string) {
  const [timePart, modifier] = time.split(" ");

  let [hours, minutes] = timePart.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  }

  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:00`;
}

function formatTime(time: string) {
  const [hoursString, minutes] = time.split(":");

  let hours = Number(hoursString);

  const modifier = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${hours}:${minutes} ${modifier}`;
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = 15000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("REQUEST_TIMEOUT"));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function getErrorMessage(error: any) {
  if (error?.message === "REQUEST_TIMEOUT") {
    return "The request took too long. Please check your internet connection and try again.";
  }

  if (
    error?.code === "23505" ||
    /duplicate|unique|already exists/i.test(error?.message || "")
  ) {
    return "This appointment slot has just been booked by someone else. Please select another time.";
  }

  if (
    /network|fetch|failed to fetch|connection/i.test(
      error?.message || ""
    )
  ) {
    return "Network error. Please check your internet connection and try again.";
  }

  return (
    error?.message ||
    "Something went wrong while booking your appointment. Please try again."
  );
}

export default function AppointmentBookingPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);

  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [selectedSpecialty, setSelectedSpecialty] =
    useState<Specialty | null>(null);

  const [selectedDoctor, setSelectedDoctor] =
    useState<Doctor | null>(null);

  const [selectedDate, setSelectedDate] =
    useState(getTodayLocalDate());

  const [selectedTime, setSelectedTime] = useState("");

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ---------------------------------------------------------
  // LOAD SPECIALTIES + DOCTORS
  // ---------------------------------------------------------

  useEffect(() => {
    async function loadData() {
      try {
        setDataLoading(true);
        setDataError(null);

        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const [specialtiesResult, doctorsResult] =
          await Promise.all([
            supabase
              .from("specialties")
              .select("id, name")
              .order("name"),

            supabase
              .from("doctors")
              .select(
                "id, full_name, experience_years, rating, avatar_url, specialty_id"
              )
              .eq("is_available", true),
          ]);

        if (specialtiesResult.error) {
          throw specialtiesResult.error;
        }

        if (doctorsResult.error) {
          throw doctorsResult.error;
        }

        const specialtyData =
          specialtiesResult.data?.map((specialty: any) => ({
            id: specialty.id,
            name: specialty.name,
            icon: "🏥",
            description: `Consult with our ${specialty.name} specialists.`,
          })) || [];

        const doctorData =
          doctorsResult.data?.map((doctor: any) => ({
            id: doctor.id,
            name: doctor.full_name,
            specialtyId: doctor.specialty_id,
            experience: doctor.experience_years || 0,
            rating: doctor.rating || 0,
            avatar:
              doctor.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                doctor.full_name
              )}`,
          })) || [];

        setSpecialties(specialtyData);
        setAllDoctors(doctorData);
      } catch (error) {
        console.error("Failed to load booking data:", error);

        setDataError(
          "Unable to load doctors and specialties. Please try again."
        );
      } finally {
        setDataLoading(false);
      }
    }

    loadData();
  }, []);

  // ---------------------------------------------------------
  // LOAD AVAILABLE TIME SLOTS
  // ---------------------------------------------------------

  useEffect(() => {
    async function loadTimeSlots() {
      if (
        !selectedDoctor ||
        currentStep !== 3 ||
        !selectedDate
      ) {
        return;
      }

      try {
        setSlotsLoading(true);
        setSlotsError(null);
        setSelectedTime("");

        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const dateObject = new Date(
          `${selectedDate}T00:00:00`
        );

        const dayOfWeek = dateObject.getDay();

        // Get doctor's working hours
        const {
          data: availability,
          error: availabilityError,
        } = await supabase
          .from("doctor_availability")
          .select("start_time, end_time")
          .eq("doctor_id", selectedDoctor.id)
          .eq("day_of_week", dayOfWeek);

        if (availabilityError) {
          throw availabilityError;
        }

        // Get already booked appointments
        const {
          data: bookedAppointments,
          error: appointmentsError,
        } = await supabase
          .from("appointments")
          .select("time")
          .eq("doctor_id", selectedDoctor.id)
          .eq("date", selectedDate)
          .in("status", [
            "Scheduled",
            "Confirmed",
            "Pending",
          ]);

        if (appointmentsError) {
          throw appointmentsError;
        }

        const bookedTimes = new Set(
          (bookedAppointments || []).map(
            (appointment: any) =>
              String(appointment.time).slice(0, 5)
          )
        );

        const generatedSlots: string[] = [];

        for (const schedule of availability || []) {
          const start = String(schedule.start_time).slice(
            0,
            5
          );

          const end = String(schedule.end_time).slice(0, 5);

          const [startHour, startMinute] = start
            .split(":")
            .map(Number);

          const [endHour, endMinute] = end
            .split(":")
            .map(Number);

          let currentMinutes =
            startHour * 60 + startMinute;

          const endMinutes =
            endHour * 60 + endMinute;

          while (currentMinutes < endMinutes) {
            const hour = Math.floor(currentMinutes / 60);
            const minute = currentMinutes % 60;

            const time24 = `${String(hour).padStart(
              2,
              "0"
            )}:${String(minute).padStart(2, "0")}`;

            if (!bookedTimes.has(time24)) {
              generatedSlots.push(formatTime(time24));
            }

            currentMinutes += 30;
          }
        }

        setTimeSlots(generatedSlots);
      } catch (error) {
        console.error(
          "Failed to load time slots:",
          error
        );

        setSlotsError(
          "Unable to load available time slots. Please try again."
        );
      } finally {
        setSlotsLoading(false);
      }
    }

    loadTimeSlots();
  }, [selectedDoctor, selectedDate, currentStep]);

  // ---------------------------------------------------------
  // FIELD ERROR HELPERS
  // ---------------------------------------------------------

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));

    setSubmitError(null);
  }

  // ---------------------------------------------------------
  // VALIDATE CURRENT STEP
  // ---------------------------------------------------------

  function validateCurrentStep() {
    const errors: FieldErrors = {};

    if (currentStep === 1 && !selectedSpecialty) {
      errors.specialty = "Please select a specialty.";
    }

    if (currentStep === 2 && !selectedDoctor) {
      errors.doctor = "Please select a doctor.";
    }

    if (currentStep === 3) {
      if (!selectedDate) {
        errors.date =
          "Please select an appointment date.";
      } else if (
        selectedDate < getTodayLocalDate()
      ) {
        errors.date =
          "Please select today or a future date.";
      }

      if (!selectedTime) {
        errors.time =
          "Please select an available time slot.";
      }
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  }

  // ---------------------------------------------------------
  // NEXT
  // ---------------------------------------------------------

  function handleNext() {
    setSubmitError(null);

    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(
        (previous) => previous + 1
      );
    }
  }

  // ---------------------------------------------------------
  // BACK
  // ---------------------------------------------------------

  function handleBack() {
    setSubmitError(null);

    if (currentStep > 1) {
      setCurrentStep(
        (previous) => previous - 1
      );
    }
  }

  // ---------------------------------------------------------
  // FINAL BOOKING
  // ---------------------------------------------------------

  async function handleFinalSubmit() {
    const allErrors: FieldErrors = {};

    if (!selectedSpecialty) {
      allErrors.specialty =
        "Please select a specialty.";
    }

    if (!selectedDoctor) {
      allErrors.doctor =
        "Please select a doctor.";
    }

    if (!selectedDate) {
      allErrors.date =
        "Please select an appointment date.";
    } else if (
      selectedDate < getTodayLocalDate()
    ) {
      allErrors.date =
        "Please select today or a future date.";
    }

    if (!selectedTime) {
      allErrors.time =
        "Please select an available time slot.";
    }

    setFieldErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      return;
    }

    if (!supabase) {
      setSubmitError(
        "Supabase is not configured."
      );
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      // -----------------------------------------------------
      // GET LOGGED-IN USER
      // -----------------------------------------------------

      const storedUser =
        localStorage.getItem(
          "mednoviai-user"
        );

      if (!storedUser) {
        setSubmitError(
          "Your session could not be found. Please log in again."
        );
        return;
      }

      let user;

      try {
        user = JSON.parse(storedUser);
      } catch {
        setSubmitError(
          "Your session is invalid. Please log in again."
        );
        return;
      }

      if (!user?.id) {
        setSubmitError(
          "User information is missing. Please log in again."
        );
        return;
      }

      // -----------------------------------------------------
      // FIND PATIENT
      // -----------------------------------------------------

      const {
        data: patient,
        error: patientError,
      } = await withTimeout(
        supabase
          .from("patients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle()
      );

      if (patientError) {
        throw patientError;
      }

      if (!patient) {
        setSubmitError(
          "Patient profile was not found. Please complete your patient profile first."
        );
        return;
      }

      // -----------------------------------------------------
      // CONVERT TIME
      // -----------------------------------------------------

      const appointmentTime =
        convertDisplayTimeTo24Hour(
          selectedTime
        );

      // -----------------------------------------------------
      // FINAL SLOT CHECK
      // -----------------------------------------------------

      const {
        data: existingAppointment,
        error: duplicateError,
      } = await withTimeout(
        supabase
          .from("appointments")
          .select("id")
          .eq("doctor_id", selectedDoctor!.id)
          .eq("date", selectedDate)
          .eq("time", appointmentTime)
          .in("status", [
            "Scheduled",
            "Confirmed",
            "Pending",
          ])
          .maybeSingle()
      );

      if (duplicateError) {
        throw duplicateError;
      }

      if (existingAppointment) {
        setSubmitError(
          "This time slot is no longer available. Please choose another time."
        );

        setSelectedTime("");
        setCurrentStep(3);

        return;
      }

      // -----------------------------------------------------
      // CREATE APPOINTMENT
      // -----------------------------------------------------

      const {
        data: createdAppointment,
        error: insertError,
      } = await withTimeout(
        supabase
          .from("appointments")
          .insert({
            patient_id: patient.id,
            doctor_id: selectedDoctor!.id,
            doctor_name: selectedDoctor!.name,
            specialty: selectedSpecialty!.name,
            date: selectedDate,
            time: appointmentTime,
            location:
              "MedNovi Medical Center, Suite 402",
            status: "Scheduled",
            fee: 0,
          })
          .select(
            "id, doctor_name, specialty, date, time, location, status, fee"
          )
          .single()
      );

      if (insertError) {
        throw insertError;
      }

      if (!createdAppointment) {
        throw new Error(
          "Appointment was not created. Please try again."
        );
      }

      // -----------------------------------------------------
      // REDIRECT TO CONFIRMATION
      // -----------------------------------------------------

      const params = new URLSearchParams({
        appointmentId: String(
          createdAppointment.id
        ),

        doctor:
          createdAppointment.doctor_name ||
          selectedDoctor!.name,

        specialty:
          createdAppointment.specialty ||
          selectedSpecialty!.name,

        date: String(
          createdAppointment.date
        ),

        time: selectedTime,

        location:
          createdAppointment.location ||
          "MedNovi Medical Center, Suite 402",

        status:
          createdAppointment.status ||
          "Scheduled",

        fee: String(
          createdAppointment.fee ?? 0
        ),
      });

      router.push(
        `/appointment/confirm?${params.toString()}`
      );
    } catch (error: any) {
      console.error(
        "Appointment booking failed:",
        error
      );

      setSubmitError(
        getErrorMessage(error)
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------
  // FILTER DOCTORS
  // ---------------------------------------------------------

  const availableDoctors = selectedSpecialty
    ? allDoctors.filter(
        (doctor) =>
          doctor.specialtyId ===
          selectedSpecialty.id
      )
    : [];

  // ---------------------------------------------------------
  // DATA ERROR
  // ---------------------------------------------------------

  if (dataError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto px-4 py-16">
          <EmptyState
            title="Unable to load booking information"
            message={dataError}
          />
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/patient/dashboard"
            className="hover:text-primary"
          >
            Dashboard
          </Link>

          <ChevronRight className="h-4 w-4" />

          <span className="text-foreground">
            Book Appointment
          </span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Book an Appointment
          </h1>

          <p className="mt-2 text-muted-foreground">
            Select your preferred specialty,
            doctor, date and time.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-10 flex items-center justify-between">
          {STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const active =
              currentStep >= stepNumber;

            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted bg-background text-muted-foreground"
                    }`}
                  >
                    {stepNumber}
                  </div>

                  <span
                    className={`mt-2 text-xs sm:text-sm ${
                      active
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step}
                  </span>
                </div>

                {index <
                  STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 ${
                      currentStep >
                      stepNumber
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* STEP 1 */}
        {currentStep === 1 && (
          <section>
            <h2 className="mb-2 text-xl font-semibold">
              Choose a Specialty
            </h2>

            <p className="mb-6 text-sm text-muted-foreground">
              Select the type of specialist you
              want to consult.
            </p>

            {fieldErrors.specialty && (
              <p className="mb-4 text-sm font-medium text-destructive">
                {fieldErrors.specialty}
              </p>
            )}

            {dataLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-32 animate-pulse rounded-xl border bg-muted/30"
                    />
                  )
                )}
              </div>
            ) : specialties.length ===
              0 ? (
              <EmptyState
                title="No specialties available"
                message="No medical specialties are currently available."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {specialties.map(
                  (specialty) => {
                    const selected =
                      selectedSpecialty?.id ===
                      specialty.id;

                    return (
                      <button
                        type="button"
                        key={specialty.id}
                        onClick={() => {
                          setSelectedSpecialty(
                            specialty
                          );

                          setSelectedDoctor(
                            null
                          );

                          setSelectedTime("");

                          clearFieldError(
                            "specialty"
                          );
                        }}
                        className={`rounded-xl border p-5 text-left transition hover:border-primary ${
                          selected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "bg-card"
                        }`}
                      >
                        <div className="mb-3 text-3xl">
                          {specialty.icon}
                        </div>

                        <h3 className="font-semibold">
                          {specialty.name}
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {
                            specialty.description
                          }
                        </p>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <section>
            <h2 className="mb-2 text-xl font-semibold">
              Choose a Doctor
            </h2>

            <p className="mb-6 text-sm text-muted-foreground">
              Select a doctor from the available
              specialists.
            </p>

            {fieldErrors.doctor && (
              <p className="mb-4 text-sm font-medium text-destructive">
                {fieldErrors.doctor}
              </p>
            )}

            {availableDoctors.length ===
            0 ? (
              <EmptyState
                title="No doctors available"
                message="There are no available doctors for this specialty."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {availableDoctors.map(
                  (doctor) => {
                    const selected =
                      selectedDoctor?.id ===
                      doctor.id;

                    return (
                      <button
                        type="button"
                        key={doctor.id}
                        onClick={() => {
                          setSelectedDoctor(
                            doctor
                          );

                          setSelectedTime("");

                          clearFieldError(
                            "doctor"
                          );
                        }}
                        className={`flex items-center gap-4 rounded-xl border p-5 text-left transition hover:border-primary ${
                          selected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "bg-card"
                        }`}
                      >
                        <img
                          src={doctor.avatar}
                          alt={doctor.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />

                        <div className="min-w-0">
                          <h3 className="font-semibold">
                            Dr.{" "}
                            {doctor.name}
                          </h3>

                          <p className="text-sm text-muted-foreground">
                            {
                              selectedSpecialty?.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {
                              doctor.experience
                            }{" "}
                            years experience
                            {" • "}
                            ⭐{" "}
                            {doctor.rating}
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <section>
            <h2 className="mb-2 text-xl font-semibold">
              Select Date & Time
            </h2>

            <p className="mb-6 text-sm text-muted-foreground">
              Choose an available date and
              appointment time.
            </p>

            {/* Date */}
            <div className="mb-8">
              <label
                htmlFor="appointment-date"
                className="mb-2 block text-sm font-medium"
              >
                Appointment Date
              </label>

              <input
                id="appointment-date"
                type="date"
                min={getTodayLocalDate()}
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(
                    event.target.value
                  );

                  setSelectedTime("");

                  clearFieldError("date");
                }}
                className="w-full rounded-lg border bg-background px-4 py-3 sm:max-w-sm"
              />

              {fieldErrors.date && (
                <p className="mt-2 text-sm font-medium text-destructive">
                  {fieldErrors.date}
                </p>
              )}
            </div>

            {/* Time */}
            <div>
              <h3 className="mb-3 text-sm font-medium">
                Available Time Slots
              </h3>

              {fieldErrors.time && (
                <p className="mb-3 text-sm font-medium text-destructive">
                  {fieldErrors.time}
                </p>
              )}

              {slotsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading available time
                  slots...
                </div>
              ) : slotsError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">
                    {slotsError}
                  </p>
                </div>
              ) : timeSlots.length ===
                0 ? (
                <div className="rounded-lg border p-5 text-sm text-muted-foreground">
                  No available time slots
                  for this doctor on the
                  selected date.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {timeSlots.map(
                    (time) => {
                      const selected =
                        selectedTime ===
                        time;

                      return (
                        <button
                          type="button"
                          key={time}
                          onClick={() => {
                            setSelectedTime(
                              time
                            );

                            clearFieldError(
                              "time"
                            );
                          }}
                          className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:border-primary hover:bg-primary/5"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* STEP 4 */}
        {currentStep === 4 && (
          <section>
            <h2 className="mb-2 text-xl font-semibold">
              Confirm Appointment
            </h2>

            <p className="mb-6 text-sm text-muted-foreground">
              Please review your appointment
              details before confirming.
            </p>

            <div className="max-w-2xl rounded-xl border bg-card p-6">
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Specialty
                  </p>

                  <p className="mt-1 font-medium">
                    {
                      selectedSpecialty?.name
                    }
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Doctor
                  </p>

                  <p className="mt-1 font-medium">
                    Dr.{" "}
                    {selectedDoctor?.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Date
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedDate}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Time
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedTime}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Location
                  </p>

                  <p className="mt-1 font-medium">
                    MedNovi Medical Center,
                    Suite 402
                  </p>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="mt-5 max-w-2xl rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  {submitError}
                </p>
              </div>
            )}
          </section>
        )}

        {/* NAVIGATION */}
        <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={
              currentStep === 1 ||
              submitting
            }
            className="rounded-lg border px-5 py-3 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming Booking...
                </>
              ) : (
                "Confirm Booking"
              )}
            </button>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}