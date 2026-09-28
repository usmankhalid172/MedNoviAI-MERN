interface PatientInfoSectionProps {
  name?: string;
  age?: number | string;
  gender?: string;
  phone?: string;
  email?: string;
  medicalRecordNumber?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
}

export default function PatientInfoSection({
  name,
  age,
  gender,
  phone,
  email,
  medicalRecordNumber,
  bloodGroup,
  allergies,
  chronicConditions,
  currentMedications,
}: PatientInfoSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">
          Patient Information
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Patient profile and medical information.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <InfoItem label="Name" value={name} />
        <InfoItem label="Age" value={age} />
        <InfoItem label="Gender" value={gender} />
        <InfoItem label="Phone" value={phone} />
        <InfoItem label="Email" value={email} />
        <InfoItem
          label="Medical Record Number"
          value={medicalRecordNumber}
        />
        <InfoItem label="Blood Group" value={bloodGroup} />
        <InfoItem label="Allergies" value={allergies} />
        <InfoItem
          label="Chronic Conditions"
          value={chronicConditions}
        />
        <InfoItem
          label="Current Medications"
          value={currentMedications}
        />
      </div>
    </section>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-900">
        {value !== undefined && value !== null && String(value).trim()
          ? value
          : "Not available"}
      </p>
    </div>
  );
}