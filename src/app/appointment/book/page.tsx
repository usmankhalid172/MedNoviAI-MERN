"use client";

import { Suspense } from "react";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import EmptyState from "@/components/shared/EmptyState";
import Footer from "@/components/shared/Footer";
import { supabase } from "@/lib/supabase";
import { ChevronRight, Loader2, Check } from "lucide-react";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  avatar: string;
  availability: string;
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

interface SpecialtyRow {
  id: string;
  name: string;
}

interface DoctorRow {
  id: string;
  full_name: string | null;
  specialty: string | null;
  rating: number | null;
  avatar_url: string | null;
  availability: string | null;
}

interface BookedRow {
  appointment_time: string;
}

const STEPS = ["Specialty", "Doctor", "Date & Time", "Confirm"];
const WEEKDAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─────────────────────────────────────────────────────────
// Date / time helpers
// ─────────────────────────────────────────────────────────

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function convertDisplayTimeTo24Hour(time: string): string {
  const [timePart, modifier] = time.split(" ");
  const [hStr, mStr] = timePart.split(":");
  let hours = Number(hStr);
  const minutes = Number(mStr);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  let hours = Number(hStr);
  const modifier = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${mStr} ${modifier}`;
}

/**
 * Parse a doctor.availability string into a Set of weekday abbreviations.
 * Handles both "Mon-Fri" ranges and "Mon, Wed, Fri" lists.
 * Also handles "Mon-Sat", "Tue, Thu, Sat", etc.
 */
function parseAvailabilityToDays(availability: string): Set<string> {
  const allowed = new Set<string>();
  if (!availability) return allowed;

  // Normalize: "Mon" / "Monday" / "MON" → "Mon"
  const normalize = (token: string): string | null => {
    const t = token.trim().slice(0, 3).toLowerCase();
    const match = WEEKDAY_ORDER.find((d) => d.toLowerCase() === t);
    return match || null;
  };

  // 1. Handle ranges like "Mon-Fri" or "Mon - Fri"
  const rangeMatches = availability.matchAll(
    /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s*-\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*/gi
  );
  const rangesConsumed = new Set<string>();
  for (const match of rangeMatches) {
    const start = normalize(match[1]);
    const end = normalize(match[2]);
    if (!start || !end) continue;
    const startIdx = WEEKDAY_ORDER.indexOf(start);
    const endIdx = WEEKDAY_ORDER.indexOf(end);
    if (startIdx === -1 || endIdx === -1) continue;

    if (startIdx <= endIdx) {
      for (let i = startIdx; i <= endIdx; i++) allowed.add(WEEKDAY_ORDER[i]);
    } else {
      // Wrap-around e.g. "Fri-Mon"
      for (let i = startIdx; i < 7; i++) allowed.add(WEEKDAY_ORDER[i]);
      for (let i = 0; i <= endIdx; i++) allowed.add(WEEKDAY_ORDER[i]);
    }
    rangesConsumed.add(match[0]);
  }

  // 2. Handle comma-separated lists (skip tokens already part of a range)
  let remainder = availability;
  rangesConsumed.forEach((r) => {
    remainder = remainder.replace(r, "");
  });

  remainder.split(/[,\s]+/).forEach((token) => {
    const day = normalize(token);
    if (day) allowed.add(day);
  });

  return allowed;
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), timeoutMs);
    Promise.resolve(promise).then(
      (result) => { clearTimeout(timeoutId); resolve(result); },
      (error) => { clearTimeout(timeoutId); reject(error); }
    );
  });
}

function getErrorMessage(error: unknown): string {
  const err = error as { message?: string; code?: string };
  if (err?.message === "REQUEST_TIMEOUT") {
    return "The request took too long. Please check your internet connection and try again.";
  }
  if (err?.code === "23505" || /duplicate|unique|already exists/i.test(err?.message || "")) {
    return "This appointment slot has just been booked by someone else. Please select another time.";
  }
  if (/network|fetch|failed to fetch|connection/i.test(err?.message || "")) {
    return "Network error. Please check your internet connection and try again.";
  }
  return err?.message || "Something went wrong while booking your appointment. Please try again.";
}

// ─────────────────────────────────────────────────────────
// Progress Steps
// ─────────────────────────────────────────────────────────

function ProgressSteps({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-bold transition-all duration-300 ${
                    isCompleted
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-6 w-6" strokeWidth={3} />
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={`text-xs font-semibold uppercase tracking-wide sm:text-sm ${
                    isCompleted || isActive ? "text-blue-700" : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div className="relative mx-3 h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full bg-blue-600 transition-all duration-500 ${
                      currentStep > stepNumber ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

function BookAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDoctorId = searchParams.get("doctorId");

  const [currentStep, setCurrentStep] = useState(1);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState(getTodayLocalDate());
  const [selectedTime, setSelectedTime] = useState("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ─────────── Load specialties + doctors ───────────
  useEffect(() => {
    async function loadData() {
      try {
        setDataLoading(true);
        setDataError(null);

        if (!supabase) throw new Error("Supabase is not configured.");

        const [specialtiesResult, doctorsResult] = await Promise.all([
          supabase.from("specialties").select("id, name").order("name"),
          supabase
            .from("doctors")
            .select("id, full_name, specialty, rating, avatar_url, availability"),
        ]);

        if (specialtiesResult.error) throw specialtiesResult.error;
        if (doctorsResult.error) throw doctorsResult.error;

        const specialtyData: Specialty[] =
          (specialtiesResult.data as SpecialtyRow[] | null)?.map((s) => ({
            id: s.id,
            name: s.name,
            icon: "🏥",
            description: `Consult with our ${s.name} specialists.`,
          })) || [];

        const doctorData: Doctor[] =
          (doctorsResult.data as DoctorRow[] | null)?.map((d) => ({
            id: d.id,
            name: d.full_name || "Doctor",
            specialty: d.specialty || "General",
            experience: "Experience on profile",
            rating: d.rating || 0,
            avatar:
              d.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                d.full_name || "Doctor"
              )}`,
            availability: d.availability || "",
          })) || [];

        setSpecialties(specialtyData);
        setAllDoctors(doctorData);

        if (requestedDoctorId) {
          const reqDoctor = doctorData.find((d) => d.id === requestedDoctorId);
          if (reqDoctor) {
            setSelectedDoctor(reqDoctor);
            const reqSpecialty = specialtyData.find(
              (s) => s.name.toLowerCase() === reqDoctor.specialty.toLowerCase()
            );
            if (reqSpecialty) {
              setSelectedSpecialty(reqSpecialty);
              setCurrentStep(2);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load booking data:", error);
        setDataError("Unable to load doctors and specialties. Please try again.");
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, [requestedDoctorId]);

  // ─────────── Load time slots (Option B — parse doctors.availability) ───────────
  useEffect(() => {
    async function loadTimeSlots() {
      if (!selectedDoctor || currentStep !== 3 || !selectedDate) return;

      try {
        setSlotsLoading(true);
        setSlotsError(null);
        setSelectedTime("");

        if (!supabase) throw new Error("Supabase is not configured.");

        // 1. Parse the doctor's availability string
        const allowedDays = parseAvailabilityToDays(selectedDoctor.availability);

        // 2. Determine the abbreviation for the selected date's weekday
        const dateObj = new Date(`${selectedDate}T00:00:00`);
        const selectedAbbr = WEEKDAY_ORDER[dateObj.getDay()];

        console.log("[slots] doctor:", selectedDoctor.name, {
          availability: selectedDoctor.availability,
          allowedDays: Array.from(allowedDays),
          selectedDate,
          selectedAbbr,
        });

        // 3. If this weekday isn't in the allowed set → empty
        if (!allowedDays.has(selectedAbbr)) {
          setTimeSlots([]);
          return;
        }

        // 4. Fetch already-booked appointments for that day
        const { data: bookedAppointments, error: appointmentsError } = await supabase
          .from("appointments")
          .select("appointment_time")
          .eq("doctor_id", selectedDoctor.id)
          .eq("appointment_date", selectedDate)
          .in("status", ["pending", "confirmed"]);

        if (appointmentsError) throw appointmentsError;

        const bookedTimes = new Set(
          (bookedAppointments as BookedRow[] | null || []).map((a) =>
            String(a.appointment_time).slice(0, 5)
          )
        );

        // 5. Generate 30-min slots from 09:00 to 17:00
        const generatedSlots: string[] = [];
        const startHour = 9;
        const endHour = 17;

        // If selected date is today, hide slots that already passed
        const isToday = selectedDate === getTodayLocalDate();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (let h = startHour; h < endHour; h++) {
          for (let m = 0; m < 60; m += 30) {
            const slotMinutes = h * 60 + m;

            // Skip past slots when booking for today
            if (isToday && slotMinutes <= currentMinutes + 30) continue;

            const time24 = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            if (!bookedTimes.has(time24)) {
              generatedSlots.push(formatTime(time24));
            }
          }
        }

        setTimeSlots(generatedSlots);
      } catch (error) {
        console.error("Failed to load time slots:", error);
        setSlotsError("Unable to load available time slots. Please try again.");
      } finally {
        setSlotsLoading(false);
      }
    }
    loadTimeSlots();
  }, [selectedDoctor, selectedDate, currentStep]);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((previous) => ({ ...previous, [field]: undefined }));
    setSubmitError(null);
  }

  function validateCurrentStep() {
    const errors: FieldErrors = {};
    if (currentStep === 1 && !selectedSpecialty) errors.specialty = "Please select a specialty.";
    if (currentStep === 2 && !selectedDoctor) errors.doctor = "Please select a doctor.";
    if (currentStep === 3) {
      if (!selectedDate) errors.date = "Please select an appointment date.";
      else if (selectedDate < getTodayLocalDate())
        errors.date = "Please select today or a future date.";
      if (!selectedTime) errors.time = "Please select an available time slot.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    setSubmitError(null);
    if (!validateCurrentStep()) return;
    if (currentStep < 4) {
      setCurrentStep((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    setSubmitError(null);
    if (currentStep > 1) {
      setCurrentStep((p) => p - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleFinalSubmit() {
    const allErrors: FieldErrors = {};
    if (!selectedSpecialty) allErrors.specialty = "Please select a specialty.";
    if (!selectedDoctor) allErrors.doctor = "Please select a doctor.";
    if (!selectedDate) allErrors.date = "Please select an appointment date.";
    else if (selectedDate < getTodayLocalDate())
      allErrors.date = "Please select today or a future date.";
    if (!selectedTime) allErrors.time = "Please select an available time slot.";

    setFieldErrors(allErrors);
    if (Object.keys(allErrors).length > 0) return;

    if (!supabase) {
      setSubmitError("Supabase is not configured.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.getUser()
      );
      if (authError) throw authError;
      if (!authData?.user?.id) {
        setSubmitError("Your session could not be found. Please log in again.");
        return;
      }

      const userId = authData.user.id;

      const { data: profile, error: profileError } = await withTimeout(
        supabase.from("profiles").select("id").eq("id", userId).maybeSingle()
      );
      if (profileError) throw profileError;
      if (!profile) {
        setSubmitError(
          "Your profile was not found. Please complete your profile first."
        );
        return;
      }

      const appointmentTime = convertDisplayTimeTo24Hour(selectedTime);

      const { data: existingAppointment, error: duplicateError } = await withTimeout(
        supabase
          .from("appointments")
          .select("id")
          .eq("doctor_id", selectedDoctor!.id)
          .eq("appointment_date", selectedDate)
          .eq("appointment_time", appointmentTime)
          .in("status", ["pending", "confirmed"])
          .maybeSingle()
      );
      if (duplicateError) throw duplicateError;
      if (existingAppointment) {
        setSubmitError("This time slot is no longer available. Please choose another time.");
        setSelectedTime("");
        setCurrentStep(3);
        return;
      }

      const { data: createdAppointment, error: insertError } = await withTimeout(
        supabase
          .from("appointments")
          .insert({
            patient_id: userId,
            doctor_id: selectedDoctor!.id,
            appointment_date: selectedDate,
            appointment_time: appointmentTime,
            status: "pending",
            notes: null,
          })
          .select("id, appointment_date, appointment_time, status")
          .single()
      );
      if (insertError) throw insertError;
      if (!createdAppointment) {
        throw new Error("Appointment was not created. Please try again.");
      }

      const params = new URLSearchParams({
        appointmentId: String(createdAppointment.id),
        doctor: selectedDoctor!.name,
        specialty: selectedSpecialty!.name,
        date: String(createdAppointment.appointment_date),
        time: selectedTime,
        status: createdAppointment.status || "pending",
      });

      router.push(`/appointment/confirm?${params.toString()}`);
    } catch (error) {
      console.error("Appointment booking failed:", error);
      setSubmitError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const availableDoctors = selectedSpecialty
    ? allDoctors.filter(
        (doctor) =>
          doctor.specialty.toLowerCase() === selectedSpecialty.name.toLowerCase()
      )
    : [];

  if (dataError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <EmptyState title="Unable to load booking information" message={dataError} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="container mx-auto px-4 py-8 pb-32">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/patient/dashboard" className="transition hover:text-blue-600">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-800">Book Appointment</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900">Book an Appointment</h1>
          <p className="mt-2 text-slate-500">
            Select your preferred specialty, doctor, date and time.
          </p>
        </div>

        {/* Progress */}
        <ProgressSteps currentStep={currentStep} />

        {/* Content Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* STEP 1 */}
          {currentStep === 1 && (
            <section>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">Choose a Specialty</h2>
              <p className="mb-6 text-sm text-slate-500">
                Select the type of specialist you want to consult.
              </p>

              {fieldErrors.specialty && (
                <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
                  {fieldErrors.specialty}
                </p>
              )}

              {dataLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100" />
                  ))}
                </div>
              ) : specialties.length === 0 ? (
                <EmptyState
                  title="No specialties available"
                  message="No medical specialties are currently available."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {specialties.map((specialty) => {
                    const selected = selectedSpecialty?.id === specialty.id;
                    return (
                      <button
                        type="button"
                        key={specialty.id}
                        onClick={() => {
                          setSelectedSpecialty(specialty);
                          setSelectedDoctor(null);
                          setSelectedTime("");
                          clearFieldError("specialty");
                        }}
                        className={`group rounded-xl border-2 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                          selected
                            ? "border-blue-600 bg-blue-50 shadow-md"
                            : "border-slate-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <div className="mb-3 text-3xl">{specialty.icon}</div>
                        <h3 className="font-semibold text-slate-900">{specialty.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{specialty.description}</p>
                        {selected && (
                          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600">
                            <Check className="h-3.5 w-3.5" /> Selected
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <section>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">Choose a Doctor</h2>
              <p className="mb-6 text-sm text-slate-500">
                Select a doctor from the available specialists.
              </p>

              {fieldErrors.doctor && (
                <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
                  {fieldErrors.doctor}
                </p>
              )}

              {availableDoctors.length === 0 ? (
                <EmptyState
                  title="No doctors available"
                  message="There are no available doctors for this specialty."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {availableDoctors.map((doctor) => {
                    const selected = selectedDoctor?.id === doctor.id;
                    return (
                      <button
                        type="button"
                        key={doctor.id}
                        onClick={() => {
                          setSelectedDoctor(doctor);
                          setSelectedTime("");
                          clearFieldError("doctor");
                        }}
                        className={`flex items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                          selected
                            ? "border-blue-600 bg-blue-50 shadow-md"
                            : "border-slate-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={doctor.avatar}
                          alt={doctor.name}
                          className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-900">
                            Dr. {doctor.name}
                          </h3>
                          <p className="text-sm text-blue-600">{selectedSpecialty?.name}</p>
                          <p className="mt-1 text-xs text-slate-500">⭐ {doctor.rating}</p>
                          {doctor.availability && (
                            <p className="mt-1 text-xs text-slate-400">
                              Available: {doctor.availability}
                            </p>
                          )}
                        </div>
                        {selected && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600">
                            <Check className="h-4 w-4 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <section>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">
                Select Date &amp; Time
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Choose an available date and appointment time.
              </p>

              <div className="mb-8">
                <label
                  htmlFor="appointment-date"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Appointment Date
                </label>
                <input
                  id="appointment-date"
                  type="date"
                  min={getTodayLocalDate()}
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setSelectedTime("");
                    clearFieldError("date");
                  }}
                  className="w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 sm:max-w-sm"
                />
                {fieldErrors.date && (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    {fieldErrors.date}
                  </p>
                )}

                {selectedDoctor?.availability && (
                  <p className="mt-2 text-xs text-slate-500">
                    Dr. {selectedDoctor.name} is available:{" "}
                    <span className="font-medium text-slate-700">
                      {selectedDoctor.availability}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Available Time Slots
                </h3>
                {fieldErrors.time && (
                  <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
                    {fieldErrors.time}
                  </p>
                )}

                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading available time slots...
                  </div>
                ) : slotsError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-600">{slotsError}</p>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No available time slots for this doctor on the selected date. Please
                    pick another day when the doctor is available.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {timeSlots.map((time) => {
                      const selected = selectedTime === time;
                      return (
                        <button
                          type="button"
                          key={time}
                          onClick={() => {
                            setSelectedTime(time);
                            clearFieldError("time");
                          }}
                          className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                            selected
                              ? "border-blue-600 bg-blue-600 text-white shadow-md"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* STEP 4 */}
          {currentStep === 4 && (
            <section>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">
                Confirm Appointment
              </h2>
              <p className="mb-6 text-sm text-slate-500">
                Please review your appointment details before confirming.
              </p>

              <div className="max-w-2xl rounded-xl border-2 border-slate-100 bg-slate-50 p-6">
                <div className="space-y-5">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <p className="text-sm text-slate-500">Specialty</p>
                    <p className="font-semibold text-slate-900">
                      {selectedSpecialty?.name}
                    </p>
                  </div>
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <p className="text-sm text-slate-500">Doctor</p>
                    <p className="font-semibold text-slate-900">
                      Dr. {selectedDoctor?.name}
                    </p>
                  </div>
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <p className="text-sm text-slate-500">Date</p>
                    <p className="font-semibold text-slate-900">{selectedDate}</p>
                  </div>
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-slate-500">Time</p>
                    <p className="font-semibold text-slate-900">{selectedTime}</p>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="mt-5 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-600">{submitError}</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sticky Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="container mx-auto flex flex-col-reverse gap-3 px-4 py-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className="rounded-lg border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
export default function BookAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading booking details...
      </div>
    }>
      <BookAppointmentContent />
    </Suspense>
  );
}