"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Footer from "@/components/shared/Footer";
import { supabase } from "@/lib/supabase";
import {
  UserRound,
  Mail,
  Phone,
  Shield,
  Image as ImageIcon,
  Calendar,
  ArrowLeft,
  Pencil,
  Save,
  X,
  Loader2,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";

// ─── Local types ───
interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface ProfileForm {
  full_name: string;
  phone: string;
  avatar_url: string;
}

interface PostgrestErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

// ─── Helpers ───
function getInitials(name: string | null): string {
  if (!name) return "PT";
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isValidPhone(phone: string): boolean {
  if (!phone) return true;
  return /^[\d\s\-+()]{7,20}$/.test(phone.trim());
}

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function PatientProfilePage() {
  const router = useRouter();
  const { user, isInitializing } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    phone: "",
    avatar_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  }>({});

  const userId = user?.id;

  // ─── Redirect if not logged in ───
  useEffect(() => {
    if (isInitializing) return;
    if (!user) {
      router.push("/login");
    }
  }, [user, isInitializing, router]);

  // ─── Fetch profile ───
  useEffect(() => {
    if (!userId || !supabase) return;

    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase!
          .from("profiles")
          .select("id, full_name, email, role, phone, avatar_url, created_at")
          .eq("id", userId)
          .maybeSingle();

        if (fetchError) {
          console.error("Profile fetch error:", {
            message: fetchError.message,
            code: fetchError.code,
            details: fetchError.details,
            hint: fetchError.hint,
          });
          throw fetchError;
        }

        if (!data) {
          const stub: ProfileRow = {
            id: userId,
            full_name: user?.name ?? null,
            email: user?.email ?? null,
            role: "patient",
            phone: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
          };
          if (!cancelled) {
            setProfile(stub);
            setForm({
              full_name: stub.full_name ?? "",
              phone: stub.phone ?? "",
              avatar_url: stub.avatar_url ?? "",
            });
          }
          return;
        }

        const row = data as ProfileRow;
        if (!cancelled) {
          setProfile(row);
          setForm({
            full_name: row.full_name ?? "",
            phone: row.phone ?? "",
            avatar_url: row.avatar_url ?? "",
          });
        }
      } catch (err) {
        const e = err as PostgrestErrorLike;
        if (!cancelled) {
          setError(e?.message || "Unable to load your profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userId, user?.name, user?.email]);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};

    if (!form.full_name.trim()) {
      errors.full_name = "Full name is required.";
    } else if (form.full_name.trim().length < 2) {
      errors.full_name = "Full name is too short.";
    }

    if (form.phone && !isValidPhone(form.phone)) {
      errors.phone = "Please enter a valid phone number.";
    }

    if (form.avatar_url && !isValidUrl(form.avatar_url)) {
      errors.avatar_url = "Please enter a valid URL (https://...).";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!userId || !supabase) return;
    if (!validate()) return;

    try {
      setSaving(true);
      setError(null);

      const updates = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
      };

      const { data, error: updateError } = await supabase!
        .from("profiles")
        .update(updates)
        .eq("id", userId)
        .select("id, full_name, email, role, phone, avatar_url, created_at")
        .single();

      if (updateError) {
        console.error("Profile update error:", {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw updateError;
      }

      const updated = data as ProfileRow;
      setProfile(updated);
      setForm({
        full_name: updated.full_name ?? "",
        phone: updated.phone ?? "",
        avatar_url: updated.avatar_url ?? "",
      });
      setEditing(false);

      toast.success("Profile updated successfully", {
        style: { background: "#2563eb", color: "#ffffff", border: "none" },
      });
    } catch (err) {
      const e = err as PostgrestErrorLike;
      const msg = e?.message || "Failed to update profile. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        avatar_url: profile.avatar_url ?? "",
      });
    }
    setFieldErrors({});
    setError(null);
    setEditing(false);
  }

  // ─── Loading skeleton ───
  if (loading || isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50/70 text-slate-800">
        <Toaster position="top-right" />
        <header className="sticky top-0 z-40 bg-[#173b68] px-4 sm:px-8 py-3.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-white/20 animate-pulse" />
              <div className="h-5 w-28 rounded bg-white/20 animate-pulse" />
            </div>
            <div className="h-9 w-24 rounded-xl bg-white/20 animate-pulse" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] rounded-2xl p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-white/10" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-48 rounded bg-white/10" />
                <div className="h-4 w-64 rounded bg-white/10" />
              </div>
            </div>
          </div>
          <div className="bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] rounded-2xl p-6 animate-pulse space-y-4">
            <div className="h-5 w-32 rounded bg-white/10" />
            <div className="h-10 rounded bg-white/10" />
            <div className="h-10 rounded bg-white/10" />
            <div className="h-10 rounded bg-white/10" />
          </div>
        </main>
      </div>
    );
  }

  const initials = getInitials(profile?.full_name ?? null);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#173b68] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-[#93c5fd]" />
            <span className="text-lg font-bold text-white tracking-tight">
              MedNoviAI
            </span>
          </Link>

          <Link
            href="/patient/dashboard"
            className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2
              text-xs font-semibold text-white transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="font-semibold hover:text-[#2563eb]">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li>
              <Link href="/patient/dashboard" className="font-semibold hover:text-[#2563eb]">
                Dashboard
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li aria-current="page" className="font-semibold text-[#2563eb]">
              My Profile
            </li>
          </ol>
        </nav>

        {/* Error banner */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Profile header card — matches dashboard navy gradient ── */}
        <div className="bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] text-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "Profile"}
                className="h-20 w-20 rounded-full object-cover border-2 border-white/20"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/20 border border-blue-400/30 text-xl font-bold text-blue-100">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-white tracking-tight truncate">
                {profile?.full_name || "Patient"}
              </h1>
              <p className="text-sm text-blue-100/80 truncate">{profile?.email}</p>
              <span className="inline-flex mt-2 items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-blue-500/20 text-blue-200 border border-blue-400/30">
                <Shield className="w-3 h-3" />
                {profile?.role || "patient"}
              </span>
            </div>

            {!editing && (
              <Button
                onClick={() => setEditing(true)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl h-10 px-4 gap-2 cursor-pointer shrink-0"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* ── Profile Information card — matches dashboard navy gradient ── */}
        <div className="bg-linear-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] text-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
          <h2 className="text-base font-bold text-white mb-5">
            {editing ? "Edit Profile Information" : "Profile Information"}
          </h2>

          {editing ? (
            // ─── Edit mode ───
            <div className="space-y-5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="full_name"
                  className="flex items-center gap-2 mb-2 text-sm font-semibold text-blue-100"
                >
                  <UserRound className="w-4 h-4 text-blue-300" />
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={(e) => {
                    setForm({ ...form, full_name: e.target.value });
                    if (fieldErrors.full_name) {
                      setFieldErrors({ ...fieldErrors, full_name: undefined });
                    }
                  }}
                  className={`w-full rounded-xl border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-200/60 outline-none transition
                    ${
                      fieldErrors.full_name
                        ? "border-red-400 ring-2 ring-red-400/30"
                        : "border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                    }`}
                  placeholder="e.g. Ahmed Ali"
                />
                {fieldErrors.full_name && (
                  <p className="mt-1.5 text-xs font-medium text-red-300">
                    {fieldErrors.full_name}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="flex items-center gap-2 mb-2 text-sm font-semibold text-blue-100"
                >
                  <Phone className="w-4 h-4 text-blue-300" />
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (fieldErrors.phone) {
                      setFieldErrors({ ...fieldErrors, phone: undefined });
                    }
                  }}
                  className={`w-full rounded-xl border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-200/60 outline-none transition
                    ${
                      fieldErrors.phone
                        ? "border-red-400 ring-2 ring-red-400/30"
                        : "border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                    }`}
                  placeholder="+92 300 1234567"
                />
                {fieldErrors.phone && (
                  <p className="mt-1.5 text-xs font-medium text-red-300">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              {/* Avatar URL */}
              <div>
                <label
                  htmlFor="avatar_url"
                  className="flex items-center gap-2 mb-2 text-sm font-semibold text-blue-100"
                >
                  <ImageIcon className="w-4 h-4 text-blue-300" />
                  Avatar Image URL
                </label>
                <input
                  id="avatar_url"
                  type="url"
                  value={form.avatar_url}
                  onChange={(e) => {
                    setForm({ ...form, avatar_url: e.target.value });
                    if (fieldErrors.avatar_url) {
                      setFieldErrors({ ...fieldErrors, avatar_url: undefined });
                    }
                  }}
                  className={`w-full rounded-xl border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-blue-200/60 outline-none transition
                    ${
                      fieldErrors.avatar_url
                        ? "border-red-400 ring-2 ring-red-400/30"
                        : "border-white/20 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                    }`}
                  placeholder="https://example.com/avatar.jpg"
                />
                {fieldErrors.avatar_url && (
                  <p className="mt-1.5 text-xs font-medium text-red-300">
                    {fieldErrors.avatar_url}
                  </p>
                )}
              </div>

              {/* Readonly Email + Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/15">
                <div>
                  <p className="flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wide text-blue-200/70">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </p>
                  <p className="text-sm text-white">{profile?.email || "—"}</p>
                  <p className="text-[10px] text-blue-200/60 mt-0.5">
                    Email cannot be changed
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wide text-blue-200/70">
                    <Shield className="w-3.5 h-3.5" /> Role
                  </p>
                  <p className="text-sm text-white capitalize">
                    {profile?.role || "patient"}
                  </p>
                  <p className="text-[10px] text-blue-200/60 mt-0.5">
                    Role is managed by the system
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-white/15">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            // ─── View mode ───
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <UserRound className="w-5 h-5 text-blue-300 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
                    Full Name
                  </p>
                  <p className="text-sm text-white mt-0.5">
                    {profile?.full_name || "Not set"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-300 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
                    Email
                  </p>
                  <p className="text-sm text-white mt-0.5">
                    {profile?.email || "Not set"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-300 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
                    Phone
                  </p>
                  <p className="text-sm text-white mt-0.5">
                    {profile?.phone || "Not set"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-300 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
                    Role
                  </p>
                  <p className="text-sm text-white mt-0.5 capitalize">
                    {profile?.role || "patient"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-300 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
                    Member Since
                  </p>
                  <p className="text-sm text-white mt-0.5">
                    {profile?.created_at ? formatDate(profile.created_at) : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}