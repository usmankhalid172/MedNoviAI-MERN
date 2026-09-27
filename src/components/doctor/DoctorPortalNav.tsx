import Link from "next/link";

export default function DoctorPortalNav() {
  return (
    <section
      aria-label="Doctor portal navigation"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <Link
        href="/doctor/profile"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
      >
        <p className="font-semibold text-slate-900">Doctor Profile</p>
        <p className="mt-1 text-xs text-slate-500">
          View and update your profile
        </p>
      </Link>

      <Link
        href="/doctor/availability"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
      >
        <p className="font-semibold text-slate-900">Availability</p>
        <p className="mt-1 text-xs text-slate-500">
          Manage your working hours and slots
        </p>
      </Link>

      <Link
        href="/doctor/appointments"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
      >
        <p className="font-semibold text-slate-900">Appointments</p>
        <p className="mt-1 text-xs text-slate-500">
          View and manage appointments
        </p>
      </Link>
    </section>
  );
}