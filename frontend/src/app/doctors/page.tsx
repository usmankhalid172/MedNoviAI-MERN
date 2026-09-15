"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  reviewsCount: number;
  location: string;
  availableSlot: string;
  avatar: string;
  consultationFee: string;
}

const DOCTORS_DATA: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Sarah Jenkins",
    specialty: "Cardiology",
    experience: "12 Yrs Exp",
    rating: 4.9,
    reviewsCount: 124,
    location: "MedNovi Medical Center, Suite 402",
    availableSlot: "Today at 02:00 PM",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
    consultationFee: "$120",
  },
  {
    id: "doc-2",
    name: "Dr. Michael Chen",
    specialty: "Neurology",
    experience: "9 Yrs Exp",
    rating: 4.8,
    reviewsCount: 98,
    location: "Neuro Health Care Clinic, Suite 105",
    availableSlot: "Tomorrow at 10:30 AM",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
    consultationFee: "$140",
  },
  {
    id: "doc-3",
    name: "Dr. Emily Watson",
    specialty: "Pediatrics",
    experience: "15 Yrs Exp",
    rating: 4.9,
    reviewsCount: 210,
    location: "Kids First Care, Suite 201",
    availableSlot: "Today at 04:30 PM",
    avatar: "https://images.unsplash.com/photo-1594824813566-78a9c3943314?w=150&auto=format&fit=crop&q=80",
    consultationFee: "$100",
  },
];

export default function DoctorDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDoctors = DOCTORS_DATA.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 py-24 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Doctor Directory
            </h1>
            <p className="text-sm text-slate-500 max-w-xl">
              Browse top-rated healthcare specialists and book consultations instantly.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <input
              type="text"
              placeholder="Search doctors by name or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-start gap-4">
                  <img src={doc.avatar} alt={doc.name} className="w-16 h-16 rounded-2xl object-cover" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{doc.name}</h3>
                    <p className="text-xs font-semibold text-blue-600">{doc.specialty}</p>
                    <p className="text-xs text-slate-400">{doc.experience}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/doctors/${doc.id}`}
                    className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition"
                  >
                    View Profile
                  </Link>
                  <Link
                    href={`/appointment/book?doctor=${encodeURIComponent(doc.name)}&specialty=${encodeURIComponent(doc.specialty)}`}
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-sm transition"
                  >
                    Book Visit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}