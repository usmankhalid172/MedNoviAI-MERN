"use client";

import { useState } from "react";
import { cancelAppointment } from "@/lib/appointmentsClient";

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
    setLoading(true);
    setError(null);

    // Goes through /api/appointments. The previous direct `update` here could
    // not distinguish "cancelled" from "RLS returned zero rows", so it reported
    // success even when nothing was written. The API checks the affected row.
    const result = await cancelAppointment(appointmentId);

    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onSuccess();
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
