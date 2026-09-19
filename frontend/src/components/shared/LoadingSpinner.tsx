import React from "react";

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="w-full space-y-3 p-6" aria-label="Loading content">
      <div className="h-4 w-2/3 animate-pulse rounded-md bg-slate-200" />
      <div className="h-4 w-full animate-pulse rounded-md bg-slate-200" />
      <div className="h-4 w-5/6 animate-pulse rounded-md bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
};

export default LoadingSpinner;