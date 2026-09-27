"use client";

import {
  Loader2,
  Save,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface AvailabilityFormValues {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
}

interface AvailabilityFormProps {
  form: AvailabilityFormValues;
  editingId: string | null;
  saving: boolean;
  days: { value: string; label: string }[];
  onChange: (
    field: keyof AvailabilityFormValues,
    value: string | boolean
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function AvailabilityForm({
  form,
  editingId,
  saving,
  days,
  onChange,
  onSave,
  onCancel,
}: AvailabilityFormProps) {
  return (
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
            onClick={onCancel}
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
              onChange={(event) =>
                onChange("dayOfWeek", event.target.value)
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {days.map((day) => (
                <option
                  key={day.value}
                  value={day.value}
                >
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          {/* Slot Duration */}
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
              onChange={(event) =>
                onChange(
                  "slotDurationMinutes",
                  event.target.value
                )
              }
            />

            <p className="text-xs text-muted-foreground">
              Choose between 5 and 240 minutes.
            </p>
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
              onChange={(event) =>
                onChange("startTime", event.target.value)
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
              onChange={(event) =>
                onChange("endTime", event.target.value)
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
              onChange={(event) =>
                onChange(
                  "effectiveFrom",
                  event.target.value
                )
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
              onChange={(event) =>
                onChange(
                  "effectiveTo",
                  event.target.value
                )
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
            onChange={(event) =>
              onChange(
                "isActive",
                event.target.checked
              )
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
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            onClick={onSave}
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
  );
}