interface IntakeSummaryProps {
  chiefComplaint?: string;
  symptoms?: string;
  duration?: string;
  onset?: string;
  suggestedSpecialty?: string;
  painLevel?: string | number;
  temperature?: string | number;
  bloodPressure?: string;
  heartRate?: string | number;
  aiSummary?: string;
  additionalNotes?: string;
  submittedAt?: string;
}

export default function IntakeSummary({
  chiefComplaint,
  symptoms,
  duration,
  onset,
  suggestedSpecialty,
  painLevel,
  temperature,
  bloodPressure,
  heartRate,
  aiSummary,
  additionalNotes,
  submittedAt,
}: IntakeSummaryProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">
          Patient Intake Summary
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Structured summary of the patient&apos;s submitted intake information.
        </p>
      </div>

      <div className="space-y-6 p-6">
        <SummaryGroup title="Main Complaint">
          <SummaryItem
            label="Chief Complaint"
            value={chiefComplaint}
          />

          <SummaryItem
            label="Symptoms"
            value={symptoms}
          />

          <SummaryItem
            label="Duration"
            value={duration}
          />

          <SummaryItem
            label="Onset"
            value={onset}
          />
        </SummaryGroup>

        <SummaryGroup title="Clinical Information">
          <SummaryItem
            label="Suggested Specialty"
            value={suggestedSpecialty}
          />

          <SummaryItem
            label="Pain Level"
            value={painLevel}
          />

          <SummaryItem
            label="Temperature"
            value={temperature}
          />

          <SummaryItem
            label="Blood Pressure"
            value={bloodPressure}
          />

          <SummaryItem
            label="Heart Rate"
            value={heartRate}
          />
        </SummaryGroup>

        <SummaryGroup title="AI Assessment">
          <SummaryItem
            label="AI Summary"
            value={aiSummary}
            fullWidth
          />
        </SummaryGroup>

        <SummaryGroup title="Additional Information">
          <SummaryItem
            label="Additional Notes"
            value={additionalNotes}
            fullWidth
          />

          <SummaryItem
            label="Submitted At"
            value={
              submittedAt
                ? new Date(submittedAt).toLocaleString()
                : undefined
            }
          />
        </SummaryGroup>
      </div>
    </section>
  );
}

function SummaryGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold text-slate-800">
        {title}
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value?: string | number;
  fullWidth?: boolean;
}) {
  const hasValue =
    value !== undefined &&
    value !== null &&
    String(value).trim() !== "";

  return (
    <div
      className={`rounded-xl bg-slate-50 p-4 ${
        fullWidth ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-900">
        {hasValue ? value : "Not available"}
      </p>
    </div>
  );
}