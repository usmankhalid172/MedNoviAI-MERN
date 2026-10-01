"use client";
import { Suspense } from "react";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import EmptyState from "@/components/shared/EmptyState";
import Footer from "@/components/shared/Footer";
import { supabase } from "@/lib/supabase";
import {
  WEEK_DAYS,
  availableWeekdays,
  buildAvailableSlots,
  fetchBookedTimes,
  fetchDoctorAvailability,
  fromLocalDateString,
  resolveWindow,
  weekdayForDate,
  type AvailabilityWindow,
} from "@/lib/doctorSlots";
import { ChevronRight, Loader2, Check } from "lucide-react";
import { toast, Toaster } from "sonner";
import { bookAppointment, isSlotConflict } from "@/lib/appointmentsClient";

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


const STEPS = ["Specialty", "Doctor", "Date & Time", "Confirm"];

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


function normalizeSpecialtyName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolves the Specialty a doctor belongs to.
 *
 * `specialties.name` and `doctors.specialty` are free-text and drift apart in
 * practice ("Cardiology" vs "Cardiologist"). An exact match is preferred, but
 * a doctor whose specialty is missing from the table still gets a synthetic
 * entry so the wizard can preselect them instead of dead-ending on step 1.
 */
function findSpecialtyForDoctor(
  specialties: Specialty[],
  doctorSpecialty: string
): Specialty {
  const target = normalizeSpecialtyName(doctorSpecialty);
  const match = specialties.find(
    (s) => normalizeSpecialtyName(s.name) === target
  );
  if (match) return match;

  const partial = specialties.find(
    (s) =>
      target.includes(normalizeSpecialtyName(s.name)) ||
      normalizeSpecialtyName(s.name).includes(target)
  );
  if (partial) return partial;

  const name = doctorSpecialty.trim() || "General";
  return {
    id: `synthetic:${target || "general"}`,
    name,
    icon: "🏥",
    description: `Consult with our ${name} specialists.`,
  };
}


