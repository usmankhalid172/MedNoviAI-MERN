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

/**
 * Central icon registry for the app.
 *
 * Icon sizes are standardized in 3 steps to keep UI consistent:
 *  - xs: size-3.5 (14px)  → inline/badge icons
 *  - sm: size-4   (16px)  → most UI icons, button icons
 *  - md: size-5   (20px)  → headings/section icons
 *  - lg: size-6+          → standalone feature icons
 *
 * Usage:
 *   <AppIcon name="calendar" size="sm" className="text-blue-600" />
 * or pass any Lucide icon directly: <IconCalendar className="size-4" />
 */

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
