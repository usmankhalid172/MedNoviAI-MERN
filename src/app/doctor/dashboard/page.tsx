"use client";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import PageLayout from "@/components/shared/PageLayout";
import EmptyState from "@/components/shared/EmptyState";
import {
  CalendarDays,
  ChevronRight,
  Users,
  IndianRupee,
  ClipboardList,
  User,
  Camera,
  Clock,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/* ------------------------- Supabase Config ------------------------- */

const SUPABASE_URL = "https://vlaamwiieuyguigkyxcu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_5EdGgNLWfr2ssrpSw5OJyg_BgHCSCQy";

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* ----------------------------- Types ------------------------------- */

interface Appointment {
  id: string;
  patientName?: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  status: string;
  fee?: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface AvailabilityMap {
  [day: string]: TimeSlot[];
}

type ProfileErrors = {
  bio?: string;
  experience?: string;
};

type AvailabilityErrors = {
  days?: string;
  slots?: string;
};

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const MAX_BIO_LENGTH = 500;
const MAX_EXPERIENCE_YEARS = 50;

/* --------------------------- Skeletons ----------------------------- */

function StatCardSkeleton() {
  return (
    <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-3 w-24 rounded bg-slate-200" />
      <div className="mt-4 h-6 w-16 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
    </div>
  );
}

/* ---------------------------- Helpers ------------------------------ */

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function validateSlot(slot: TimeSlot): string | null {
  if (!slot.start || !slot.end) return "Both start and end time are required.";
  if (slot.start === slot.end)
    return "Start and end time cannot be the same.";
  if (timeToMinutes(slot.end) <= timeToMinutes(slot.start))
    return "End time must be after start time.";
  return null;
}

/* =============================== Page ============================== */

export default function Dashboard() {
  const { user, isLoggedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* -------- Profile Edit state -------- */
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  /* -------- Availability state -------- */
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const [availabilityErrors, setAvailabilityErrors] =
    useState<AvailabilityErrors>({});
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);

  const doctorId = user?.id;
  const displayName = user?.name || "Doctor";

  /* ------------------------- Logout toast ------------------------- */

  useEffect(() => {
    if (!isLoggedIn) {
      toast.success("User has been logged out successfully.", {
        duration: 5000,
        className: "!bg-blue-600 !text-white !border-blue-600",
      });
    }
  }, [isLoggedIn]);

  /* --------------------- Load appointments ------------------------ */

  useEffect(() => {
    let cancelled = false;

    if (!doctorId) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setError(
            "Please sign in as a doctor to view your appointment dashboard."
          );
          setLoading(false);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    async function load() {
      try {
        setLoading(true);

        const res = await api.get(`/doctors/${doctorId}/appointments`);

        if (!cancelled) {
          const data =
            res.data?.appointments || res.data?.data || res.data;

          setAppointments(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Could not load your appointment schedule. Please try again."
          );

          toast.error("Could not load your appointment schedule.", {
            duration: 5000,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  /* --------------------- Load doctor profile ---------------------- */

  useEffect(() => {
    let cancelled = false;

    if (!doctorId) {
      Promise.resolve().then(() => {
        if (!cancelled) setProfileLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    async function loadProfile() {
      try {
        setProfileLoading(true);

        const { data, error: sbError } = await supabase
          .from("doctors")
          .select("bio, experience_years, avatar_url, full_name")
          .eq("id", doctorId)
          .single();

        if (sbError) throw sbError;

        if (!cancelled && data) {
          setBio(data.bio || "");
          setExperience(
            data.experience_years != null
              ? String(data.experience_years)
              : ""
          );
          setPhotoUrl(data.avatar_url || "");
          setPhotoPreview(data.avatar_url || "");
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not load your profile. Please try again.", {
            duration: 5000,
          });
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  /* ------------------ Load doctor availability --------------------- */

  useEffect(() => {
    let cancelled = false;

    if (!doctorId) {
      Promise.resolve().then(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    async function loadAvailability() {
      try {
        setAvailabilityLoading(true);

        const { data, error: sbError } = await supabase
          .from("doctor_availability")
          .select("day_of_week, start_time, end_time")
          .eq("doctor_id", doctorId);

        if (sbError) throw sbError;

        if (!cancelled && data) {
          const map: AvailabilityMap = {};
          const days: string[] = [];

          for (const row of data) {
            const day = row.day_of_week;
            if (!map[day]) {
              map[day] = [];
              days.push(day);
            }
            map[day].push({ start: row.start_time, end: row.end_time });
          }

          setSelectedDays(days);
          setAvailability(map);
        }
      } catch {
        if (!cancelled) {
          toast.error(
            "Could not load your availability. Please try again.",
            { duration: 5000 }
          );
        }
      } finally {
        if (!cancelled) {
          setAvailabilityLoading(false);
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  /* ---------------------- Derived stats --------------------------- */

  const patientsServed = new Set(
    appointments
      .map((a) => a.patientName || "Patient")
      .filter(Boolean)
  ).size;

  const ongoing = appointments.filter(
    (a) => a.status?.toLowerCase() === "scheduled"
  ).length;

  const revenue = appointments.reduce(
    (sum, a) => sum + (parseFloat(a.fee || "500") || 0),
    0
  );

  const stats = [
    {
      label: "Total Appointments",
      value: appointments.length,
      icon: ClipboardList,
    },
    {
      label: "Patients Served",
      value: patientsServed,
      icon: Users,
    },
    {
      label: "Ongoing Consultations",
      value: ongoing,
      icon: CalendarDays,
    },
    {
      label: "Revenue Earned",
      value: `Rs. ${revenue}`,
      icon: IndianRupee,
    },
  ];

  /* ------------------- Profile validation ------------------------ */

  function validateProfileForm(): boolean {
    const errs: ProfileErrors = {};

    const trimmedBio = bio.trim();
    if (trimmedBio.length < 20) {
      errs.bio = "Bio must be at least 20 characters long.";
    } else if (trimmedBio.length > MAX_BIO_LENGTH) {
      errs.bio = `Bio must be under ${MAX_BIO_LENGTH} characters.`;
    }

    const exp = parseInt(experience, 10);
    if (
      experience.trim() === "" ||
      Number.isNaN(exp) ||
      exp < 0 ||
      exp > MAX_EXPERIENCE_YEARS
    ) {
      errs.experience = `Experience must be a number between 0 and ${MAX_EXPERIENCE_YEARS}.`;
    }

    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ------------------- Photo change handler ---------------------- */

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB.");
      return;
    }

    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  /* --------------------- Save profile ---------------------------- */

  async function handleProfileSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!doctorId) {
      toast.error("Doctor not found. Please sign in again.");
      return;
    }

    if (!validateProfileForm()) {
      toast.error("Please fix the validation errors before saving.", {
        duration: 5000,
      });
      return;
    }

    setSavingProfile(true);

    try {
      const exp = parseInt(experience, 10);
      let avatarToSave = photoUrl;

      if (photoFile && photoPreview) {
        avatarToSave = photoPreview;
      }

      const { error: sbError } = await supabase
        .from("doctors")
        .upsert(
          {
            id: doctorId,
            full_name: displayName,
            bio: bio.trim(),
            experience_years: exp,
            avatar_url: avatarToSave || null,
          },
          { onConflict: "id" }
        )

      if (sbError) throw sbError;

      setPhotoUrl(avatarToSave);
      setPhotoFile(null);

      toast.success("Profile updated successfully!", {
        description: "Your bio, photo, and experience have been saved.",
        duration: 4000,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save profile. Please try again.";
      toast.error("Profile update failed.", {
        description: message,
        duration: 5000,
      });
    } finally {
      setSavingProfile(false);
    }
  }

  /* ------------------- Availability helpers ---------------------- */

  function toggleDay(day: string) {
    setAvailabilityErrors({});
    if (selectedDays.includes(day)) {
      setAvailability((old) => {
        const copy = { ...old };
        delete copy[day];
        return copy;
      });
      setSelectedDays((prev) => prev.filter((d) => d !== day));
    } else {
      setAvailability((old) => ({
        ...old,
        [day]: old[day] || [{ start: "10:00", end: "13:00" }],
      }));
      setSelectedDays((prev) => [...prev, day]);
    }
  }

  function addSlot(day: string) {
    setAvailabilityErrors({});
    setAvailability((old) => ({
      ...old,
      [day]: [...(old[day] || []), { start: "", end: "" }],
    }));
  }

  function removeSlot(day: string, index: number) {
    setAvailabilityErrors({});
    const slots = (availability[day] || []).filter((_, i) => i !== index);
    if (slots.length === 0) {
      setAvailability((old) => {
        const copy = { ...old };
        delete copy[day];
        return copy;
      });
      setSelectedDays((prev) => prev.filter((d) => d !== day));
    } else {
      setAvailability((old) => ({ ...old, [day]: slots }));
    }
  }

  function updateSlot(
    day: string,
    index: number,
    field: "start" | "end",
    value: string
  ) {
    setAvailabilityErrors({});
    setAvailability((old) => {
      const slots = (old[day] || []).map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      );
      return { ...old, [day]: slots };
    });
  }

  /* -------------------- Availability validation ------------------ */

  function validateAvailabilityForm(): boolean {
    const errs: AvailabilityErrors = {};

    if (selectedDays.length === 0) {
      errs.days = "Please select at least one available day.";
      setAvailabilityErrors(errs);
      return false;
    }

    for (const day of selectedDays) {
      const slots = availability[day] || [];
      if (slots.length === 0) {
        errs.slots = `${day} has no time slots. Please add at least one.`;
        setAvailabilityErrors(errs);
        return false;
      }
      for (const slot of slots) {
        const slotErr = validateSlot(slot);
        if (slotErr) {
          errs.slots = `${day}: ${slotErr}`;
          setAvailabilityErrors(errs);
          return false;
        }
      }
    }

    setAvailabilityErrors({});
    return true;
  }

  /* -------------------- Save availability ------------------------ */

  async function handleAvailabilitySubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!doctorId) {
      toast.error("Doctor not found. Please sign in again.");
      return;
    }

    if (!validateAvailabilityForm()) {
      toast.error("Please fix the validation errors before saving.", {
        duration: 5000,
      });
      return;
    }

    setSavingAvailability(true);

    try {
      const { error: deleteError } = await supabase
        .from("doctor_availability")
        .delete()
        .eq("doctor_id", doctorId);

      if (deleteError) throw deleteError;

      const rows: {
        doctor_id: string;
        day_of_week: string;
        start_time: string;
        end_time: string;
      }[] = [];

      for (const day of selectedDays) {
        for (const slot of availability[day] || []) {
          rows.push({
            doctor_id: doctorId,
            day_of_week: day,
            start_time: slot.start,
            end_time: slot.end,
          });
        }
      }

      if (rows.length > 0) {
        const { error: insertError } = await supabase
          .from("doctor_availability")
          .insert(rows);

        if (insertError) throw insertError;
      }

      toast.success("Availability saved successfully!", {
        description: `Your schedule for ${selectedDays.length} day(s) has been updated.`,
        duration: 4000,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save availability. Please try again.";
      toast.error("Availability update failed.", {
        description: message,
        duration: 5000,
      });
    } finally {
      setSavingAvailability(false);
    }
  }

  /* ============================= JSX ============================== */

  return (
    <PageLayout>
      <div className="my-6">
        <div className="space-y-6">
          <section className="flex items-center justify-between gap-3">
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              &larr; Back to Login
            </Link>
          </section>

          <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link
                  href="/login"
                  className="font-semibold transition hover:text-blue-700"
                >
                  Login
                </Link>
              </li>

              <li>
                <ChevronRight className="size-3.5 text-slate-400" />
              </li>

              <li
                aria-current="page"
                className="font-semibold text-blue-600"
              >
                Doctor Dashboard
              </li>
            </ol>
          </nav>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Information of Doctor&apos;s Appointment
          </h1>

          {/* ---------------------- Stats ---------------------- */}
          {loading ? (
            <section
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Dashboard loading state"
            >
              {[1, 2, 3, 4].map((item) => (
                <StatCardSkeleton key={item} />
              ))}
            </section>
          ) : error ? (
            <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
              {error}
            </section>
          ) : (
            <section
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Practice statistics"
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      {stat.label}
                    </span>

                    <stat.icon className="size-4 text-blue-600" />
                  </div>

                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </section>
          )}

          {/* ============ Profile Edit Section ============ */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <User className="size-5 text-blue-600" />
                Edit Profile
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Update your bio, profile photo, and experience.
              </p>
            </div>

            {profileLoading ? (
              <div className="space-y-4 p-6">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
              </div>
            ) : (
              <form
                onSubmit={handleProfileSubmit}
                className="space-y-6 p-6"
                noValidate
              >
                {/* Photo */}
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="relative">
                    <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-blue-50">
                      {photoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoPreview}
                          alt="Doctor profile"
                          className="size-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-blue-600">
                          {initials(displayName)}
                        </span>
                      )}
                    </div>
                    <label
                      htmlFor="photo-upload"
                      className="absolute -bottom-1 -right-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow transition hover:bg-blue-700"
                      title="Change photo"
                    >
                      <Camera className="size-3.5" />
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Profile Photo
                    </p>
                    <p className="text-xs text-slate-500">
                      JPG or PNG, max 2 MB. Click the camera icon to change.
                    </p>
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <label
                    htmlFor="experience"
                    className="mb-1 block text-sm font-semibold text-slate-700"
                  >
                    Experience (years)
                  </label>
                  <input
                    id="experience"
                    type="number"
                    min={0}
                    max={MAX_EXPERIENCE_YEARS}
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 8"
                    aria-invalid={!!profileErrors.experience}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/30 ${
                      profileErrors.experience
                        ? "border-red-400 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  />
                  {profileErrors.experience && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {profileErrors.experience}
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="bio"
                      className="block text-sm font-semibold text-slate-700"
                    >
                      Bio
                    </label>
                    <span className="text-xs text-slate-400">
                      {bio.length}/{MAX_BIO_LENGTH}
                    </span>
                  </div>
                  <textarea
                    id="bio"
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write a short professional bio (min 20 characters)..."
                    aria-invalid={!!profileErrors.bio}
                    className={`w-full resize-none rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/30 ${
                      profileErrors.bio
                        ? "border-red-400 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  />
                  {profileErrors.bio && (
                    <p className="mt-1 text-xs text-red-600" role="alert">
                      {profileErrors.bio}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile || profileLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="size-4" />
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* ========= Availability Setup Section ========= */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Clock className="size-5 text-blue-600" />
                Availability Setup
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select available days and set time slots for each day.
              </p>
            </div>

            {availabilityLoading ? (
              <div className="space-y-4 p-6">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 w-full animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            ) : (
              <form
                onSubmit={handleAvailabilitySubmit}
                className="space-y-6 p-6"
                noValidate
              >
                {/* Day selection */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    Available Days
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {WEEK_DAYS.map((day) => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          aria-pressed={isSelected}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {availabilityErrors.days && (
                    <p
                      className="mt-2 text-xs text-red-600"
                      role="alert"
                    >
                      {availabilityErrors.days}
                    </p>
                  )}
                </div>

                {/* Time slots for selected days */}
                {selectedDays.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Time Slots
                    </p>

                    {selectedDays.map((day) => (
                      <div
                        key={day}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">
                            {day}
                          </span>

                          <button
                            type="button"
                            onClick={() => addSlot(day)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-200"
                          >
                            <Plus className="size-3" />
                            Add Slot
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(availability[day] || []).map((slot, index) => (
                            <div
                              key={`${day}-${index}`}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="time"
                                value={slot.start}
                                onChange={(e) =>
                                  updateSlot(
                                    day,
                                    index,
                                    "start",
                                    e.target.value
                                  )
                                }
                                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                                aria-label={`Start time for ${day}`}
                              />

                              <span className="text-xs text-slate-400">
                                to
                              </span>

                              <input
                                type="time"
                                value={slot.end}
                                onChange={(e) =>
                                  updateSlot(
                                    day,
                                    index,
                                    "end",
                                    e.target.value
                                  )
                                }
                                className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                                aria-label={`End time for ${day}`}
                              />

                              <button
                                type="button"
                                onClick={() => removeSlot(day, index)}
                                className="ml-auto flex size-7 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50"
                                title="Remove slot"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          ))}

                          {(availability[day] || []).length === 0 && (
                            <p className="text-xs text-slate-400">
                              No time slots yet. Click &quot;Add Slot&quot;.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {availabilityErrors.slots && (
                  <p className="text-xs text-red-600" role="alert">
                    {availabilityErrors.slots}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      savingAvailability || availabilityLoading
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="size-4" />
                    {savingAvailability
                      ? "Saving..."
                      : "Save Availability"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* ----------------- Appointments ------------------ */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {appointments.length === 0 ? (
              <EmptyState
                title="No appointments yet"
                message="Your appointment schedule will appear here when patient bookings are connected to your practice."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-160 text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Patient</th>

                      <th className="px-5 py-3 font-semibold">Doctor</th>

                      <th className="px-5 py-3 font-semibold">Specialty</th>

                      <th className="px-5 py-3 font-semibold">
                        Date &amp; Time
                      </th>

                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {initials(apt.patientName || "Patient")}
                            </span>

                            <span className="font-semibold text-slate-800">
                              {apt.patientName || "Patient"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3 text-slate-600">
                          {apt.doctorName}
                        </td>

                        <td className="px-5 py-3 text-slate-600">
                          {apt.specialty}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                          {apt.date} · {apt.time}
                        </td>

                        <td className="px-5 py-3">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <CalendarDays className="size-5 shrink-0" />

            <p>
              Live mode: showing appointments fetched from your practice API.
              Profile and availability saved via Supabase.
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
