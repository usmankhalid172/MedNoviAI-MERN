"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  Loader2,
  Save,
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
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";

interface DoctorProfile {
  id?: string;
  name?: string;
  email?: string;
  specialty?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  biography?: string;
  consultationFee?: number;
  clinicName?: string;
  clinicAddress?: string;
}

interface DoctorForm {
  licenseNumber: string;
  yearsOfExperience: string;
  biography: string;
  consultationFee: string;
  clinicName: string;
  clinicAddress: string;
}

const emptyForm: DoctorForm = {
  licenseNumber: "",
  yearsOfExperience: "",
  biography: "",
  consultationFee: "",
  clinicName: "",
  clinicAddress: "",
};

function extractDoctor(data: any): DoctorProfile {
  return (
    data?.doctor ||
    data?.data?.doctor ||
    data?.data ||
    data
  );
}

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.response?.data?.errors?.[0] ||
    fallback
  );
}

export default function DoctorProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] =
    useState<DoctorProfile | null>(null);

  const [form, setForm] =
    useState<DoctorForm>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(
          `/doctors/${user.id}`
        );

        const doctor = extractDoctor(response.data);

        setProfile(doctor);

        setForm({
          licenseNumber:
            doctor.licenseNumber || "",

          yearsOfExperience:
            doctor.yearsOfExperience !== undefined &&
            doctor.yearsOfExperience !== null
              ? String(doctor.yearsOfExperience)
              : "",

          biography:
            doctor.biography || "",

          consultationFee:
            doctor.consultationFee !== undefined &&
            doctor.consultationFee !== null
              ? String(doctor.consultationFee)
              : "",

          clinicName:
            doctor.clinicName || "",

          clinicAddress:
            doctor.clinicAddress || "",
        });
      } catch (err) {
        console.error(
          "Failed to load doctor profile:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to load your profile."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

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
    if (!form.licenseNumber.trim()) {
      toast.error("License number is required.");
      return;
    }

    const years = Number(form.yearsOfExperience);
    const fee = Number(form.consultationFee);

    if (
      !Number.isInteger(years) ||
      years < 0 ||
      years > 70
    ) {
      toast.error(
        "Years of experience must be between 0 and 70."
      );
      return;
    }

    if (
      !Number.isFinite(fee) ||
      fee < 0 ||
      fee > 1000000
    ) {
      toast.error(
        "Consultation fee must be between 0 and 1,000,000."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await api.patch(
        "/doctors/profile",
        {
          licenseNumber:
            form.licenseNumber.trim(),

          yearsOfExperience: years,

          biography:
            form.biography.trim() || null,

          consultationFee: fee,

          clinicName:
            form.clinicName.trim() || null,

          clinicAddress:
            form.clinicAddress.trim() || null,
        }
      );

      const updatedDoctor = extractDoctor(
        response.data
      );

      if (updatedDoctor) {
        setProfile(updatedDoctor);

        setForm({
          licenseNumber:
            updatedDoctor.licenseNumber ??
            form.licenseNumber,

          yearsOfExperience:
            updatedDoctor.yearsOfExperience !==
              undefined &&
            updatedDoctor.yearsOfExperience !==
              null
              ? String(
                  updatedDoctor.yearsOfExperience
                )
              : form.yearsOfExperience,

          biography:
            updatedDoctor.biography ??
            form.biography,

          consultationFee:
            updatedDoctor.consultationFee !==
              undefined &&
            updatedDoctor.consultationFee !==
              null
              ? String(
                  updatedDoctor.consultationFee
                )
              : form.consultationFee,

          clinicName:
            updatedDoctor.clinicName ??
            form.clinicName,

          clinicAddress:
            updatedDoctor.clinicAddress ??
            form.clinicAddress,
        });
      }

      setEditing(false);

      toast.success(
        "Doctor profile updated successfully."
      );
    } catch (err) {
      console.error(
        "Failed to update doctor profile:",
        err
      );

      toast.error(
        getErrorMessage(
          err,
          "Failed to update doctor profile."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) {
      setEditing(false);
      return;
    }

    setForm({
      licenseNumber:
        profile.licenseNumber || "",

      yearsOfExperience:
        profile.yearsOfExperience !== undefined &&
        profile.yearsOfExperience !== null
          ? String(profile.yearsOfExperience)
          : "",

      biography:
        profile.biography || "",

      consultationFee:
        profile.consultationFee !== undefined &&
        profile.consultationFee !== null
          ? String(profile.consultationFee)
          : "",

      clinicName:
        profile.clinicName || "",

      clinicAddress:
        profile.clinicAddress || "",
    });

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

          {!editing && (
            <Button
              onClick={() => setEditing(true)}
            >
              <Edit3 className="mr-2 size-4" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              Basic Information
            </CardTitle>
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
                value={profile?.name || user.name || ""}
                disabled
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
                value={profile?.specialty || ""}
                disabled
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email
              </label>

              <Input
                id="email"
                type="email"
                value={
                  profile?.email ||
                  user.email ||
                  ""
                }
                disabled
              />

              <p className="text-xs text-muted-foreground">
                Email is linked to your account.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              Professional Information
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="licenseNumber"
                  className="text-sm font-medium"
                >
                  License Number
                </label>

                <Input
                  id="licenseNumber"
                  value={form.licenseNumber}
                  disabled={!editing}
                  maxLength={100}
                  onChange={(e) =>
                    updateField(
                      "licenseNumber",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="yearsOfExperience"
                  className="text-sm font-medium"
                >
                  Years of Experience
                </label>

                <Input
                  id="yearsOfExperience"
                  type="number"
                  min={0}
                  max={70}
                  value={form.yearsOfExperience}
                  disabled={!editing}
                  onChange={(e) =>
                    updateField(
                      "yearsOfExperience",
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
                  min={0}
                  max={1000000}
                  value={form.consultationFee}
                  disabled={!editing}
                  onChange={(e) =>
                    updateField(
                      "consultationFee",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="clinicName"
                  className="text-sm font-medium"
                >
                  Clinic Name
                </label>

                <Input
                  id="clinicName"
                  value={form.clinicName}
                  disabled={!editing}
                  maxLength={200}
                  onChange={(e) =>
                    updateField(
                      "clinicName",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="clinicAddress"
                  className="text-sm font-medium"
                >
                  Clinic Address
                </label>

                <Input
                  id="clinicAddress"
                  value={form.clinicAddress}
                  disabled={!editing}
                  maxLength={500}
                  onChange={(e) =>
                    updateField(
                      "clinicAddress",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="biography"
                  className="text-sm font-medium"
                >
                  Biography
                </label>

                <textarea
                  id="biography"
                  rows={6}
                  maxLength={3000}
                  value={form.biography}
                  disabled={!editing}
                  onChange={(e) =>
                    updateField(
                      "biography",
                      e.target.value
                    )
                  }
                  placeholder="Tell patients about your professional background..."
                  className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

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