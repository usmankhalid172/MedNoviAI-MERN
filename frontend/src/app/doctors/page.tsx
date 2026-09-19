"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { Search, Loader2 } from "lucide-react";

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

function DoctorCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <div className="flex-1 h-10 rounded-xl bg-slate-200 animate-pulse" />
        <div className="flex-1 h-10 rounded-xl bg-slate-200 animate-pulse" />
      </div>
    </div>
  );
}

export default function DoctorDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchDoctors() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/doctors");
        if (!cancelled) {
          const data = res.data?.doctors || res.data?.data || res.data;
          const list = Array.isArray(data) ? data : [];
          setAllDoctors(list);
          setDoctors(list);
        }
      } catch {
        if (!cancelled) setError("Unable to load doctor directory. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDoctors();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (loading) return;

    const query = searchQuery.trim();
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      if (!query) {
        setSearching(false);
        setDoctors(allDoctors);
        return;
      }
      setSearching(true);
      setError(null);
    });

    if (!query) {
      return () => { cancelled = true; };
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/doctors", { params: { search: query } });
        if (!cancelled) {
          const data = res.data?.doctors || res.data?.data || res.data;
          setDoctors(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setError("Unable to complete your search. Please try again.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 400);

    return () => { clearTimeout(timer); cancelled = true; };
  }, [searchQuery, loading, allDoctors]);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 py-24 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/patient/dashboard" aria-label="Back to home page"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-blue-500 px-3 py-2 
              text-xs font-semibold transition text-white hover:bg-blue-700">
              &larr; Back To Dashboard
            </Link>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Doctor Directory
            </h1>
            <p className="text-sm text-slate-500 max-w-xl">
              Browse top-rated healthcare specialists and book consultations instantly.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search doctors by name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              />
              {searching && (
                <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-blue-600" />
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600">
                <Loader2 className="size-4 animate-spin" /> Loading doctors...
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <DoctorCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : searching ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600">
                <Loader2 className="size-4 animate-spin" /> Searching doctors for &quot;{searchQuery}&quot;...
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <DoctorCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Something went wrong</h2>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
            </div>
          ) : doctors.length === 0 ? (
            <EmptyState
              title="No doctors found"
              message={searchQuery
                ? "Try a different name or specialty to explore available care options."
                : "No doctors are available at the moment. Please check back later."}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => (
                <div key={doc.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between space-y-4">
                  <div className="flex items-start gap-4">
                    <img src={doc.avatar} alt={doc.name} className="w-16 h-16 rounded-2xl object-cover" />
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{doc.name}</h3>
                      <p className="text-xs font-semibold text-blue-600">{doc.specialty}</p>
                      <p className="text-xs text-slate-400">{doc.experience}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Link
                      href={`/doctors/${doc.id}`}
                      className={cn(buttonVariants({ variant: "secondary", className: "flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs" }))}
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/appointment/book?doctor=${encodeURIComponent(doc.name)}&specialty=${encodeURIComponent(doc.specialty)}`}
                      className={cn(buttonVariants({ variant: "default", className: "flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs" }))}
                    >
                      Book Visit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}