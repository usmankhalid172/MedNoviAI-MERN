"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import { EmptyState } from "@/components/shared/EmptyState";
import api from "@/lib/api";
import { ChevronRight, Loader2 } from "lucide-react";
import Footer from "@/components/shared/Footer";

interface Doctor {
  id: string;
  name: string;
  specialtyId: string;
  experience: string;
  rating: number;
  avatar: string;
}

interface Specialty {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const STEPS = ["Specialty", "Doctor", "Date & Time", "Confirm"];

function StepSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-4 rounded-xl border border-slate-200 animate-pulse">
          <div className="h-6 w-6 rounded bg-slate-200 mb-2" />
          <div className="h-4 w-1/2 rounded bg-slate-200 mb-1" />
          <div className="h-3 w-2/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function DoctorListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center p-4 rounded-xl border border-slate-200 animate-pulse">
          <div className="w-14 h-14 rounded-full bg-slate-200 mr-4 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            <div className="h-3 w-1/3 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-12 rounded-full bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        setDataLoading(true);
        const [specRes, docRes] = await Promise.all([
          api.get("/specialties").catch(() => ({ data: null })),
          api.get("/doctors").catch(() => ({ data: null })),
        ]);
        if (!cancelled) {
          const specData = specRes.data?.specialties || specRes.data?.data || specRes.data;
          setSpecialties(Array.isArray(specData) ? specData : []);
          const docData = docRes.data?.doctors || docRes.data?.data || docRes.data;
          setAllDoctors(Array.isArray(docData) ? docData : []);
        }
      } catch {
        if (!cancelled) setDataError("Unable to load booking data. Please try again later.");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedDoctor || currentStep !== 3) return;

    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      setSlotsLoading(true);
      setSlotsError(null);
      setSelectedTime("");
    });

    api
      .get(`/doctors/${selectedDoctor.id}/availability`, {
        params: { date: selectedDate },
      })
      .then((res) => {
        const data = res.data?.slots || res.data?.availability || res.data?.data || res.data;
        if (!cancelled && Array.isArray(data)) {
          setTimeSlots(
            data
              .map((slot: string | { time: string }) =>
                typeof slot === "string" ? slot : slot?.time
              )
              .filter(Boolean)
          );
        } else if (!cancelled) {
          setTimeSlots([]);
        }
      })
      .catch(() => {
        if (!cancelled) setSlotsError("Unable to load available time slots. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedDoctor, currentStep, selectedDate]);

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 4 || !selectedDoctor || !selectedSpecialty || !selectedTime) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await api.post("/appointments", {
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialty: selectedSpecialty.name,
        date: selectedDate,
        time: selectedTime,
        location: "MedNovi Medical Center, Suite 402",
      });

      const created = res.data?.appointment || res.data?.data || res.data;
      const bookingRef =
        created?.id ||
        created?.bookingId ||
        "MN-" + Math.floor(100000 + Math.random() * 900000);

      const query = new URLSearchParams({
        specialty: selectedSpecialty.name,
        doctor: selectedDoctor.name,
        date: selectedDate,
        time: selectedTime,
        bookingId: bookingRef,
      }).toString();

      router.push(`/appointment/confirm?${query}`);
    } catch {
      setSubmitError("Unable to confirm your booking. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const availableDoctors = allDoctors.filter(
    (doc) => doc.specialtyId === selectedSpecialty?.id
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen w-full bg-slate-50 px-4 py-24 sm:px-6 sm:py-28 font-sans">
        <div className="mx-auto mb-4 max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="font-semibold transition hover:text-blue-600">Home</Link>
              </li>
              <li><ChevronRight className="size-3.5 text-slate-400" /></li>
              <li aria-current="page" className="font-semibold text-blue-600">Book Appointment</li>
            </ol>
          </nav>
        </div>
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-900 px-5 py-6 text-white sm:px-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center rounded-lg bg-blue-500 px-3 
                py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-blue-700"
              >
                &larr; Go Back
              </button>
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-blue-100">Appointment</span>
            </div>
            <h1 className="text-2xl font-bold">Book an Appointment</h1>
            <p className="text-blue-100 text-sm mt-1">
              Complete the 4 steps to book your consultation.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-8">
            <div className="flex justify-between items-center">
              {STEPS.map((stepLabel, idx) => {
                const stepNum = idx + 1;
                const isActive = currentStep === stepNum;
                const isCompleted = currentStep > stepNum;
                return (
                  <div key={stepLabel} className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      isCompleted ? "bg-emerald-500 text-white" : isActive ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      {isCompleted ? "✓" : stepNum}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${isActive ? "text-blue-600 font-semibold" : "text-slate-500"}`}>
                      {stepLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-8">
            <form onSubmit={handleFinalSubmit}>
              {/* STEP 1: Select Specialty */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-800">Step 1: Select Specialty</h2>
                  {dataLoading ? (
                    <StepSkeleton />
                  ) : dataError ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <p className="text-sm font-semibold text-slate-700">{dataError}</p>
                    </div>
                  ) : specialties.length === 0 ? (
                    <EmptyState title="No specialties available" message="Specialty data will appear here once connected to the server." />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {specialties.map((spec) => {
                        const isSelected = selectedSpecialty?.id === spec.id;
                        return (
                          <div
                            key={spec.id}
                            onClick={() => { setSelectedSpecialty(spec); setSelectedDoctor(null); }}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelected ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="text-2xl mb-2">{spec.icon}</div>
                            <h3 className="font-semibold text-slate-800">{spec.name}</h3>
                            <p className="text-xs text-slate-500 mt-1">{spec.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Select Doctor */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-800">
                    Step 2: Choose Doctor ({selectedSpecialty?.name})
                  </h2>
                  {dataLoading ? (
                    <DoctorListSkeleton />
                  ) : availableDoctors.length === 0 ? (
                    <EmptyState title="No doctors available" message="No doctors are listed for this specialty yet. Please try a different specialty." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-90 overflow-y-auto pr-1">
                      {availableDoctors.map((doc) => {
                        const isSelected = selectedDoctor?.id === doc.id;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => setSelectedDoctor(doc)}
                            className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelected ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <img src={doc.avatar} alt={doc.name} className="w-14 h-14 rounded-full object-cover mr-4" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-800">{doc.name}</h3>
                              <p className="text-xs text-slate-500">{doc.experience}</p>
                            </div>
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                              ★ {doc.rating}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Date & Time Picker */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-slate-800">Step 3: Select Date & Time Slot</h2>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Choose Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Available Slots</label>
                    {slotsLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                        ))}
                      </div>
                    ) : slotsError ? (
                      <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{slotsError}</p>
                    ) : timeSlots.length === 0 ? (
                      <EmptyState
                        title="No time slots available"
                        message="No open slots are available for this doctor on the selected date."
                      />
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {timeSlots.map((slot) => {
                          const isSelected = selectedTime === slot;
                          return (
                            <button type="button" key={slot} onClick={() => setSelectedTime(slot)} className={`p-3 text-xs font-semibold rounded-lg border transition-all ${
                              isSelected ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:border-slate-300 text-slate-700"
                            }`}>
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: Confirm Booking */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-800">Step 4: Confirm Booking Summary</h2>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3 text-sm">
                    {[
                      { label: "Specialty:", value: selectedSpecialty?.name },
                      { label: "Doctor:", value: selectedDoctor?.name },
                      { label: "Date:", value: selectedDate },
                      { label: "Time Slot:", value: selectedTime },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                        <span className="shrink-0 text-slate-500">{label}</span>
                        <span className="min-w-0 text-right font-semibold text-slate-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {submitError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>}
              <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    currentStep === 1 ? "opacity-0 cursor-default" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Back
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={
                      (currentStep === 1 && !selectedSpecialty) ||
                      (currentStep === 2 && !selectedDoctor) ||
                      (currentStep === 3 && (!selectedDate || !selectedTime))
                    }
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!selectedDoctor || !selectedSpecialty || submitting}
                    className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Confirming...
                      </>
                    ) : (
                      "Confirm Booking"
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
