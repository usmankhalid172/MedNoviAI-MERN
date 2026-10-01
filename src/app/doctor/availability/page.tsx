"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  Edit3,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import PageLayout from "@/components/shared/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import AvailabilityForm, {
  type AvailabilityFormValues,
} from "@/components/doctor/AvailabilityForm";

interface AvailabilityRecord {
  doctorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

type AvailabilityRow = {
  doctor_id: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
};

const DAYS = [
  { value: "Monday", label: "Monday", order: 1 },
  { value: "Tuesday", label: "Tuesday", order: 2 },
  { value: "Wednesday", label: "Wednesday", order: 3 },
  { value: "Thursday", label: "Thursday", order: 4 },
  { value: "Friday", label: "Friday", order: 5 },
  { value: "Saturday", label: "Saturday", order: 6 },
  { value: "Sunday", label: "Sunday", order: 7 },
];

const NUMERIC_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const emptyForm: AvailabilityFormValues = {
  dayOfWeek: "Monday",
  startTime: "09:00",
  endTime: "13:00",
};

function toDayName(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();

  if (!trimmed) return "";

  if (/^\d+$/.test(trimmed)) {
    return NUMERIC_DAYS[Number(trimmed)] ?? trimmed;
  }

  const short = trimmed.slice(0, 3).toLowerCase();

  return (
    DAYS.find((day) => day.value.slice(0, 3).toLowerCase() === short)
      ?.value ?? trimmed
  );
}

function dayOrder(day: string): number {
  return (
    DAYS.find(
      (item) =>
        item.value.slice(0, 3).toLowerCase() ===
        day.slice(0, 3).toLowerCase()
    )?.order ?? 99
  );
}

function getDayName(day: string) {
  return toDayName(day) || "Unknown";
}

function minutesFromTime(time: string) {
  const match = /(\d{1,2}):(\d{2})/.exec(time);

  if (!match) return 0;

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTime(time: string) {
  const [hoursString, minutesString] = time.split(":");

  const hours = Number(hoursString);
  const minutes = Number(minutesString);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return time;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function toTimeOnlyValue(time: string) {
  if (!time) {
    return "";
  }

  return time.length === 5 ? `${time}:00` : time;
}

function toInputTime(time: string) {
  if (!time) {
    return "";
  }

  return time.slice(0, 5);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function DoctorAvailabilityPage() {
  const { user } = useAuth();

  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(
    null
  );

  const [saving, setSaving] = useState(false);
  const [deletingDay, setDeletingDay] = useState<string | null>(
    null
  );

  const [form, setForm] =
    useState<AvailabilityFormValues>(emptyForm);

  const [reloadKey, setReloadKey] = useState(0);

  const refresh = () => {
    setReloadKey((key) => key + 1);
  };

  useEffect(() => {
    const currentUserId = user?.id;
    const client = supabase;

    if (!currentUserId || !isSupabaseConfigured || !client) {
      return;
    }

    const doctorId: string = currentUserId;
    const db = client;

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: sbError } = await db
          .from("doctor_availability")
          .select(
            "doctor_id, day_of_week, start_time, end_time"
          )
          .eq("doctor_id", doctorId);

        if (cancelled) return;

        if (sbError) {
          throw new Error(sbError.message);
        }

        const rows = (data ?? []) as unknown as AvailabilityRow[];

        setRecords(
          rows
            .map((row) => ({
              doctorId: row.doctor_id ?? doctorId,
              dayOfWeek: toDayName(row.day_of_week),
              startTime: row.start_time ?? "",
              endTime: row.end_time ?? "",
            }))
            .filter((row) => row.dayOfWeek.length > 0)
        );
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Failed to load doctor availability:",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Unable to load your availability."
          )
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user?.id, reloadKey]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const orderDiff =
        dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek);

      if (orderDiff !== 0) {
        return orderDiff;
      }

      return a.startTime.localeCompare(b.startTime);
    });
  }, [records]);

  const daysCovered = useMemo(
    () =>
      new Set(records.map((r) => r.dayOfWeek.toLowerCase()))
        .size,
    [records]
  );

  const weeklyHours = useMemo(
    () =>
      records.reduce((total, record) => {
        const span =
          minutesFromTime(record.endTime) -
          minutesFromTime(record.startTime);

        return span > 0 ? total + span / 60 : total;
      }, 0),
    [records]
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingDay(null);
    setShowForm(false);
  };

  const handleFormChange = (
    field: keyof AvailabilityFormValues,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = (): string | null => {
    if (!form.startTime || !form.endTime) {
      return "Start time and end time are required.";
    }

    if (form.startTime >= form.endTime) {
      return "End time must be after start time.";
    }

    return null;
  };

  const handleSave = async () => {
    const userId = user?.id;
    const client = supabase;

    if (!userId || !isSupabaseConfigured || !client) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const day = toDayName(form.dayOfWeek);
    const startTime = toTimeOnlyValue(form.startTime);
    const endTime = toTimeOnlyValue(form.endTime);

    try {
      setSaving(true);

      let conflictQuery = client
        .from("doctor_availability")
        .select("day_of_week")
        .eq("doctor_id", userId)
        .eq("day_of_week", day);

      if (editingDay) {
        conflictQuery = conflictQuery.neq(
          "day_of_week",
          editingDay
        );
      }

      const { data: existing, error: conflictError } =
        await conflictQuery;

      if (conflictError) {
        throw new Error(conflictError.message);
      }

      if ((existing ?? []).length > 0) {
        toast.error(
          `You already have an availability rule for ${getDayName(day)}.`
        );
        return;
      }

      if (editingDay) {
        const { error: sbError } = await client
          .from("doctor_availability")
          .update({
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
          })
          .eq("doctor_id", userId)
          .eq("day_of_week", editingDay);

        if (sbError) {
          throw new Error(sbError.message);
        }

        toast.success("Availability updated successfully.");
      } else {
        const { error: sbError } = await client
          .from("doctor_availability")
          .insert({
            doctor_id: userId,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
          });

        if (sbError) {
          throw new Error(sbError.message);
        }

        toast.success("Availability created successfully.");
      }

      resetForm();
      refresh();
    } catch (err) {
      console.error("Failed to save availability:", err);

      toast.error(
        getErrorMessage(err, "Failed to save availability.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: AvailabilityRecord) => {
    setEditingDay(record.dayOfWeek);

    setForm({
      dayOfWeek: record.dayOfWeek,
      startTime: toInputTime(record.startTime),
      endTime: toInputTime(record.endTime),
    });

    setShowForm(true);
  };

  const handleDelete = async (record: AvailabilityRecord) => {
    const userId = user?.id;
    const client = supabase;

    if (!userId || !isSupabaseConfigured || !client) {
      return;
    }

    const confirmed = window.confirm(
      `Delete your ${getDayName(record.dayOfWeek)} availability?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingDay(record.dayOfWeek);

      const { error: sbError } = await client
        .from("doctor_availability")
        .delete()
        .eq("doctor_id", userId)
        .eq("day_of_week", record.dayOfWeek);

      if (sbError) {
        throw new Error(sbError.message);
      }

      setRecords((current) =>
        current.filter(
          (item) => item.dayOfWeek !== record.dayOfWeek
        )
      );

      toast.success("Availability deleted successfully.");

      if (editingDay === record.dayOfWeek) {
        resetForm();
      }
    } catch (err) {
      console.error(
        "Failed to delete availability:",
        err
      );

      toast.error(
        getErrorMessage(
          err,
          "Failed to delete availability."
        )
      );
    } finally {
      setDeletingDay(null);
    }
  };

  if (!user?.id) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Card>
            <CardContent className="py-10 text-center">
              <CalendarDays className="mx-auto mb-4 size-12 text-muted-foreground" />

              <h2 className="text-xl font-semibold">
                Doctor login required
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Please log in as a doctor to manage availability.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Card>
            <CardContent className="py-10 text-center">
              <CalendarDays className="mb-4 mx-auto size-12 text-muted-foreground" />

              <h2 className="text-xl font-semibold">
                Supabase is not configured
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Add NEXT_PUBLIC_SUPABASE_URL and
                NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment
                to manage availability.
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
        <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/doctor/dashboard"
              className="mb-3 inline-flex items-center text-sm text-white bg-blue-500 hover:bg-blue-700
              rounded-2xl px-4 py-2"
            >
              &larr; Back to Dashboard
            </Link>

            <h1 className="text-2xl font-bold md:text-3xl">
              Availability Management
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage your weekly appointment schedule.
            </p>
          </div>

          {!showForm && (
            <Button
              onClick={() => {
                setForm(emptyForm);
                setEditingDay(null);
                setShowForm(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Add Availability
            </Button>
          )}
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="size-5 text-primary" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Total Rules
                </p>

                <p className="text-2xl font-bold">
                  {records.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-lg bg-green-500/10">
                <CalendarDays className="size-5 text-green-600" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Days Covered
                </p>

                <p className="text-2xl font-bold">
                  {daysCovered}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
                <Clock3 className="size-5 text-muted-foreground" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Weekly Hours
                </p>

                <p className="text-2xl font-bold">
                  {Math.round(weeklyHours * 10) / 10}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reusable Add/Edit Form */}
        {showForm && (
          <AvailabilityForm
            form={form}
            editing={editingDay !== null}
            saving={saving}
            days={DAYS}
            onChange={handleFormChange}
            onSave={handleSave}
            onCancel={resetForm}
          />
        )}

        {/* Error */}
        {error && (
          <Card>
            <CardContent className="py-8 text-center">
              <h2 className="font-semibold">
                Unable to load availability
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                {error}
              </p>

              <Button
                className="mt-4"
                onClick={refresh}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Availability Records */}
        {!error && records.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <CalendarDays className="mb-4 size-12 text-muted-foreground" />

              <h2 className="text-lg font-semibold">
                No availability configured
              </h2>

              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Add your weekly working hours so patients can find available appointment times.
              </p>

              {!showForm && (
                <Button
                  className="mt-5"
                  onClick={() => {
                    setForm(emptyForm);
                    setEditingDay(null);
                    setShowForm(true);
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Add Availability
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedRecords.map((record) => (
              <Card key={record.dayOfWeek}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <CalendarDays className="size-6 text-primary" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {getDayName(record.dayOfWeek)}
                          </h3>

                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                            Active
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatTime(record.startTime)} -{" "}
                          {formatTime(record.endTime)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(record)}
                      >
                        <Edit3 className="mr-2 size-4" />
                        Edit
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() =>
                          handleDelete(record)
                        }
                        disabled={
                          deletingDay === record.dayOfWeek
                        }
                      >
                        {deletingDay === record.dayOfWeek ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 size-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
