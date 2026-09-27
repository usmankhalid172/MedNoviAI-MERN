interface Props {
  tab: "upcoming" | "past";
}

export default function EmptyAppointments({ tab }: Props) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
      <div className="text-4xl mb-3">📅</div>
      <h3 className="text-lg font-semibold text-slate-900">
        No {tab} appointments
      </h3>
      <p className="text-sm text-slate-500 mt-1">
        {tab === "upcoming"
          ? "You don’t have any upcoming appointments."
          : "You don’t have any past appointments yet."}
      </p>
    </div>
  );
}