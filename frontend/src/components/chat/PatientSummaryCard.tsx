"use client";

import React from "react";
import { User, Activity, Clock, ShieldAlert, Stethoscope } from "lucide-react";

export interface IntakeData {
  age: string;
  gender: string;
  symptoms: string;
  duration: string;
  severity: "Mild" | "Moderate" | "Severe";
  specialty: string;
}

interface PatientSummaryCardProps {
  intake: IntakeData;
  timestamp?: string;
  compact?: boolean;
}

export const PatientSummaryCard: React.FC<PatientSummaryCardProps> = ({
  intake,
  timestamp,
  compact = false,
}) => {
  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "severe":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "moderate":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
  };

  return (
    <div className={`rounded-xl border bg-[#173b68]/80 p-4 text-slate-100 border-blue-800/60 shadow-inner ${compact ? "max-w-md" : "w-full"}`}>
      <div className="flex items-center justify-between border-b border-blue-900/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Patient Intake Summary</h4>
            <p className="text-[10px] text-blue-200/70">Clinical Triage Report</p>
          </div>
        </div>
        {timestamp && <span className="text-[10px] text-slate-400">{timestamp}</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-200 bg-[#0b1727] p-2 rounded-lg border border-slate-800">
          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{intake.gender}, {intake.age} yrs</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-200 bg-[#0b1727] p-2 rounded-lg border border-slate-800">
          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{intake.duration}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-200 bg-[#0b1727] p-2 rounded-lg border border-slate-800">
          <Stethoscope className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{intake.specialty || "General Physician"}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b1727] p-2 rounded-lg border border-slate-800">
          <ShieldAlert className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getSeverityBadge(intake.severity)}`}>
            {intake.severity}
          </span>
        </div>
      </div>

      <div className="mt-2.5 rounded-lg bg-[#0b1727] p-2.5 text-xs text-slate-200 border border-slate-800">
        <span className="font-medium text-slate-400 block text-[10px] uppercase">Primary Symptoms:</span>
        "{intake.symptoms}"
      </div>
    </div>
  );
};