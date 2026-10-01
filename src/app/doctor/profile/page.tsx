"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  Loader2,
  Save,
  Star,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";

import PageLayout from "@/components/shared/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  readProfileFromAuthMetadata,
  saveDoctorProfile,
  saveProfileToAuthMetadata,
} from "@/lib/doctorProfile";

interface DoctorProfile {
  id: string;
  fullName: string;
  specialty: string;
  bio: string;
  experienceYears: number | null;
  consultationFee: number | null;
  education: string[];
  certifications: string[];
  rating: number | null;
  location: string;
  availability: string;
  avatarUrl: string | null;
  joinedAt: string;
}

interface DoctorForm {
  fullName: string;
  specialty: string;
  bio: string;
  experienceYears: string;
  consultationFee: string;
  education: string;
  certifications: string;
  location: string;
  availability: string;
}

const emptyForm: DoctorForm = {
  fullName: "",
  specialty: "",
  bio: "",
  experienceYears: "",
  consultationFee: "",
  education: "",
  certifications: "",
  location: "",
  availability: "",
};

type Row = Record<string, unknown>;

function pickText(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }
  return "";
}

function pickRating(row: Row, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toForm(doctor: DoctorProfile): DoctorForm {
  return {
    fullName: doctor.fullName,
    specialty: doctor.specialty,
    bio: doctor.bio,
    experienceYears:
      doctor.experienceYears != null
        ? String(doctor.experienceYears)
        : "",
    consultationFee:
      doctor.consultationFee != null
        ? String(doctor.consultationFee)
        : "",
    education: doctor.education.join("\n"),
    certifications: doctor.certifications.join("\n"),
    location: doctor.location,
    availability: doctor.availability,
  };
}

export default function DoctorProfilePage() {
  const { user, session } = useAuth();

  const [profile, setProfile] =
    useState<DoctorProfile | null>(null);

  const [form, setForm] =
    useState<DoctorForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    const client = supabase;

    if (!userId || !isSupabaseConfigured || !client) {
      const configError =
        !isSupabaseConfigured || !client
          ? "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment."
          : null;

      Promise.resolve().then(() => {
        if (configError) {
          setError(configError);
        }

        setLoading(false);
      });

      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: sbError } = await client
          .from("doctors")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (cancelled) return;

        if (sbError) {
          throw new Error(sbError.message);
        }

        const row = (data ?? {}) as Row;

        // Anything the table does not have falls back to auth metadata, so
        // values saved while the doctors columns were missing still show up.
        const meta = readProfileFromAuthMetadata(
          session?.user?.user_metadata
        );

        const doctor: DoctorProfile = {
          id: userId,
          fullName:
            pickText(row, ["full_name", "name"]) ||
            user.name ||
            "",
          specialty: pickText(row, ["specialty"]),
          bio: pickText(row, ["bio", "biography", "about"]) || meta.bio,
          experienceYears:
            pickRating(row, [
              "experience_years",
              "years_of_experience",
            ]) ?? meta.experience_years,
          consultationFee: pickRating(row, [
            "consultation_fee",
            "fee",
          ]),
          education: toList(
            row.education ?? row.qualifications ?? row.degrees
          ),
          certifications: toList(
            row.certifications ?? row.licenses
          ),
          rating: pickRating(row, ["rating", "average_rating"]),
          location: pickText(row, [
            "location",
            "clinic_name",
            "clinic_address",
          ]),
          availability: pickText(row, ["availability"]),
          avatarUrl:
            pickText(row, [
              "avatar_url",
              "avatar",
              "image_url",
            ]) || meta.avatar_url,
          joinedAt: pickText(row, ["created_at"]),
        };

        if (cancelled) return;

        setProfile(doctor);
        setForm(toForm(doctor));
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Failed to load doctor profile:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your profile."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.name, session?.user?.user_metadata]);

  const updateField = (
    field: keyof DoctorForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Please sign in as a doctor.");
      return;
    }

    const fullName = form.fullName.trim();
    const specialty = form.specialty.trim();

    if (!fullName) {
      toast.error("Full name is required.");
      return;
    }

    if (!specialty) {
      toast.error("Specialty is required.");
      return;
    }

    const experienceYears = form.experienceYears.trim();
    const consultationFee = form.consultationFee.trim();

    if (
      experienceYears !== "" &&
      (!Number.isInteger(Number(experienceYears)) ||
        Number(experienceYears) < 0 ||
        Number(experienceYears) > 70)
    ) {
      toast.error(
        "Experience must be a whole number between 0 and 70."
      );
      return;
    }

    if (
      consultationFee !== "" &&
      (!Number.isFinite(Number(consultationFee)) ||
        Number(consultationFee) < 0)
    ) {
      toast.error(
        "Consultation fee must be zero or more."
      );
      return;
    }

    const bio = form.bio.trim();

    if (bio.length > 2000) {
      toast.error("Bio must be under 2000 characters.");
      return;
    }

    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    try {
      setSaving(true);

      const result = await saveDoctorProfile(user.id, {
        full_name: fullName,
        specialty,
        bio: bio || null,
        experience_years:
          experienceYears === ""
            ? null
            : Number(experienceYears),
        consultation_fee:
          consultationFee === ""
            ? null
            : Number(consultationFee),
        education: toList(form.education),
        certifications: toList(form.certifications),
        location: form.location.trim() || null,
        availability: form.availability.trim() || null,
      });

      // Fall back to auth metadata when the table cannot hold these columns
      // yet, or RLS blocked the write.
      if (result.status === "unavailable") {
        await saveProfileToAuthMetadata({
          bio: bio.trim(),
          experience_years:
            experienceYears === "" ? null : Number(experienceYears),
          avatar_url: profile?.avatarUrl ?? null,
        });
      }

      const saved: DoctorProfile = {
        id: user.id,
        fullName,
        specialty,
        bio,
        experienceYears:
          experienceYears === ""
            ? null
            : Number(experienceYears),
        consultationFee:
          consultationFee === ""
            ? null
            : Number(consultationFee),
        education: toList(form.education),
        certifications: toList(form.certifications),
        rating: profile?.rating ?? null,
        location: form.location.trim(),
        availability: form.availability.trim(),
        avatarUrl: profile?.avatarUrl ?? null,
        joinedAt: profile?.joinedAt ?? "",
      };

      setProfile(saved);
      setForm(toForm(saved));
      setEditing(false);

      toast.success("Doctor profile updated successfully.");
    } catch (err) {
      console.error(
        "Failed to update doctor profile:",
        err
      );

      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update doctor profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm(toForm(profile));
    }

    setEditing(false);
  };

  if (!user?.id) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <Card>
            <CardContent className="py-10 text-center">
              <UserCircle className="mx-auto mb-4 size-12 text-muted-foreground" />

              <h2 className="text-xl font-semibold">
                Doctor login required
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Please log in as a doctor to view your profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <Card>
            <CardContent className="py-10 text-center">
              <h2 className="text-xl font-semibold">
                Unable to load profile
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                {error}
              </p>

              <Link href="/doctor/dashboard">
                <Button className="mt-6">
                  <ArrowLeft className="mr-2 size-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/doctor/dashboard"
              className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 size-4" />
              Back to Dashboard
            </Link>

            <h1 className="text-2xl font-bold md:text-3xl">
              Doctor Profile
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage your professional information.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user.id ? (
              <Link
                href={`/doctors/${user.id}`}
                className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
              >
                <ExternalLink className="mr-2 size-4" />
                View Public Profile
              </Link>
            ) : null}

            {!editing && (
              <Button onClick={() => setEditing(true)}>
                <Edit3 className="mr-2 size-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium"
              >
                Full Name
              </label>

              <Input
                id="name"
                value={form.fullName}
                disabled={!editing}
                maxLength={200}
                onChange={(e) =>
                  updateField("fullName", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="specialty"
                className="text-sm font-medium"
              >
                Specialty
              </label>

              <Input
                id="specialty"
                value={form.specialty}
                disabled={!editing}
                maxLength={120}
                onChange={(e) =>
                  updateField("specialty", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email
              </label>

              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
              />

              <p className="text-xs text-muted-foreground">
                Email is linked to your account.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="rating"
                className="text-sm font-medium"
              >
                Rating
              </label>

              <div className="flex h-9 items-center gap-2">
                <Star className="size-4 fill-amber-400 text-amber-400" />

                <span className="text-sm font-semibold text-slate-800">
                  {profile?.rating != null
                    ? `${profile.rating} out of 5`
                    : "No rating yet"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Calculated from patient reviews.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Practice Information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="location"
                  className="text-sm font-medium"
                >
                  Clinic Location
                </label>

                <Input
                  id="location"
                  value={form.location}
                  disabled={!editing}
                  maxLength={200}
                  placeholder="e.g. MedNovi Medical Center"
                  onChange={(e) =>
                    updateField("location", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="availability"
                  className="text-sm font-medium"
                >
                  Availability
                </label>

                <Input
                  id="availability"
                  value={form.availability}
                  disabled={!editing}
                  maxLength={120}
                  placeholder="e.g. Sun-Sat"
                  onChange={(e) =>
                    updateField("availability", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="experienceYears"
                  className="text-sm font-medium"
                >
                  Years of Experience
                </label>

                <Input
                  id="experienceYears"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={70}
                  step={1}
                  value={form.experienceYears}
                  disabled={!editing}
                  placeholder="e.g. 12"
                  onChange={(e) =>
                    updateField(
                      "experienceYears",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="consultationFee"
                  className="text-sm font-medium"
                >
                  Consultation Fee
                </label>

                <Input
                  id="consultationFee"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.consultationFee}
                  disabled={!editing}
                  placeholder="e.g. 1500"
                  onChange={(e) =>
                    updateField(
                      "consultationFee",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="bio"
                  className="text-sm font-medium"
                >
                  Professional Bio
                </label>

                <Textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  disabled={!editing}
                  maxLength={2000}
                  placeholder="Tell patients about your training, approach, and experience."
                  onChange={(e) =>
                    updateField("bio", e.target.value)
                  }
                />

                <p className="text-xs text-muted-foreground">
                  {form.bio.length}/2000 characters
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="education"
                  className="text-sm font-medium"
                >
                  Education
                </label>

                <Textarea
                  id="education"
                  rows={3}
                  value={form.education}
                  disabled={!editing}
                  placeholder={
                    "One entry per line, most recent first"
                  }
                  onChange={(e) =>
                    updateField("education", e.target.value)
                  }
                />

                <p className="text-xs text-muted-foreground">
                  One entry per line, e.g.{" "}
                  <code>MBBS, University of Lahore</code>
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="certifications"
                  className="text-sm font-medium"
                >
                  Certifications
                </label>

                <Textarea
                  id="certifications"
                  rows={3}
                  value={form.certifications}
                  disabled={!editing}
                  placeholder={
                    "One certification per line"
                  }
                  onChange={(e) =>
                    updateField(
                      "certifications",
                      e.target.value
                    )
                  }
                />

                <p className="text-xs text-muted-foreground">
                  One entry per line, e.g.{" "}
                  <code>PMDC Registered Cardiologist</code>
                </p>
              </div>
            </div>

            {profile?.joinedAt ? (
              <p className="text-xs text-muted-foreground">
                Profile created on{" "}
                {new Date(profile.joinedAt).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
                .
              </p>
            ) : null}

            {/* Actions */}
            {editing && (
              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
