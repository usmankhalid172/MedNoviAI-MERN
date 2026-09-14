"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/shared/Navbar.tsx"


function ConfirmationContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  // URL parameters se data receive karna (fallback values ke sath)
  const doctorName = searchParams.get("doctor") || "Dr. Sarah Jenkins";
  const specialty = searchParams.get("specialty") || "Cardiology";
  const appointmentDate = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const appointmentTime = searchParams.get("time") || "10:30 AM";

  // Random Booking Reference ID generate karna
  const bookingId = "MN-" + Math.floor(100000 + Math.random() * 900000);

  const handleCopyId = () => {
    navigator.clipboard.writeText(bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
        <Navbar />
    <div className="max-w-2xl mx-auto space-y-6 py-15">
      {/* Top Success Card */}
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

        <div className="mt-5 inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg text-xs font-mono text-slate-700 border border-slate-200">
          <span>Booking Reference:</span>
          <span className="font-bold text-slate-900">{bookingId}</span>
          <button
            onClick={handleCopyId}
            className="ml-2 text-blue-600 hover:text-blue-700 font-sans font-medium text-xs underline"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Appointment Summary Details Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">
          Appointment Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              Doctor / Specialist
            </span>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {doctorName}
            </p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">
              {specialty}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              Schedule
            </span>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              📅 {appointmentDate}
            </p>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              ⏰ {appointmentTime}
            </p>
          </div>
        </div>

        {/* Location & Status Info */}
        <div className="space-y-3 text-xs sm:text-sm pt-2">
          <div className="flex justify-between items-center text-slate-600 border-b border-slate-100 pb-2">
            <span>Location:</span>
            <span className="font-semibold text-slate-800">
              MedNovi Medical Center, Suite 402
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600 border-b border-slate-100 pb-2">
            <span>Status:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
              ● Scheduled
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handlePrint}
          className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-medium text-sm hover:bg-slate-50 transition text-center"
        >
          🖨️ Print Receipt
        </button>
        <Link
          href="/appointment/book"
          className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition text-center"
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
      <Suspense fallback={<div className="text-center py-10 text-slate-500 text-sm">Loading details...</div>}>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}