"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Edit3,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
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

interface AvailabilityRecord {
  id: string;
  doctorId: string;
  doctorName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

interface AvailabilityForm {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
}

const DAYS = [
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

const emptyForm: AvailabilityForm = {
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "13:00",
  slotDurationMinutes: "30",
  isActive: true,
  effectiveFrom: "",
  effectiveTo: "",
};

function getDayName(day: number) {
  return (
    DAYS.find((item) => Number(item.value) === day)?.label ||
    "Unknown"
  );
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

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.response?.data?.errors?.[0] ||
    fallback
  );
}

function extractAvailability(data: any): AvailabilityRecord[] {
  const result =
    data?.data ??
    data?.availability ??
    data ??
    [];

  return Array.isArray(result) ? result : [];
}

export default function DoctorAvailabilityPage() {
  const { user } = useAuth();

  const [records, setRecords] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<AvailabilityForm>(emptyForm);

  const loadAvailability = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(
        `/availability/doctor/${user.id}`
      );

      const availability = extractAvailability(response.data);

      setRecords(availability);
    } catch (err) {
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [user?.id]);

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
      const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;

      if (dayA !== dayB) {
        return dayA - dayB;
      }

      return a.startTime.localeCompare(b.startTime);
    });
  }, [records]);

  const activeCount = records.filter(
    (record) => record.isActive
  ).length;

  const inactiveCount = records.length - activeCount;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const validateForm = () => {
    if (!form.startTime || !form.endTime) {
      toast.error("Start time and end time are required.");
      return false;
    }

    if (form.startTime >= form.endTime) {
      toast.error("End time must be after start time.");
      return false;
    }

    const duration = Number(form.slotDurationMinutes);

    if (
      !Number.isInteger(duration) ||
      duration < 5 ||
      duration > 240
    ) {
      toast.error(
        "Slot duration must be between 5 and 240 minutes."
      );
      return false;
    }

    if (
      form.effectiveFrom &&
      form.effectiveTo &&
      form.effectiveFrom > form.effectiveTo
    ) {
      toast.error(
        "Effective To must be after Effective From."
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!user?.id) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    const duration = Number(form.slotDurationMinutes);

    const payload = {
      dayOfWeek: Number(form.dayOfWeek),
      startTime: toTimeOnlyValue(form.startTime),
      endTime: toTimeOnlyValue(form.endTime),
      slotDurationMinutes: duration,
      isActive: form.isActive,
      effectiveFrom: form.effectiveFrom || null,
      effectiveTo: form.effectiveTo || null,
    };

    try {
      setSaving(true);

      if (editingId) {
        await api.put(
          `/availability/${editingId}`,
          payload
        );

        toast.success(
          "Availability updated successfully."
        );
      } else {
        await api.post("/availability", {
          doctorId: user.id,
          ...payload,
        });

        toast.success(
          "Availability created successfully."
        );
      }

      resetForm();
      await loadAvailability();
    } catch (err) {
      console.error(
        "Failed to save availability:",
        err
      );

      toast.error(
        getErrorMessage(
          err,
          "Failed to save availability."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: AvailabilityRecord) => {
    setEditingId(record.id);

    setForm({
      dayOfWeek: String(record.dayOfWeek),
      startTime: toInputTime(record.startTime),
      endTime: toInputTime(record.endTime),
      slotDurationMinutes: String(
        record.slotDurationMinutes
      ),
      isActive: record.isActive,
      effectiveFrom: record.effectiveFrom
        ? record.effectiveFrom.slice(0, 10)
        : "",
      effectiveTo: record.effectiveTo
        ? record.effectiveTo.slice(0, 10)
        : "",
    });

    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this availability?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);

      await api.delete(`/availability/${id}`);

      setRecords((current) =>
        current.filter((record) => record.id !== id)
      );

      toast.success(
        "Availability deleted successfully."
      );

      if (editingId === id) {
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
      setDeletingId(null);
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
                setEditingId(null);
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
                <Clock3 className="size-5 text-green-600" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Active
                </p>

                <p className="text-2xl font-bold">
                  {activeCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 items-center justify-center rounded-lg bg-muted">
                <CalendarDays className="size-5 text-muted-foreground" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Inactive
                </p>

                <p className="text-2xl font-bold">
                  {inactiveCount}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingId
                    ? "Edit Availability"
                    : "Add Availability"}
                </CardTitle>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetForm}
                  disabled={saving}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Day */}
                <div className="space-y-2">
                  <label
                    htmlFor="dayOfWeek"
                    className="text-sm font-medium"
                  >
                    Day
                  </label>

                  <select
                    id="dayOfWeek"
                    value={form.dayOfWeek}
                    disabled={saving}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        dayOfWeek: e.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {DAYS.map((day) => (
                      <option
                        key={day.value}
                        value={day.value}
                      >
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label
                    htmlFor="slotDurationMinutes"
                    className="text-sm font-medium"
                  >
                    Slot Duration (minutes)
                  </label>

                  <Input
                    id="slotDurationMinutes"
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    value={form.slotDurationMinutes}
                    disabled={saving}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        slotDurationMinutes:
                          e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Start Time */}
                <div className="space-y-2">
                  <label
                    htmlFor="startTime"
                    className="text-sm font-medium"
                  >
                    Start Time
                  </label>

                  <Input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    disabled={saving}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <label
                    htmlFor="endTime"
                    className="text-sm font-medium"
                  >
                    End Time
                  </label>

                  <Input
                    id="endTime"
                    type="time"
                    value={form.endTime}
                    disabled={saving}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Effective From */}
                <div className="space-y-2">
                  <label
                    htmlFor="effectiveFrom"
                    className="text-sm font-medium"
                  >
                    Effective From
                  </label>

                  <Input
                    id="effectiveFrom"
                    type="date"
                    value={form.effectiveFrom}
                    disabled={saving}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        effectiveFrom: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Effective To */}
                <div className="space-y-2">
                  <label
                    htmlFor="effectiveTo"
                    className="text-sm font-medium"
                  >
                    Effective To
                  </label>

                  <Input
                    id="effectiveTo"
                    type="date"
                    value={form.effectiveTo}
                    disabled={saving}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        effectiveTo: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* Active */}
              <label className="flex items-center gap-3 rounded-lg border p-4">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  disabled={saving}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      isActive: e.target.checked,
                    }))
                  }
                  className="size-4"
                />

                <div>
                  <p className="text-sm font-medium">
                    Availability is active
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Active availability can be used for appointment booking.
                  </p>
                </div>
              </label>

              {/* Actions */}
              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={resetForm}
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
                      {editingId
                        ? "Update Availability"
                        : "Create Availability"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
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
                onClick={loadAvailability}
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
                    setEditingId(null);
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
              <Card key={record.id}>
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

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              record.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {record.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatTime(record.startTime)} -{" "}
                          {formatTime(record.endTime)}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {record.slotDurationMinutes} minute appointments
                        </p>

                        {(record.effectiveFrom ||
                          record.effectiveTo) && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Effective:{" "}
                            {record.effectiveFrom
                              ? record.effectiveFrom.slice(0, 10)
                              : "No start date"}{" "}
                            →{" "}
                            {record.effectiveTo
                              ? record.effectiveTo.slice(0, 10)
                              : "No end date"}
                          </p>
                        )}
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
                          handleDelete(record.id)
                        }
                        disabled={
                          deletingId === record.id
                        }
                      >
                        {deletingId === record.id ? (
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