import { Appointment } from "@/types/appointment";
import { CalendarDays, Clock3, FileText } from "lucide-react";

interface Props {
  appointment: Appointment;
  onCancel: () => void;
  onReschedule: () => void;
  showActions?: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-800",
};

export default function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
  showActions = false,
}: Props) {
  const doctorName = appointment.doctor?.full_name || "Doctor";
  const specialty = appointment.doctor?.specialty || "General";

  const formattedDate = new Date(appointment.appointment_date).toLocaleDateString(
    "en-US",
    { weekday: "short", year: "numeric", month: "short", day: "numeric" }
  );

  const time = appointment.appointment_time?.slice(0, 5);
  const initials = doctorName
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-base font-bold text-blue-700">
            {initials || "DR"}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900">{doctorName}</h3>
            <p className="mt-0.5 text-xs font-semibold text-blue-600">{specialty}</p>
          </div>
        </div>

        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
            statusColors[appointment.status] || "bg-gray-100 text-gray-800"
          }`}
        >
          {appointment.status}
        </span>
      </div>

      <div className="mt-5 grid gap-2 text-sm text-slate-600">
        <p className="flex items-center gap-2"><CalendarDays className="size-4 text-blue-500" /> {formattedDate}</p>
        <p className="flex items-center gap-2"><Clock3 className="size-4 text-blue-500" /> {time}</p>
        {appointment.notes && <p className="flex items-start gap-2"><FileText className="mt-0.5 size-4 shrink-0 text-blue-500" /> <span>{appointment.notes}</span></p>}
      </div>

      {showActions && appointment.status !== "cancelled" && (
        <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4">
          <button
            onClick={onReschedule}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Reschedule
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
