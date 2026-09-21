'use client';

import React, { useState } from 'react';
import { Activity, User, Calendar, Stethoscope, AlertCircle } from 'lucide-react';

export interface PatientContextData {
  name: string;
  age: string;
  gender: string;
  symptoms: string;
  duration: string;
  existingConditions: string;
}

interface IntakeModalProps {
  onSubmit: (data: PatientContextData) => void;
}

export default function IntakeModal({ onSubmit }: IntakeModalProps) {
  const [formData, setFormData] = useState<PatientContextData>({
    name: '',
    age: '',
    gender: 'Male',
    symptoms: '',
    duration: '',
    existingConditions: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symptoms.trim() || !formData.age.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 border border-[#7C3AED] text-[#7C3AED] flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Patient Clinical Intake</h2>
            <p className="text-xs text-slate-400">Provide details to assist MedNoviAI triage.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium mb-1 block">Age</label>
              <input
                type="number"
                required
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 28"
                className="w-full bg-slate-800 text-slate-100 rounded-lg p-2.5 border border-slate-700 focus:border-[#7C3AED] outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium mb-1 block">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full bg-slate-800 text-slate-100 rounded-lg p-2.5 border border-slate-700 focus:border-[#7C3AED] outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium mb-1 block">Primary Symptoms</label>
            <input
              type="text"
              required
              value={formData.symptoms}
              onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
              placeholder="e.g. Severe headache, persistent cough"
              className="w-full bg-slate-800 text-slate-100 rounded-lg p-2.5 border border-slate-700 focus:border-[#7C3AED] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium mb-1 block">Duration</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 3 days"
                className="w-full bg-slate-800 text-slate-100 rounded-lg p-2.5 border border-slate-700 focus:border-[#7C3AED] outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium mb-1 block">Existing Conditions</label>
              <input
                type="text"
                value={formData.existingConditions}
                onChange={(e) => setFormData({ ...formData, existingConditions: e.target.value })}
                placeholder="e.g. Asthma, Hypertension"
                className="w-full bg-slate-800 text-slate-100 rounded-lg p-2.5 border border-slate-700 focus:border-[#7C3AED] outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-purple-900/30 text-sm mt-2"
          >
            Start Assistant Consultation
          </button>
        </form>
      </div>
    </div>
  );
}