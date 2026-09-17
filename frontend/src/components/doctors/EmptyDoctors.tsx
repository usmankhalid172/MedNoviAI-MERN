"use client";

import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyDoctorsProps {
  onClearFilters: () => void;
}

export default function EmptyDoctors({ onClearFilters }: EmptyDoctorsProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <SearchX className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">
        No doctors found
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">
        We couldn&apos;t find any doctors matching your search or filter.
        Try clearing the filters or using different keywords.
      </p>
      <Button
        onClick={onClearFilters}
        variant="outline"
        className="rounded-xl"
      >
        Clear Filters
      </Button>
    </div>
  );
}