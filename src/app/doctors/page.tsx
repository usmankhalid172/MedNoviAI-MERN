"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import DoctorCard from "@/components/doctors/DoctorCard";
import DoctorSkeleton from "@/components/doctors/DoctorSkeleton";
import EmptyDoctors from "@/components/doctors/EmptyDoctors";
import { useDebounce } from "@/hooks/useDebounce";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Doctor, Specialty } from "@/types/doctor";
import { Search, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

// Fallback data in case API key fails or database is empty
const FALLBACK_SPECIALTIES: Specialty[] = [
  { id: "Cardiology", name: "Cardiology" },
  { id: "Dermatology", name: "Dermatology" },
  { id: "Neurology", name: "Neurology" },
  { id: "Pediatrics", name: "Pediatrics" },
  { id: "General", name: "General Practice" },
];

const FALLBACK_DOCTORS: Doctor[] = [
  {
    id: "1",
    name: "Dr. Sarah Khan",
    specialty: "Cardiology",
    specialtyId: "Cardiology",
    experience: "10 Yrs Exp",
    rating: 4.9,
    reviewsCount: 120,
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
    consultationFee: "$50",
  },
  {
    id: "2",
    name: "Dr. Ahmed Ali",
    specialty: "Dermatology",
    specialtyId: "Dermatology",
    experience: "8 Yrs Exp",
    rating: 4.7,
    reviewsCount: 85,
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150",
    consultationFee: "$40",
  },
  {
    id: "3",
    name: "Dr. Fatima Usman",
    specialty: "Neurology",
    specialtyId: "Neurology",
    experience: "12 Yrs Exp",
    rating: 4.8,
    reviewsCount: 95,
    avatar: "https://images.unsplash.com/photo-1594824813566-88855ce78347?w=150",
    consultationFee: "$60",
  },
];

export default function DoctorDirectoryPage() {
  const { user } = useAuth();

  const dashboardHref =
    user?.role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [loading, setLoading] = useState(true);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load specialties
  useEffect(() => {
    let isMounted = true;

    const loadSpecialties = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setSpecialties(FALLBACK_SPECIALTIES);
          setSpecialtiesLoading(false);
        }
        return;
      }

      try {
        setSpecialtiesLoading(true);

        const { data, error } = await supabase
          .from("specialties")
          .select("id, name")
          .order("name");

        if (error) throw error;

        if (isMounted) {
          setSpecialties(data && data.length > 0 ? data : FALLBACK_SPECIALTIES);
        }
      } catch {
        console.warn("Supabase specialties query unfulfilled, using local fallback data.");
        if (isMounted) {
          setSpecialties(FALLBACK_SPECIALTIES);
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

  // Load doctors
  useEffect(() => {
    let isMounted = true;

    const loadDoctors = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setDoctors(FALLBACK_DOCTORS);
          setDoctorsError(false);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setDoctorsError(false);

        let query = supabase.from("doctors").select("*");

        if (selectedSpecialty) {
          query = query.or(
            `specialty.eq.${selectedSpecialty},specialty_id.eq.${selectedSpecialty}`
          );
        }

        if (debouncedSearch.trim()) {
          query = query.ilike("full_name", `%${debouncedSearch.trim()}%`);
        }

        const { data, error } = await query.order("rating", {
          ascending: false,
        });

        if (error) throw error;

        const formattedDoctors: Doctor[] = (data ?? []).map((doc: any) => {
          const specName =
            doc.specialty ||
            (Array.isArray(doc.specialties)
              ? doc.specialties[0]?.name
              : doc.specialties?.name) ||
            "General";

          return {
            id: doc.id,
            name: doc.full_name || doc.name || "Dr. Specialist",
            specialty: specName,
            specialtyId: doc.specialty_id || doc.specialty || specName,
            experience: doc.experience_years
              ? `${doc.experience_years} Yrs Exp`
              : "5+ Yrs Exp",
            rating: Number(doc.rating) || 4.8,
            reviewsCount: Number(doc.reviews_count) || 24,
            avatar:
              doc.avatar_url ||
              "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150",
            consultationFee: doc.consultation_fee
              ? `$${doc.consultation_fee}`
              : "$50",
          };
        });

        if (isMounted) {
          setDoctors(
            formattedDoctors.length > 0 ? formattedDoctors : FALLBACK_DOCTORS
          );
        }
      } catch {
        console.warn("Supabase doctors query unfulfilled, using local fallback data.");
        if (isMounted) {
          let filtered = FALLBACK_DOCTORS;

          if (selectedSpecialty) {
            filtered = filtered.filter(
              (d) =>
                d.specialty.toLowerCase() === selectedSpecialty.toLowerCase() ||
                d.specialtyId === selectedSpecialty
            );
          }

          if (debouncedSearch.trim()) {
            filtered = filtered.filter((d) =>
              d.name.toLowerCase().includes(debouncedSearch.trim().toLowerCase())
            );
          }

          setDoctors(filtered);
          setDoctorsError(false);
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
    searchQuery && setSearchQuery("");
    selectedSpecialty && setSelectedSpecialty("");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 py-24 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          <Link
            href={dashboardHref}
            aria-label="Back to your dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 px-4 text-sm font-medium shadow-sm"
          >
            <span aria-hidden="true">&larr;</span> Go to Dashboard
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
                disabled={specialtiesLoading}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <DoctorSkeleton key={i} />
              ))
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