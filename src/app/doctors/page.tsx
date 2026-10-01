"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Navbar from "@/components/shared/Navbar";
import DoctorCard from "@/components/doctors/DoctorCard";
import DoctorSkeleton from "@/components/doctors/DoctorSkeleton";
import EmptyDoctors from "@/components/doctors/EmptyDoctors";
import { useDebounce } from "@/hooks/useDebounce";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Doctor, Specialty } from "@/types/doctor";
import { applyFeaturedDoctor, isFeaturedDoctor } from "@/lib/featuredDoctor";
import { Search, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

type DoctorRow = {
  id: string;
  full_name: string;
  rating: number | null;
  avatar_url: string | null;
  specialty: string | null;
};

function getSpecialtyName(row: DoctorRow): string {
  return row.specialty ?? "General";
}

export default function DoctorDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="h-8 w-64 rounded bg-slate-200 animate-pulse" />
            <div className="mt-4 h-4 w-96 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      }
    >
      <DoctorDirectoryContent />
    </Suspense>
  );
}

function DoctorDirectoryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const dashboardHref =
    user?.role === "doctor"
      ? "/doctor/dashboard"
      : "/patient/dashboard";

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") ?? ""
  );

  const [selectedSpecialty, setSelectedSpecialty] = useState(
    searchParams.get("specialty") ?? ""
  );

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState(false);
  const [specialtiesError, setSpecialtiesError] = useState(false);
  const [doctorsRetryKey, setDoctorsRetryKey] = useState(0);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Sync state to URL whenever search or specialty changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("q", searchQuery);
    }
    if (selectedSpecialty) {
      params.set("specialty", selectedSpecialty);
    }
    const qs = params.toString();
    router.replace(
      qs ? `${pathname}?${qs}` : pathname,
      { scroll: false }
    );
  }, [searchQuery, selectedSpecialty, pathname, router]);

  useEffect(() => {
    let isMounted = true;
    const loadSpecialties = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setSpecialtiesError(true);
          setSpecialtiesLoading(false);
        }
        return;
      }

      try {
        setSpecialtiesLoading(true);
        const { data, error } = await supabase.from("specialties").select("id, name").order("name");
        if (error) {
          throw error;
        }
        if (isMounted) {
          setSpecialties(data ?? []);
        }
      } catch (error) {
        console.error("Error fetching specialties:", error);

        if (isMounted) {
          setSpecialtiesError(true);
        }
      } finally {
        if (isMounted) {
          setSpecialtiesLoading(false);
        }
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
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setAllDoctors([]);
          setDoctorsError(true);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setDoctorsError(false);

        const { data, error } = await supabase
          .from("doctors")
          .select(
            "id, full_name, specialty, rating, avatar_url"
          )
          .order("rating", { ascending: false });

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as unknown as DoctorRow[];

        const formattedDoctors: Doctor[] = rows.map((doc) => ({
          id: doc.id,
          name: doc.full_name || "Doctor",
          specialty: getSpecialtyName(doc),
          experience: "Experience available on profile",
          rating: Number(doc.rating) || 0,
          avatar: doc.avatar_url ?? "",
        }));

        if (isMounted) {
          setAllDoctors(formattedDoctors);
        }
      } catch (error) {
        console.error("Error fetching doctors:", error);

        if (isMounted) {
          setDoctorsError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDoctors();

    return () => {
      isMounted = false;
    };
  }, [doctorsRetryKey]);

  // Filter Doctors
  const filteredDoctors = useMemo(() => {
    let filtered = [...allDoctors];

    const searchTerm = debouncedSearch.trim().toLowerCase();

    const selectedSpecialtyName = specialties.find(
      (specialty) => specialty.id === selectedSpecialty
    )?.name;

    // Specialty filter
    if (selectedSpecialtyName) {
      filtered = filtered.filter(
        (doctor) => doctor.specialty === selectedSpecialtyName
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (doctor) =>
          doctor.name.toLowerCase().includes(searchTerm) ||
          doctor.specialty.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }, [
    allDoctors,
    debouncedSearch,
    selectedSpecialty,
    specialties,
  ]);

  // Pin the featured doctor to the top with the curated name and rating
  const displayDoctors = useMemo(() => {
    const featuredIndex = filteredDoctors.findIndex((doctor) =>
      isFeaturedDoctor(doctor)
    );

    if (featuredIndex === -1) {
      return filteredDoctors;
    }

    return [
      applyFeaturedDoctor(filteredDoctors[featuredIndex]),
      ...filteredDoctors.filter((_, index) => index !== featuredIndex),
    ];
  }, [filteredDoctors]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedSpecialty("");
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-slate-50 py-24 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Dashboard Button */}
          <Link
            href={dashboardHref}
            aria-label="Back to your dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-500 text-white transition-colors hover:bg-blue-700 px-4"
          >
            <span aria-hidden="true">&larr;</span>
            Go to Dashboard
          </Link>

          {/* Page Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Doctor Directory
            </h1>

            <p className="text-sm text-slate-500 max-w-xl">
              Browse top-rated healthcare specialists and book
              consultations instantly.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="text"
                  placeholder="Search doctors by name or specialty..."
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(e.target.value)
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Specialty */}
              <select
                value={selectedSpecialty}
                onChange={(e) =>
                  setSelectedSpecialty(e.target.value)
                }
                disabled={
                  specialtiesLoading || specialtiesError
                }
                className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-45"
              >
                <option value="">
                  All Specialties
                </option>

                {specialties.map((spec) => (
                  <option
                    key={spec.id}
                    value={spec.id}
                  >
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

          {/* Doctors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Loading */}
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <DoctorSkeleton key={i} />
              ))
            ) : doctorsError ? (

              /* Error */
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center space-y-4">
                <p className="text-slate-600 font-medium">
                  Failed to load doctors
                </p>

                <button
                  onClick={() =>
                    setDoctorsRetryKey((k) => k + 1)
                  }
                  className="flex items-center gap-2 bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>

            ) : displayDoctors.length === 0 ? (

              /* Empty */
              <EmptyDoctors
                onClearFilters={handleClearFilters}
              />

            ) : (

              /* Doctor Cards */
              displayDoctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}