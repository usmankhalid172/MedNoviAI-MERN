"use client";

import {
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Clock,
  Stethoscope,
  X,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";

export type AppIconName =
  | "calendar"
  | "clock"
  | "check"
  | "close"
  | "clipboard"
  | "stethoscope";

export type AppIconSize = "xs" | "sm" | "md" | "lg";

const ICONS: Record<AppIconName, ComponentType<LucideProps>> = {
  calendar: CalendarDays,
  clock: Clock,
  check: CircleCheck,
  close: X,
  clipboard: ClipboardList,
  stethoscope: Stethoscope,
};

const SIZE_CLASSES: Record<AppIconSize, string> = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

export function AppIcon({
  name,
  size = "sm",
  className = "",
}: {
  name: AppIconName;
  size?: AppIconSize;
  className?: string;
}) {
  const IconComponent = ICONS[name];
  if (!IconComponent) return null;
  return (
    <IconComponent
      aria-hidden="true"
      focusable="false"
      strokeWidth={2}
      className={`${SIZE_CLASSES[size]} shrink-0 ${className}`.trim()}
    />
  );
}

export { ClipboardList, CalendarDays, Clock, CircleCheck, X };