"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/shared/Navbar";

// --- Data Types ---
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

// --- Sample Data ---
const SPECIALTIES: Specialty[] = [
  { id: "cardiology", name: "Cardiology", icon: "❤️", description: "Heart & Vascular health" },
  { id: "neurology", name: "Neurology", icon: "🧠", description: "Brain & Nervous system" },
  { id: "pediatrics", name: "Pediatrics", icon: "👶", description: "Child health care" },
  { id: "dermatology", name: "Dermatology", icon: "🩺", description: "Skin & Hair care" },
];

const DOCTORS: Doctor[] = [
  // Cardiology Doctors
  {
    id: "doc-1",
    name: "Dr. Sarah Jenkins",
    specialtyId: "cardiology",
    experience: "12 Yrs Exp",
    rating: 4.9,
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-5",
    name: "Dr. Marcus Vance",
    specialtyId: "cardiology",
    experience: "14 Yrs Exp",
    rating: 4.8,
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-6",
    name: "Dr. Anita Roy",
    specialtyId: "cardiology",
    experience: "10 Yrs Exp",
    rating: 4.9,
    avatar: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=150&auto=format&fit=crop&q=80",
  },

  // Neurology Doctors
  {
    id: "doc-2",
    name: "Dr. Michael Chen",
    specialtyId: "neurology",
    experience: "9 Yrs Exp",
    rating: 4.8,
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-7",
    name: "Dr. Elena Rostova",
    specialtyId: "neurology",
    experience: "11 Yrs Exp",
    rating: 4.9,
    avatar: "https://images.unsplash.com/photo-1594824813566-78a9c3943314?w=150&auto=format&fit=crop&q=80",
  },

  // Pediatrics Doctors
  {
    id: "doc-3",
    name: "Dr. Emily Watson",
    specialtyId: "pediatrics",
    experience: "15 Yrs Exp",
    rating: 4.9,
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-8",
    name: "Dr. David Kim",
    specialtyId: "pediatrics",
    experience: "7 Yrs Exp",
    rating: 4.7,
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80",
  },

  // Dermatology Doctors
  {
    id: "doc-4",
    name: "Dr. Robert Fox",
    specialtyId: "dermatology",
    experience: "8 Yrs Exp",
    rating: 4.7,
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-9",
    name: "Dr. Sophia Martinez",
    specialtyId: "dermatology",
    experience: "13 Yrs Exp",
    rating: 4.9,
    avatar: "https://images.unsplash.com/photo-1594824813566-78a9c3943314?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-10",
    name: "Dr. James Wilson",
    specialtyId: "dermatology",
    experience: "6 Yrs Exp",
    rating: 4.6,
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
  },
];

const TIME_SLOTS = [
  "09:00 AM",
  "10:30 AM",
  "11:45 AM",
  "02:00 PM",
  "03:30 PM",
  "05:00 PM",
];

const STEPS = ["Specialty", "Doctor", "Date & Time", "Confirm"];

export default function BookAppointmentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Step Navigators
  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Step 4 par Confirm Booking handle karna aur localStorage me save karna
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== 4) return;

    const bookingRef = "MN-" + Math.floor(100000 + Math.random() * 900000);

    const newAppointment = {
      id: bookingRef,
      doctorName: selectedDoctor?.name || "Dr. Sarah Jenkins",
      specialty: selectedSpecialty?.name || "Cardiology",
      date: selectedDate,
      time: selectedTime || "10:30 AM",
      location: "MedNovi Medical Center, Suite 402",
      status: "Scheduled",
    };

    // Existing appointments get karke new item front par array me store karna
    const existingAppointments = JSON.parse(
      localStorage.getItem("appointments") || "[]"
    );
    const updatedAppointments = [newAppointment, ...existingAppointments];
    localStorage.setItem("appointments", JSON.stringify(updatedAppointments));

    const query = new URLSearchParams({
      specialty: newAppointment.specialty,
      doctor: newAppointment.doctorName,
      date: newAppointment.date,
      time: newAppointment.time,
      bookingId: bookingRef,
    }).toString();

    router.push(`/appointment/confirm?${query}`);
  };

  // Filter doctors based on step 1 selection
  const availableDoctors = DOCTORS.filter(
    (doc) => doc.specialtyId === selectedSpecialty?.id
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen w-full bg-slate-50 py-25 sm:pl-20 sm:pr-5 font-sans">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 px-8 py-6 text-white">
            <h1 className="text-2xl font-bold">Book an Appointment</h1>
            <p className="text-blue-100 text-sm mt-1">
              Complete the 4 steps to book your consultation.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="border-b border-slate-100 bg-slate-50/50 px-8 py-4">
            <div className="flex justify-between items-center">
              {STEPS.map((stepLabel, idx) => {
                const stepNum = idx + 1;
                const isActive = currentStep === stepNum;
                const isCompleted = currentStep > stepNum;

                return (
                  <div key={stepLabel} className="flex items-center space-x-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {isCompleted ? "✓" : stepNum}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:inline ${
                        isActive ? "text-blue-600 font-semibold" : "text-slate-500"
                      }`}
                    >
                      {stepLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Body */}
          <div className="p-8">
            <form onSubmit={handleFinalSubmit}>
              {/* STEP 1: Select Specialty */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-800">
                    Step 1: Select Specialty
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {SPECIALTIES.map((spec) => {
                      const isSelected = selectedSpecialty?.id === spec.id;
                      return (
                        <div
                          key={spec.id}
                          onClick={() => {
                            setSelectedSpecialty(spec);
                            setSelectedDoctor(null);
                          }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="text-2xl mb-2">{spec.icon}</div>
                          <h3 className="font-semibold text-slate-800">{spec.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">{spec.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Select Doctor */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-800">
                    Step 2: Choose Doctor ({selectedSpecialty?.name})
                  </h2>

                  <div className="grid grid-cols-1 gap-4 max-h-[360px] overflow-y-auto pr-1">
                    {availableDoctors.map((doc) => {
                      const isSelected = selectedDoctor?.id === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDoctor(doc)}
                          className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <img
                            src={doc.avatar}
                            alt={doc.name}
                            className="w-14 h-14 rounded-full object-cover mr-4"
                          />
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
                </div>
              )}

              {/* STEP 3: Date & Time Picker */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-slate-800">
                    Step 3: Select Date & Time Slot
                  </h2>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Choose Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Available Slots
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TIME_SLOTS.map((slot) => {
                        const isSelected = selectedTime === slot;
                        return (
                          <button
                            type="button"
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`p-3 text-xs font-semibold rounded-lg border transition-all ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-slate-200 hover:border-slate-300 text-slate-700"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Confirm Booking */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-800">
                    Step 4: Confirm Booking Summary
                  </h2>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Specialty:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedSpecialty?.name}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Doctor:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedDoctor?.name}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Date:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedDate}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Time Slot:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedTime}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    currentStep === 1
                      ? "opacity-0 cursor-default"
                      : "text-slate-600 hover:bg-slate-100"
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
                    className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                  >
                    Confirm Booking
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}