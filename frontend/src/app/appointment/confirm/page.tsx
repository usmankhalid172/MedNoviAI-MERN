"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/shared/Navbar";

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: string;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const queryDoctor = searchParams.get("doctor");
  const querySpecialty = searchParams.get("specialty");
  const queryDate = searchParams.get("date");
  const queryTime = searchParams.get("time");
  const queryBookingId = searchParams.get("bookingId");

  useEffect(() => {
    const saved = localStorage.getItem("appointments");
    let loadedList: Appointment[] = saved ? JSON.parse(saved) : [];

    // Fallback static record agar Storage khali ho
    if (loadedList.length === 0) {
      loadedList = [
        {
          id: queryBookingId || "MN-448173",
          doctorName: queryDoctor || "Dr. Sarah Jenkins",
          specialty: querySpecialty || "Cardiology",
          date: queryDate || new Date().toISOString().split("T")[0],
          time: queryTime || "10:30 AM",
          location: "MedNovi Medical Center, Suite 402",
          status: "Scheduled",
        },
      ];
      localStorage.setItem("appointments", JSON.stringify(loadedList));
    }

    setAppointments(loadedList);
  }, [queryDoctor, querySpecialty, queryDate, queryTime, queryBookingId]);

  const latestAppointment = appointments[0];

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        Loading appointments...
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto space-y-6 py-15">
        {/* Top Success Banner */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold mb-4">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Appointment Confirmed!
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Aapki appointment successfully book ho chuki hai. Confirmation details neche maujood hain.
          </p>

          {latestAppointment && (
            <div className="mt-5 inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg text-xs font-mono text-slate-700 border border-slate-200">
              <span>Latest Reference:</span>
              <span className="font-bold text-slate-900">{latestAppointment.id}</span>
              <button
                onClick={() => handleCopyId(latestAppointment.id)}
                className="ml-2 text-blue-600 hover:text-blue-700 font-sans font-medium text-xs underline"
              >
                {copiedId === latestAppointment.id ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {/* All Scheduled Appointments List */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800 px-1">
            Your Booked Consultations ({appointments.length})
          </h2>

          {appointments.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="text-xs font-mono text-slate-500">
                  Ref: <strong className="text-slate-900">{item.id}</strong>
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                  ● {item.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                    Doctor / Specialist
                  </span>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {item.doctorName}
                  </p>
                  <p className="text-xs text-blue-600 font-medium mt-0.5">
                    {item.specialty}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                    Schedule
                  </span>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    📅 {item.date}
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    ⏰ {item.time}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm text-slate-600 pt-1">
                <span>Location: <strong className="text-slate-800">{item.location}</strong></span>
                <button
                  onClick={() => handleCopyId(item.id)}
                  className="text-blue-600 hover:underline text-xs"
                >
                  {copiedId === item.id ? "Copied" : "Copy Ref"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition text-center"
          >
            𖥶 Print Receipt
          </button>
          <Link
            href="/appointment/book"
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition text-center flex items-center justify-center"
          >
            Book Another Appointment
          </Link>
        </div>
      </div>
    </>
  );
}

export default function AppointmentConfirmationPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <Suspense
        fallback={
          <div className="text-center py-10 text-slate-500 text-sm">
            Loading details...
          </div>
        }
      >
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}