"use client";

import { Loader2, Save, X } from "lucide-react";

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
}

interface AvailabilityFormProps {
  form: AvailabilityFormValues;
  editing: boolean;
  saving: boolean;
  days: { value: string; label: string }[];
  onChange: (
    field: keyof AvailabilityFormValues,
    value: string
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function AvailabilityForm({
  form,
  editing,
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
            {editing
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
        </div>

        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                {editing
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
