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
  fee?: string;
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
          fee: "500",
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
      {/* WEB SCREEN UI (Hidden when Printing) */}
      <div className="print:hidden">
        <Navbar />
        <div className="max-w-2xl mx-auto space-y-6 py-10 px-4">
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
              🖨️ Print Receipt
            </button>
            <Link
              href="/appointment/book"
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition text-center flex items-center justify-center"
            >
              Book Another Appointment
            </Link>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY HOSPITAL RECEIPT LAYOUT (Matches Image 2 Layout) */}
      <div className="hidden print:block text-slate-800 font-sans p-2">
        {/* Top Sky-Blue Bar */}
        <div className="h-2.5 bg-[#38bdf8] w-full mb-6"></div>

        {/* Brand Header */}
        <div className="flex justify-center items-center gap-2 mb-2">
          <span className="text-3xl text-[#0ea5e9]">✚</span>
          <h1 className="text-3xl font-extrabold text-[#0ea5e9] tracking-tight">MedNoviAI</h1>
        </div>

        {/* Title Banner */}
        <div className="border-t border-b border-slate-300 py-2.5 text-center my-4">
          <h2 className="text-xl font-bold text-[#16a34a] tracking-widest uppercase">BOOKING RECEIPT</h2>
        </div>

        {/* Transaction Header Details */}
        <div className="border-b border-slate-300 pb-2 mb-4 flex justify-between text-xs font-semibold text-slate-700">
          <div>Transaction Id: #{latestAppointment?.id || "MN-100293"}</div>
          <div>Issued On: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>

        {/* Provider & Patient Addresses */}
        <div className="grid grid-cols-2 gap-6 text-xs mb-6 text-slate-600 leading-relaxed">
          <div>
            <p className="font-bold text-slate-800">Invoice From MedNoviAI Medical Center</p>
            <p className="font-medium text-slate-700">South City Hospital & Diagnostic Suite</p>
            <p>Building 4, Healthcare Avenue, Block 5, Clifton, Karachi</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">Invoice To</p>
            <p className="font-semibold text-slate-900 text-sm">Valued Patient</p>
            <p>+92 300 1234567</p>
            <p>Karachi, Pakistan</p>
          </div>
        </div>

        {/* Payment & Booking Status Banner */}
        <div className="border-t border-slate-300 pt-3 mb-6 flex justify-between items-center">
          <div>
            <span className="block text-sm font-bold text-slate-800">Payment Method</span>
            <span className="text-xs text-slate-600 font-medium">Online (Paid)</span>
          </div>
          <div className="text-right">
            <span className="block text-sm font-bold text-slate-800">Booking Status</span>
            <span className="text-sm font-bold text-[#16a34a]">Success</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left border-collapse border border-slate-200 mb-6 text-xs">
          <thead>
            <tr className="bg-[#38bdf8] text-white font-bold">
              <th className="p-3 border border-slate-200 w-12 text-center">#</th>
              <th className="p-3 border border-slate-200">Description</th>
              <th className="p-3 border border-slate-200 w-36">Remark</th>
              <th className="p-3 border border-slate-200 w-28 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((item, index) => (
              <tr key={item.id} className="border-b border-slate-200">
                <td className="p-3 border border-slate-200 text-center font-bold">{index + 1}</td>
                <td className="p-3 border border-slate-200 leading-relaxed">
                  <p className="font-bold text-slate-900 text-sm">Appointment for {item.doctorName}</p>
                  <p className="text-slate-600 mt-0.5">Clinic Details : {item.location}</p>
                  <p className="text-slate-600 mt-0.5">Specialty : {item.specialty}</p>
                  <p className="text-slate-800 font-semibold mt-1">Appointment date & time : {item.date} at {item.time}</p>
                  <p className="font-bold text-slate-900 mt-1">● Serial no. will be allotted at chamber counter.</p>
                </td>
                <td className="p-3 border border-slate-200 font-medium text-slate-700">Confirmation Fee</td>
                <td className="p-3 border border-slate-200 text-right font-bold text-slate-900">
                  Rs. {item.fee || "500"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total Summary Box */}
        <div className="flex justify-end mb-8">
          <div className="w-64 text-xs font-semibold space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-600">GST (18%) :</span>
              <span>Rs. 0</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
              <span>Total Amount :</span>
              <span>Rs. {appointments.reduce((sum, item) => sum + (parseFloat(item.fee || "500")), 0)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Hospital Notes Box */}
        <div className="bg-[#f7fee7] border border-[#d9f99d] p-4 rounded-lg text-[10px] text-slate-700 space-y-1.5 leading-relaxed">
          <p className="font-bold text-xs text-slate-900 mb-1">Any issues with your booking?</p>
          <p>1. Your booking is confirmed. Please present this physical receipt or SMS at the chamber counter upon arrival.</p>
          <p>2. Please arrive 15 minutes prior to your allocated time slot.</p>
          <p>3. Please do not print if this is not extremely necessary. Save earth.</p>
          <p>4. For any assistance, visit www.mednoviai.com or Call +92 21 111 633 668.</p>
        </div>
      </div>

      {/* Print Page Formatting Overrides */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}

export default function AppointmentConfirmationPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
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