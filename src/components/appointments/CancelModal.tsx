"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  appointmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CancelModal({
  appointmentId,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!supabase) {
      setError("Supabase is not configured");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (updateError) throw updateError;
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel appointment";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Cancel Appointment?
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Are you sure you want to cancel this appointment? This action cannot
          be undone.
        </p>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200"
          >
            Keep Appointment
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
          >
            {loading ? "Cancelling..." : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}