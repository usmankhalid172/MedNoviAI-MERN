"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";

import PageLayout from "@/components/shared/PageLayout";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";

import {
  CalendarDays,
  CalendarClock,
  ChevronRight,
  Users,
  ClipboardList,
  User,
  Camera,
  Save,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  ensureDoctorRow,
  isTransientError,
  readProfileFromAuthMetadata,
  saveDoctorProfile,
  saveProfileToAuthMetadata,
  tableCanStoreProfile,
  withRetry,
  type DoctorProfileExtras,
  type SaveDoctorProfileResult,
} from "@/lib/doctorProfile";
import { downscaleImageDataUrl } from "@/lib/utils";
import { setAppointmentStatus } from "@/lib/appointmentsClient";

/* ------------------------- Supabase Config ------------------------- */

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

type AppointmentRow = {
  id: string;
  patient_id: string | null;
  patient_name?: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: string | null;
};

type ProfileErrors = {
  bio?: string;
  experience?: string;
};

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

function formatDate(value: string | null): string {
  if (!value) return "—";

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3])
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function formatTime(value: string | null): string {
  if (!value) return "—";

  const match = /^(\d{1,2}):(\d{2})/.exec(value);

  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${suffix}`;
}

/* ------------------------- Error reporting ------------------------- */

const MIGRATION_HINT =
  "public.doctors is missing the bio/experience_years columns and its write " +
  "policies. Paste supabase/fix-doctor-profile-400.sql into the Supabase SQL " +
  "editor to enable proper table storage.";

function describeProfileError(err: unknown): string {
  const message =
    err instanceof Error
      ? err.message
      : "Failed to save profile. Please try again.";

  return message;
}

/* =============================== Page ============================== */

export default function Dashboard() {
  const { user, session, isLoggedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* -------- Profile Edit state -------- */

  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [profileErrors, setProfileErrors] =
    useState<ProfileErrors>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const doctorId = user?.id;
  const displayName = user?.name || "Doctor";
  const publicProfileHref = doctorId
    ? `/doctors/${doctorId}`
    : "/doctors";

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
        setError(null);

        if (!isSupabaseConfigured || !supabase) {
          throw new Error(
            "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment."
          );
        }

        // Read through this app's own origin. PostgREST sits behind Cloudflare,
        // and a rejected cross-origin request returns no
        // `Access-Control-Allow-Origin`, which the browser reports as "blocked
        // by CORS policy" with the real status thrown away.
        const { data: sessionData } = await supabase!.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (!accessToken) {
          throw new Error("Please sign in again to view your appointments.");
        }

        const response = await withRetry(async () => {
          const result = await fetch("/api/doctor-appointments", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!result.ok) {
            const payload = (await result.json().catch(() => null)) as {
              error?: string;
            } | null;

            const error = new Error(
              payload?.error ?? `Could not load appointments (${result.status}).`
            );

            (error as Error & { status?: number }).status = result.status;
            throw error;
          }

          return result;
        });

        const payload = (await response.json()) as {
          rows: AppointmentRow[];
          namesByPatientId: Record<string, string>;
        };

        if (cancelled) return;

        const rows = payload.rows ?? [];
        const namesByPatientId = payload.namesByPatientId ?? {};

        setAppointments(
          rows.map((row) => ({
            id: row.id,
            // The name stored on the booking is authoritative. The profile lookup
            // only covers bookings made before `patient_name` existed.
            patientName:
              row.patient_name ||
              (row.patient_id
                ? namesByPatientId[row.patient_id]
                : null) ||
              "Patient",
            doctorName: displayName,
            specialty: "—",
            date: formatDate(row.appointment_date),
            time: formatTime(row.appointment_time),
            location: "—",
            status: row.status || "pending",
          }))
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load your appointment schedule. Please try again."
          );

          toast.error(
            "Could not load your appointment schedule.",
            {
              description:
                err instanceof Error
                  ? err.message
                  : undefined,
              duration: 5000,
            }
          );
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
  }, [doctorId, displayName]);

  /* ---------------- Approve / reject a booking -------------------- */

  /**
   * Approving writes `confirmed` and rejecting writes `cancelled`, so both land
   * in the `appointments` row the patient already reads - that single row is what
   * connects the two dashboards. The write goes through the API rather than a
   * direct Supabase update so the actor comes from the caller's token and row
   * level security still applies.
   */
  async function updateAppointmentStatus(
    appointmentId: string,
    status: "confirmed" | "cancelled"
  ) {
    const previous = appointments;
    const label = status === "confirmed" ? "Approved" : "Rejected";

    setUpdatingId(appointmentId);

    // Swap the row in place so the table reflects the decision immediately, and
    // restore it if the write fails.
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId
          ? { ...appointment, status }
          : appointment
      )
    );

    try {
      const result = await setAppointmentStatus(appointmentId, status);

      if (!result.ok) {
        throw new Error(result.message);
      }

      toast.success(`Appointment ${label.toLowerCase()}.`, {
        description:
          status === "confirmed"
            ? "The patient can now see that their booking is confirmed."
            : "The patient can now see that their booking was declined.",
        duration: 5000,
      });
    } catch (err) {
      setAppointments(previous);

      toast.error(`Could not ${label.toLowerCase()} the appointment.`, {
        description:
          err instanceof Error ? err.message : "Please try again.",
        duration: 6000,
      });
    } finally {
      setUpdatingId(null);
    }
  }

  /* --------------------- Load doctor profile ---------------------- */

  useEffect(() => {
    let cancelled = false;

    if (!doctorId) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setProfileLoading(false);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    // Captured as a const so the guard above keeps its narrowing inside the
    // closure below, where a mutable `doctorId` would widen back to undefined.
    const id = doctorId;

    async function loadProfile() {
      if (cancelled) return;

      const metaProfile = readProfileFromAuthMetadata(
        session?.user?.user_metadata
      );

      function applyProfile(profile: DoctorProfileExtras) {
        if (cancelled) return;

        setBio(profile.bio ?? "");
        setExperience(
          profile.experience_years != null
            ? String(profile.experience_years)
            : ""
        );
        setPhotoUrl(profile.avatar_url ?? "");
        setPhotoPreview(profile.avatar_url ?? "");
      }

      try {
        setProfileLoading(true);

        // Until public.doctors has the bio / experience_years columns the row
        // read can only fail or come back empty, so serve the saved copy from
        // auth metadata (already in the session) and skip the network call
        // entirely.
        if (!(await tableCanStoreProfile())) {
          applyProfile(metaProfile);
          return;
        }

        const { data, error: sbError } = await withRetry(() =>
          supabase!.from("doctors").select("*").eq("id", id).maybeSingle()
        );

        if (sbError) {
          throw sbError;
        }

        const row = data as Record<string, unknown> | null;

        // A doctor who has never saved has no row in public.doctors at all, so
        // their public profile page renders "not found". Provision the row on
        // load, seeded from auth metadata, instead of waiting for a manual save.
        if (!row) {
          await ensureDoctorRow(id, {
            full_name: displayName,
            bio: metaProfile.bio || null,
            experience_years: metaProfile.experience_years ?? null,
          });
        }

        applyProfile({
          bio: typeof row?.bio === "string" ? row.bio : metaProfile.bio,
          experience_years:
            typeof row?.experience_years === "number"
              ? row.experience_years
              : metaProfile.experience_years,
          avatar_url:
            typeof row?.avatar_url === "string"
              ? row.avatar_url
              : metaProfile.avatar_url,
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (isTransientError(err)) {
          applyProfile(metaProfile);
          return;
        }

        toast.error(
          "Could not load your profile. Please try again.",
          {
            description: describeProfileError(err),
            duration: 8000,
          }
        );
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
    // displayName seeds the provisioned row's full_name.
  }, [doctorId, displayName, session]);


  const patientsServed = new Set(
    appointments
      .map((appointment) => appointment.patientName || "Patient")
      .filter(Boolean)
  ).size;

  const ongoing = appointments.filter(
    (appointment) =>
      appointment.status?.toLowerCase() === "confirmed"
  ).length;

  const awaitingApproval = appointments.filter(
    (appointment) => appointment.status?.toLowerCase() === "pending"
  ).length;

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
      label: "Awaiting Approval",
      value: awaitingApproval,
      icon: CalendarClock,
    },
    {
      label: "Confirmed",
      value: ongoing,
      icon: CalendarDays,
    },
  ];

  /* ------------------- Profile validation ------------------------ */

  function validateProfileForm(): boolean {
    const errs: ProfileErrors = {};

    const trimmedBio = bio.trim();

    if (trimmedBio.length < 20) {
      errs.bio =
        "Bio must be at least 20 characters long.";
    } else if (trimmedBio.length > MAX_BIO_LENGTH) {
      errs.bio =
        `Bio must be under ${MAX_BIO_LENGTH} characters.`;
    }

    const exp = parseInt(experience, 10);

    if (
      experience.trim() === "" ||
      Number.isNaN(exp) ||
      exp < 0 ||
      exp > MAX_EXPERIENCE_YEARS
    ) {
      errs.experience =
        `Experience must be a number between 0 and ${MAX_EXPERIENCE_YEARS}.`;
    }

    setProfileErrors(errs);

    return Object.keys(errs).length === 0;
  }

  /* ------------------- Photo change handler ---------------------- */

  function handlePhotoChange(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

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

    reader.onload = async () => {
      const raw = reader.result as string;

      // The picture is stored on the account as a data URL until the doctors
      // table migration lands, and base64 inflates the image ~4/3. A 2 MB file
      // therefore produced a ~2.7 MB `PUT /auth/v1/user` body, which the API
      // gateway rejects with a header-less 500 that the browser misreports as a
      // CORS failure. Downscale once, here, so the saved payload stays small.
      try {
        const downscaled = await downscaleImageDataUrl(raw);
        setPhotoPreview(downscaled);
      } catch {
        setPhotoPreview(raw);
        toast.error(
          "Could not resize that image. Please choose a smaller one."
        );
      }
    };

    reader.readAsDataURL(file);
  }

  /* --------------------- Save profile ---------------------------- */

  async function handleProfileSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!doctorId) {
      toast.error(
        "Doctor not found. Please sign in again."
      );
      return;
    }

    if (!validateProfileForm()) {
      toast.error(
        "Please fix the validation errors before saving.",
        {
          duration: 5000,
        }
      );
      return;
    }

    setSavingProfile(true);

    try {
      const exp = parseInt(experience, 10);

      let avatarToSave = photoUrl;

      if (photoFile && photoPreview) {
        avatarToSave = photoPreview;
      }

      const profile: DoctorProfileExtras = {
        bio: bio.trim(),
        experience_years: exp,
        avatar_url: avatarToSave || null,
      };

      let tableResult: SaveDoctorProfileResult = {
        status: "unavailable",
        reason:
          "public.doctors cannot store bio/experience_years, so the table " +
          "write was skipped entirely.",
      };

      // Only write to public.doctors once it can actually hold the profile.
      // Until the migration runs it has no bio/experience_years columns and
      // RLS rejects the write, so the request can only fail - and a failing
      // request surfaces as a spurious CORS/network error in the browser.
      if (await tableCanStoreProfile()) {
        try {
          tableResult = await saveDoctorProfile(doctorId, {
            full_name: displayName,
            ...profile,
          });
        } catch (err) {
          if (!isTransientError(err)) {
            throw err;
          }

          // Transient edge fault; auth metadata is unaffected.
          tableResult = { status: "unavailable", reason: describeProfileError(err) };
        }
      }

      // The table cannot hold these columns yet, or RLS blocked the write.
      // auth metadata always works, so the profile is never lost.
      if (tableResult.status === "unavailable") {
        await saveProfileToAuthMetadata(profile);
      }

      setPhotoUrl(avatarToSave);
      setPhotoFile(null);

      toast.success(
        "Profile updated successfully!",
        {
          description:
            tableResult.status === "unavailable"
              ? `Saved to your account. ${MIGRATION_HINT} (${tableResult.reason})`
              : "Your bio, photo, and experience have been saved.",
          duration: 6000,
        }
      );
    } catch (err) {
      toast.error("Profile update failed.", {
        description: describeProfileError(err),
        duration: 8000,
      });
    } finally {
      setSavingProfile(false);
    }
  }

  /* ============================= JSX ============================== */

  return (
    <PageLayout>
      <div className="my-6">
        <div className="space-y-6">

          {/* Back Button */}
          <section className="flex items-center justify-between gap-3">
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              &larr; Back to Login
            </Link>
          </section>

          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-slate-500"
          >
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

          {/* Page Title */}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Doctor Dashboard
          </h1>

          {/* Doctor Portal Navigation */}
          <section
            aria-label="Doctor portal navigation"
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <Link
              href={publicProfileHref}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">
                Doctor Profile
              </p>
              <p className="mt-1 text-xs text-slate-500">
                View your public profile
              </p>
            </Link>

            <Link
              href="/doctor/availability"
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">
                Availability
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Manage your working hours and slots
              </p>
            </Link>

            <Link
              href="/doctor/appointments"
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">
                Appointments
              </p>
              <p className="mt-1 text-xs text-slate-500">
                View and manage appointments
              </p>
            </Link>
          </section>

          {/* Stats */}
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
                <StatCard
                  key={stat.label}
                  title={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                />
              ))}
            </section>
          )}

          {/* Profile Edit Section */}
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
                    onChange={(e) =>
                      setExperience(e.target.value)
                    }
                    placeholder="e.g. 8"
                    aria-invalid={!!profileErrors.experience}
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/30 ${
                      profileErrors.experience
                        ? "border-red-400 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  />

                  {profileErrors.experience && (
                    <p
                      className="mt-1 text-xs text-red-600"
                      role="alert"
                    >
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
                    onChange={(e) =>
                      setBio(e.target.value)
                    }
                    placeholder="Write a short professional bio (min 20 characters)..."
                    aria-invalid={!!profileErrors.bio}
                    className={`w-full resize-none rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500/30 ${
                      profileErrors.bio
                        ? "border-red-400 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  />

                  {profileErrors.bio && (
                    <p
                      className="mt-1 text-xs text-red-600"
                      role="alert"
                    >
                      {profileErrors.bio}
                    </p>
                  )}
                </div>

                {/* Save Profile */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      savingProfile || profileLoading
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="size-4" />

                    {savingProfile
                      ? "Saving..."
                      : "Save Profile"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Availability Summary */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <CalendarDays className="size-5 text-blue-600" />
                  Doctor Availability
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manage your weekly working days, time slots, and availability rules.
                </p>
              </div>

              <Link
                href="/doctor/availability"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Manage Availability
              </Link>
            </div>
          </section>

          {/* Appointments */}
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
                      <th className="px-5 py-3 font-semibold">
                        Patient
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Doctor
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Specialty
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Date &amp; Time
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Status
                      </th>

                      <th className="px-5 py-3 font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((apt) => {
                      const normalized = apt.status?.toLowerCase();
                      return (
                        <tr
                          key={apt.id}
                          className="hover:bg-slate-50/60"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                {initials(
                                  apt.patientName || "Patient"
                                )}
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
                            {apt.date} • {apt.time}
                          </td>

                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                normalized === "confirmed" ||
                                normalized === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : normalized === "cancelled"
                                  ? "bg-red-50 text-red-700"
                                  : normalized === "pending"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-slate-50 text-slate-700"
                              }`}
                            >
                              {apt.status}
                            </span>
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={
                                  updatingId === apt.id ||
                                  normalized !== "pending"
                                }
                                onClick={() => {
                                  updateAppointmentStatus(apt.id, "confirmed");
                                }}
                                className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 
                                text-xs font-semibold text-white transition hover:bg-emerald-700 
                                disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                              >
                                {updatingId === apt.id ? "Updating..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                disabled={
                                  updatingId === apt.id ||
                                  normalized !== "pending"
                                }
                                onClick={() => {
                                  updateAppointmentStatus(apt.id, "cancelled");
                                }}
                                className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs 
                                font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed
                                disabled:opacity-50 cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* System Information */}
          <section className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            <CalendarDays className="size-5 shrink-0" />

            <p>
              Live mode: showing appointments fetched from your practice API.
              Profile information is saved via Supabase.
            </p>
          </section>

        </div>
      </div>
    </PageLayout>
  );
}