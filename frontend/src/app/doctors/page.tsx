"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import DoctorCard from "@/components/doctors/DoctorCard";
import DoctorSkeleton from "@/components/doctors/DoctorSkeleton";
import EmptyDoctors from "@/components/doctors/EmptyDoctors";
import { useDebounce } from "@/hooks/useDebounce";
import api from "@/lib/api";
import { Doctor, Specialty } from "@/types/doctor";
import { Search } from "lucide-react";

// Temporary mock data (remove later when real APIs are ready)
const MOCK_SPECIALTIES: Specialty[] = [
  { id: "1", name: "Cardiology" },
  { id: "2", name: "Neurology" },
  { id: "3", name: "Pediatrics" },
  { id: "4", name: "Dermatology" },
  { id: "5", name: "Orthopedics" },
  { id: "6", name: "General Physician" },
];

const MOCK_DOCTORS: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Sarah Jenkins",
    specialty: "Cardiology",
    specialtyId: "1",
    experience: "12 Yrs Exp",
    rating: 4.9,
    reviewsCount: 124,
    avatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-2",
    name: "Dr. Michael Chen",
    specialty: "Neurology",
    specialtyId: "2",
    experience: "9 Yrs Exp",
    rating: 4.8,
    reviewsCount: 98,
    avatar:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-3",
    name: "Dr. Emily Watson",
    specialty: "Pediatrics",
    specialtyId: "3",
    experience: "15 Yrs Exp",
    rating: 4.9,
    reviewsCount: 210,
    avatar:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-4",
    name: "Dr. James Wilson",
    specialty: "Dermatology",
    specialtyId: "4",
    experience: "8 Yrs Exp",
    rating: 4.7,
    reviewsCount: 76,
    avatar:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-5",
    name: "Dr. Ayesha Khan",
    specialty: "Orthopedics",
    specialtyId: "5",
    experience: "11 Yrs Exp",
    rating: 4.8,
    reviewsCount: 142,
    avatar:
      "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "doc-6",
    name: "Dr. Robert Lee",
    specialty: "General Physician",
    specialtyId: "6",
    experience: "14 Yrs Exp",
    rating: 4.6,
    reviewsCount: 189,
    avatar:
      "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
  },
];

export default function DoctorDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load specialties
  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        setSpecialtiesLoading(true);
        const res = await api.get("/api/specialties");
        const data = res.data?.data || res.data || [];
        setSpecialties(
          Array.isArray(data) && data.length > 0 ? data : MOCK_SPECIALTIES
        );
        setUseMock(false);
      } catch {
        console.warn("Specialties API not available, using mock data");
        setSpecialties(MOCK_SPECIALTIES);
        setUseMock(true);
      } finally {
        setSpecialtiesLoading(false);
      }
    };

    fetchSpecialties();
  }, []);

  // Load / filter doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);

        // Try real API first
        if (!useMock) {
          const params: Record<string, string> = {};
          if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
          if (selectedSpecialty) params.specialty = selectedSpecialty;

          const res = await api.get("/api/doctors", { params });
          const data = res.data?.data || res.data || [];

          if (Array.isArray(data) && data.length > 0) {
            setDoctors(data);
            setLoading(false);
            return;
          }
        }

        // Fallback to mock filtering
        let filtered = [...MOCK_DOCTORS];

        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.specialty.toLowerCase().includes(q)
          );
        }

        if (selectedSpecialty) {
          filtered = filtered.filter(
            (d) => d.specialtyId === selectedSpecialty
          );
        }

        setDoctors(filtered);
      } catch {
        console.warn("Doctors API not available, using mock data");
        setUseMock(true);

        let filtered = [...MOCK_DOCTORS];

        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter(
            (d) =>
              d.name.toLowerCase().includes(q) ||
              d.specialty.toLowerCase().includes(q)
          );
        }

        if (selectedSpecialty) {
          filtered = filtered.filter(
            (d) => d.specialtyId === selectedSpecialty
          );
        }

        setDoctors(filtered);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [debouncedSearch, selectedSpecialty, useMock]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedSpecialty("");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 py-24 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Doctor Directory
            </h1>
            <p className="text-sm text-slate-500 max-w-xl">
              Browse top-rated healthcare specialists and book consultations
              instantly.
            </p>
            {useMock && (
              <p className="text-xs text-amber-600 bg-amber-50 inline-block px-3 py-1 rounded-full">
                Using temporary mock data (APIs not ready yet)
              </p>
            )}
          </div>

          {/* Search + Filter Bar */}
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

          {/* Doctors Grid */}
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