export default function DoctorSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-1/3" />
        </div>
      </div>
      <div className="flex gap-2 mt-6">
        <div className="flex-1 h-9 bg-slate-200 rounded-xl" />
        <div className="flex-1 h-9 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}