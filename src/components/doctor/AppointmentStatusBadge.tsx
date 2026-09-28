type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "pending"
  | string;

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

export default function AppointmentStatusBadge({
  status,
}: AppointmentStatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() || "pending";

  const statusClasses: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-700 border border-blue-200",
    confirmed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    completed: "bg-slate-100 text-slate-700 border border-slate-200",
    cancelled: "bg-red-50 text-red-700 border border-red-200",
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
  };

  const className =
    statusClasses[normalizedStatus] ||
    "bg-slate-100 text-slate-700 border border-slate-200";

  const label =
    normalizedStatus.charAt(0).toUpperCase() +
    normalizedStatus.slice(1);

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}