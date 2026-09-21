"use client";

import Link from "next/link";
import { Doctor } from "@/types/doctor";
import { Star } from "lucide-react";

interface DoctorCardProps {
  doctor: Doctor;
}

export default function DoctorCard({ doctor }: DoctorCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between 
      space-y-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <img
          src={doctor.avatar || "https://via.placeholder.com/150"}
          alt={doctor.name}
          className="w-16 h-16 rounded-2xl object-cover"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900 truncate">
            {doctor.name}
          </h3>
          <p className="text-xs font-semibold text-blue-600 mt-0.5">
            {doctor.specialty}
          </p>
          <p className="text-xs text-slate-400 mt-1">{doctor.experience}</p>

          {doctor.rating && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold text-slate-700">
                {doctor.rating}
              </span>
              {doctor.reviewsCount && (
                <span className="text-xs text-slate-400">
                  ({doctor.reviewsCount})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Link
          href={`/doctors/${doctor.id}`}
          className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl transition"
        >
          View Profile
        </Link>
        <Link
          href={`/appointment/book?doctorId=${doctor.id}`}
          className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-sm transition"
        >
          Book Visit
        </Link>
      </div>
    </div>
  );
}