// Booking now runs through /api/appointments, which reports a specific failure
// code per cause, so this only needs to render an unexpected error verbatim.
function getErrorMessage(error: unknown): string {
  const err = error as { message?: string; code?: string };
  if (/network|fetch|failed to fetch|connection/i.test(err?.message || "")) {
    return "Network error. Please check your internet connection.";
  }
  return err?.message || "Something went wrong while booking. Please try again.";
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
                  {isCompleted ? <Check className="h-6 w-6" strokeWidth={3} /> : stepNumber}
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
// Page Content
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
  const [availabilityHours, setAvailabilityHours] = useState<AvailabilityWindow[]>([]);
  const [availabilityPending, setAvailabilityPending] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Bumped when a booking loses a race for a slot, so the grid reloads and the
  // time just taken disappears instead of still being offered.
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    async function loadData() {
      try {
        setDataLoading(true);
        setDataError(null);

        if (!supabase) throw new Error("Supabase is not configured.");

        const [specialtiesResult, doctorsResult] = await Promise.all([
          supabase.from("specialties").select("id, name").order("name"),
          supabase.from("doctors").select("id, full_name, specialty, rating, avatar_url, availability"),
        ]);

        if (specialtiesResult.error) throw specialtiesResult.error;
        if (doctorsResult.error) throw doctorsResult.error;

        const specialtyData: Specialty[] = (specialtiesResult.data as SpecialtyRow[] | null)?.map((s) => ({
          id: s.id,
          name: s.name,
          icon: "🏥",
          description: `Consult with our ${s.name} specialists.`,
        })) || [];

        const doctorData: Doctor[] = (doctorsResult.data as DoctorRow[] | null)?.map((d) => ({
          id: d.id,
          name: d.full_name || "Doctor",
          specialty: d.specialty || "General",
          experience: "Experience on profile",
          rating: d.rating || 0,
          avatar: d.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.full_name || "Doctor")}`,
          availability: d.availability || "",
        })) || [];

        setSpecialties(specialtyData);
        setAllDoctors(doctorData);

        if (requestedDoctorId) {
          const reqDoctor = doctorData.find((d) => d.id === requestedDoctorId);
          if (reqDoctor) {
            setSelectedDoctor(reqDoctor);
            // A doctor reached via ?doctorId= is already chosen; the specialty
            // is implied. This used to require an exact specialties.name ==
            // doctors.specialty string match, which silently stranded the
            // wizard on step 1 whenever the two drifted apart.
            setSelectedSpecialty(
              findSpecialtyForDoctor(specialtyData, reqDoctor.specialty)
            );
            setCurrentStep(2);
          } else {
            setDataError(
              "That doctor could not be found. Please pick a doctor from the list."
            );
          }
        }
      } catch (error) {
        console.error("Failed to load booking data:", error);
        const errorMsg = "Unable to load doctors and specialties. Please check your network.";
        setDataError(errorMsg);
        toast.error(errorMsg); // Global Toast
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, [requestedDoctorId]);

  // ─────────── Load time slots ───────────
  useEffect(() => {
    let cancelled = false;

    async function loadTimeSlots() {
      if (!selectedDoctor || currentStep !== 3 || !selectedDate) return;

      try {
        setSlotsLoading(true);
        setSlotsError(null);
        setSelectedTime("");

        if (!supabase) throw new Error("Supabase is not configured.");

        const dateObj = fromLocalDateString(selectedDate);
        const window = resolveWindow(
          availabilityHours,
          weekdayForDate(dateObj)
        );

        // Doctor does not consult on this weekday.
        if (!window) {
          setTimeSlots([]);
          return;
        }

        const booked = await fetchBookedTimes(
          selectedDoctor.id,
          selectedDate
        );
        if (cancelled) return;

        setTimeSlots(
          buildAvailableSlots(window, { booked, selectedDate: dateObj })
        );
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load time slots:", error);
        const errorMsg = "Unable to load available time slots. Please try again.";
        setSlotsError(errorMsg);
        toast.error(errorMsg); // Global Toast
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    loadTimeSlots();
    return () => { cancelled = true; };
  }, [selectedDoctor, selectedDate, currentStep, availabilityHours, slotsVersion]);

  // ─────────── Load the doctor's weekly schedule ───────────
  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      if (!selectedDoctor) {
        setAvailabilityHours([]);
        setAvailabilityPending(false);
        return;
      }

      try {
        setAvailabilityPending(true);
        const hours = await fetchDoctorAvailability(selectedDoctor.id);
        if (!cancelled) setAvailabilityHours(hours);
      } catch {
        if (!cancelled) setAvailabilityHours([]);
      } finally {
        if (!cancelled) setAvailabilityPending(false);
      }
    }

    loadAvailability();
    return () => { cancelled = true; };
  }, [selectedDoctor]);

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
      else if (selectedDate < getTodayLocalDate()) errors.date = "Please select today or a future date.";
      else if (isSelectedDayClosed) errors.date = "The doctor is not available on this day. Please pick another date.";
      if (!selectedTime) errors.time = "Please select an available time slot.";
      else if (timeSlots.length === 0 && !slotsLoading) errors.time = "No slots are available on this date. Please pick another date.";
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

  // ─────────── Final Submit ───────────
  async function handleFinalSubmit() {
    if (!validateCurrentStep()) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const appointmentTime = convertDisplayTimeTo24Hour(selectedTime);

      // Booking goes through the app's own API rather than a direct insert.
      // The API derives patient_id from the caller's token, re-validates the
      // slot against the doctor's configured availability, and the database
      // enforces that a live booking is unique per doctor/date/time. The
      // duplicate pre-check that used to live here was racy: it and the insert
      // were separate requests, so two patients booking one slot could both
      // pass it.
      const result = await bookAppointment({
        doctorId: selectedDoctor!.id,
        date: selectedDate,
        time: appointmentTime,
        notes: null,
      });

      if (!result.ok) {
        // A lost race or a stale slot is recoverable: send the user back to the
        // picker with the slot grid reloaded so they can choose another time.
        if (isSlotConflict(result.code)) {
          toast.error(result.message);
          setSelectedTime("");
          setSlotsVersion((v) => v + 1);
          setCurrentStep(3);
          return;
        }

        throw new Error(result.message);
      }

      const created = result.data.appointment;

      toast.success("Appointment Booked Successfully!");

      const params = new URLSearchParams({
        appointmentId: String(created.id),
        doctorId: selectedDoctor!.id,
        doctor: selectedDoctor!.name,
        specialty: selectedSpecialty!.name,
        date: String(created.appointment_date),
        time: selectedTime,
        status: created.status || "pending",
      });

      router.push(`/appointment/confirm?${params.toString()}`);
    } catch (error) {
      console.error("Appointment booking failed:", error);
      const errMsg = getErrorMessage(error);
      setSubmitError(errMsg);
      toast.error(errMsg); // Show visible toast to patient instead of silent failure
    } finally {
      setSubmitting(false);
    }
  }

  // A doctor belongs to the selected specialty. Routed through the same
  // resolver used to preselect from ?doctorId= so a preselected doctor is
  // never filtered out of its own list.
  const availableDoctors = selectedSpecialty
    ? allDoctors.filter(
        (doctor) =>
          findSpecialtyForDoctor([selectedSpecialty], doctor.specialty)
            .id === selectedSpecialty.id
      )
    : [];

  const consultDays = availableWeekdays(availabilityHours);

  const isSelectedDayClosed = Boolean(
    selectedDoctor &&
      !availabilityPending &&
      consultDays.length > 0 &&
      !consultDays.includes(weekdayForDate(fromLocalDateString(selectedDate)))
  );

  if (dataError) {
    return (
      <div className="min-h-screen bg-background">
        <Toaster position="top-right" richColors />
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
      <Toaster position="top-right" richColors />
      <Navbar />

      <main className="container mx-auto px-4 py-8 pb-32">
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/patient/dashboard" className="transition hover:text-blue-600">Dashboard</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-slate-800">Book Appointment</span>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900">Book an Appointment</h1>
          <p className="mt-2 text-slate-500">Select your preferred specialty, doctor, date and time.</p>
        </div>

        <ProgressSteps currentStep={currentStep} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* STEP 1 */}
          {currentStep === 1 && (
            <section>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">Choose a Specialty</h2>
              <p className="mb-6 text-sm text-slate-500">Select the type of specialist you want to consult.</p>

              {fieldErrors.specialty && (
                <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">{fieldErrors.specialty}</p>
              )}

              {dataLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}
                </div>
              ) : specialties.length === 0 ? (
                <EmptyState title="No specialties available" message="No medical specialties are currently available." />
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
                          selected ? "border-blue-600 bg-blue-50 shadow-md" : "border-slate-200 bg-white hover:border-blue-300"
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
              <p className="mb-6 text-sm text-slate-500">Select a doctor from the available specialists.</p>

              {fieldErrors.doctor && (
                <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">{fieldErrors.doctor}</p>
              )}

              {availableDoctors.length === 0 ? (
                <EmptyState title="No doctors available" message="There are no available doctors for this specialty." />
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
                          selected ? "border-blue-600 bg-blue-50 shadow-md" : "border-slate-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={doctor.avatar} alt={doctor.name} className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-sm" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-900"> {doctor.name}</h3>
                          <p className="text-sm text-blue-600">{selectedSpecialty?.name}</p>
                          <p className="mt-1 text-xs text-slate-500">⭐ {doctor.rating}</p>
                          {doctor.availability && <p className="mt-1 text-xs text-slate-400">Available: {doctor.availability}</p>}
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
              <h2 className="mb-2 text-2xl font-bold text-slate-900">Select Date &amp; Time</h2>
              <p className="mb-6 text-sm text-slate-500">Choose an available date and appointment time.</p>

              <div className="mb-8">
                <label htmlFor="appointment-date" className="mb-2 block text-sm font-semibold text-slate-700">Appointment Date</label>
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
                {fieldErrors.date && <p className="mt-2 text-sm font-medium text-red-600">{fieldErrors.date}</p>}

                {selectedDoctor && !availabilityPending && (
                  consultDays.length === WEEK_DAYS.length ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Dr. {selectedDoctor.name} is available all week.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Dr. {selectedDoctor.name} consults on:{" "}
                      <span className="font-medium text-slate-700">
                        {consultDays.join(", ")}
                      </span>
                    </p>
                  )
                )}

                {isSelectedDayClosed && (
                  <p className="mt-2 text-sm font-medium text-amber-700">
                    Dr. {selectedDoctor?.name} is not available on this day.
                    Please pick another date.
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Available Time Slots</h3>
                {fieldErrors.time && <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">{fieldErrors.time}</p>}

                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading available time slots...
                  </div>
                ) : slotsError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-600">{slotsError}</p>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No available time slots for this doctor on the selected date. Please pick another day.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {timeSlots.map((time) => {
                      const selected = selectedTime === time;
                      return (
                        <button
                          type="button"
                          key={time}
                          onClick={() => { setSelectedTime(time); clearFieldError("time"); }}
                          className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                            selected ? "border-blue-600 bg-blue-600 text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50"
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

          {currentStep === 4 && (
            <section>
              <h2 className="mb-2 text-2xl font-bold text-slate-900">Confirm Appointment</h2>
              <p className="mb-6 text-sm text-slate-500">Please review your appointment details before confirming.</p>

              <div className="max-w-2xl rounded-xl border-2 border-slate-100 bg-slate-50 p-6">
                <div className="space-y-5">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <p className="text-sm text-slate-500">Specialty</p>
                    <p className="font-semibold text-slate-900">{selectedSpecialty?.name}</p>
                  </div>
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <p className="text-sm text-slate-500">Doctor</p>
                    <p className="font-semibold text-slate-900">{selectedDoctor?.name}</p>
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
            </section>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
          {submitError && (
            <div
              role="alert"
              className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {submitError}
            </div>
          )}

          <div className="container mx-auto flex flex-col-reverse gap-3 px-4 py-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className="rounded-lg border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold
               text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                  <><Loader2 className="h-4 w-4 animate-spin" /> Confirming...</>
                ) : ("Confirm Booking")}
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">
      Loading booking details...</div>}>
      <BookAppointmentContent />
    </Suspense>
  );
}