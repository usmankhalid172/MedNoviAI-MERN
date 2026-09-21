"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import Footer from "@/components/shared/Footer";

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
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function init() {
      setAppointmentsLoading(true);
      try {
        const res = await api.get("/appointments/my");
        const data = res.data?.appointments || res.data?.data || res.data;
        if (active && Array.isArray(data)) {
          setAppointments(data);
        }
      } catch {
        // Fall through — treated as no appointments.
      } finally {
        if (active) setAppointmentsLoading(false);
      }
    }
    init();
    return () => { active = false; };
  }, []);

  const latestAppointment = appointments[0];

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (appointmentsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm animate-pulse space-y-4">
            <div className="mx-auto size-16 rounded-full bg-slate-200" />
            <div className="mx-auto h-5 w-56 rounded bg-slate-200" />
            <div className="mx-auto h-4 w-72 max-w-full rounded bg-slate-100" />
          </div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse space-y-3">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="h-16 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <div className="text-center py-16 px-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <span className="text-2xl">📋</span>
          </div>
          <h2 className="text-lg font-bold text-red-600"> Error! No appointments are found </h2>
          <p className="mt-2 text-sm text-slate-500"> You have no booked appointments yet. Book your first
            consultation to get started. </p>

          <div className="mt-3 flex justify-center items-center gap-5">
            <a href="/patient/dashboard" aria-label="Back to home page"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-blue-500 px-3 py-2
              text-xs font-semibold transition text-white hover:bg-blue-700">
              &larr; Back To Dashboard
            </a>

            <a href="/appointment/book" className="inline-flex items-center rounded-lg border border-slate-200 bg-blue-500 px-3 py-2
              text-xs font-semibold transition text-white hover:bg-blue-700">
              Book Appointment
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden">
        <Navbar />
        <div className="max-w-2xl mx-auto space-y-6 py-10 px-4">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="font-semibold transition hover:text-blue-600">Home</Link>
              </li>
              <li><ChevronRight className="size-3.5 text-slate-400" /></li>
              <li aria-current="page" className="font-semibold text-blue-600">My Consultations</li>
            </ol>
          </nav>
          {/* Top Success Banner */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm text-center">
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
              <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 bg-slate-100 px-4 py-2 rounded-lg text-xs font-mono text-slate-700 border border-slate-200">
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
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-base font-bold text-slate-800">
                Your Booked Consultations ({appointments.length})
              </h2>
              <Link href="/patient/dashboard" className="text-xs bg-blue-300 font-black hover:bg-blue-400 px-2 py-1 rounded text-blue-600 hover:text-blue-700">
                &larr; Back to dashboard
              </Link>
            </div>

            {appointments.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-xs font-mono text-slate-500">
                    Ref: <strong className="text-slate-900">{item.id}</strong>
                  </span>
                  <Badge variant="success" className="rounded-full">
                    ● {item.status}
                  </Badge>
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
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex-1 border-slate-200 hover:bg-slate-50 h-11 rounded-xl"
            >
              🖨️ Print Receipt
            </Button>
            <Link
              href="/appointment/book"
              className={cn(
                buttonVariants({ variant: "default", className: "flex-1 h-11 rounded-xl bg-blue-500 hover:bg-blue-700 text-white" })
              )}
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
          <div>Transaction Id: #{latestAppointment?.id || "N/A"}</div>
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
            <p className="font-semibold text-slate-900 text-sm">Patient</p>
            <p>{user?.email || ""}</p>
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
        <div className="overflow-x-auto mb-6">
        <table className="w-full min-w-160 text-left border-collapse border border-slate-200 text-xs">
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
        </div>

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
          <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm animate-pulse space-y-4">
              <div className="mx-auto size-16 rounded-full bg-slate-200" />
              <div className="mx-auto h-5 w-56 rounded bg-slate-200" />
              <div className="mx-auto h-4 w-72 max-w-full rounded bg-slate-100" />
            </div>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse space-y-3">
                  <div className="h-4 w-1/3 rounded bg-slate-200" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-16 rounded-xl bg-slate-100" />
                    <div className="h-16 rounded-xl bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      >
        <ConfirmationContent />
      </Suspense>
      <Footer />
    </div>
  );
}