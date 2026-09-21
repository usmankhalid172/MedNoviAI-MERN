"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import DoctorCard from "@/components/doctors/DoctorCard";
import DoctorSkeleton from "@/components/doctors/DoctorSkeleton";
import EmptyDoctors from "@/components/doctors/EmptyDoctors";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/lib/supabase";
import { Doctor, Specialty } from "@/types/doctor";
import { Search, RefreshCw } from "lucide-react";
import Link from "next/link"; 

type DoctorRow = {
  id: string;
  full_name: string;
  experience_years: number | null;
  rating: number | null;
  reviews_count: number | null;
  avatar_url: string | null;
  consultation_fee: number | null;
  specialty_id: string;
  specialties: { name: string } | { name: string }[] | null;
};

function getSpecialtyName(row: DoctorRow): string {
  const rel = row.specialties;
  if (!rel) return "General";
  if (Array.isArray(rel)) return rel[0]?.name ?? "General";
  return rel.name ?? "General";
}

export default function DoctorDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [loading, setLoading] = useState(true);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState(false);
  const [specialtiesError, setSpecialtiesError] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load specialties
  useEffect(() => {
    let isMounted = true;

    const loadSpecialties = async () => {
      try {
        setSpecialtiesLoading(true);
        setSpecialtiesError(false);

        const { data, error } = await supabase
          .from("specialties")
          .select("id, name")
          .order("name");

        if (error) throw error;
        if (isMounted) setSpecialties(data ?? []);
      } catch (error) {
        console.error("Error fetching specialties:", error);
        if (isMounted) {
          setSpecialties([]);
          setSpecialtiesError(true);
        }
      } finally {
        if (isMounted) setSpecialtiesLoading(false);
      }
    };

    loadSpecialties();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadDoctors = async () => {
      try {
        setLoading(true);
        setDoctorsError(false);

        let query = supabase
          .from("doctors")
          .select(
            `
            id,
            full_name,
            experience_years,
            rating,
            reviews_count,
            avatar_url,
            consultation_fee,
            specialty_id,
            specialties ( name )
          `
          )
          .eq("is_available", true);

        if (selectedSpecialty) {
          query = query.eq("specialty_id", selectedSpecialty);
        }

        if (debouncedSearch.trim()) {
          query = query.ilike("full_name", `%${debouncedSearch.trim()}%`);
        }

        const { data, error } = await query.order("rating", {
          ascending: false,
        });

        if (error) throw error;

        const rows = (data ?? []) as unknown as DoctorRow[];

        const formattedDoctors: Doctor[] = rows.map((doc) => ({
          id: doc.id,
          name: doc.full_name,
          specialty: getSpecialtyName(doc),
          specialtyId: doc.specialty_id,
          experience: `${doc.experience_years ?? 0} Yrs Exp`,
          rating: Number(doc.rating) || 0,
          reviewsCount: Number(doc.reviews_count) || 0,
          avatar: doc.avatar_url || "https://via.placeholder.com/150",
          consultationFee: doc.consultation_fee
            ? `$${doc.consultation_fee}`
            : undefined,
        }));

        if (isMounted) setDoctors(formattedDoctors);
      } catch (error) {
        console.error("Error fetching doctors:", error);
        if (isMounted) {
          setDoctors([]);
          setDoctorsError(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDoctors();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, selectedSpecialty]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedSpecialty("");
  };

  const handleRetryDoctors = () => {
    setDoctorsError(false);
    setLoading(true);
    setSelectedSpecialty((prev) => prev);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 py-24 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          <Link href="/patient/dashboard" aria-label="Back to home" className="inline-flex h-10 w-40 shrink-0
            items-center justify-center rounded-lg bg-blue-500 text-slate-200 transition-colors
            hover:bg-blue-700 hover:text-white"> &larr; Go to Dashboard
          </Link>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Doctor Directory
            </h1>
            <p className="text-sm text-slate-500 max-w-xl">
              Browse top-rated healthcare specialists and book consultations
              instantly.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search doctors by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                disabled={specialtiesLoading || specialtiesError}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-45"
              >
                <option value="">All Specialties</option>
                {specialties.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>

            {specialtiesError && (
              <p className="text-xs text-red-500 mt-2">
                Failed to load specialties
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <DoctorSkeleton key={i} />
              ))
            ) : doctorsError ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center space-y-4">
                <p className="text-slate-600 font-medium">
                  Failed to load doctors
                </p>
                <button
                  onClick={handleRetryDoctors}
                  className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            ) : doctors.length === 0 ? (
              <EmptyDoctors onClearFilters={handleClearFilters} />
            ) : (
              doctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}