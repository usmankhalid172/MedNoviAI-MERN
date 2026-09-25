'use client';

import React from 'react';
import { Bot, User, AlertTriangle, ShieldAlert } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isEmergency?: boolean;
  recommendedSpecialty?: string;
  isError?: boolean;
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 my-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          isUser ? 'bg-purple-900 text-purple-200' : 'bg-[#7C3AED] text-white'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className={`max-w-[80%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Emergency Alert Banner */}
        {message.isEmergency && (
          <div className="bg-red-950/90 border border-red-700 text-red-200 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold animate-pulse">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span>CRITICAL: Please call emergency services (911/112) immediately!</span>
          </div>
        )}

        {/* Message Card */}
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
            isUser
              ? 'bg-[#7C3AED] text-white rounded-tr-none'
              : message.isError
              ? 'bg-rose-950/50 border border-rose-800 text-rose-200 rounded-tl-none'
              : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
          }`}
        >
          <p>{message.content}</p>

          {/* Highlighted Specialty Recommendation */}
          {message.recommendedSpecialty && (
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Recommended Specialty:</span>
              <span className="bg-purple-950 text-purple-300 border border-purple-700 px-2 py-0.5 rounded-md font-bold text-[11px]">
                {message.recommendedSpecialty}
              </span>
            </div>
          )}

          {/* SQA Mandatory Disclaimer */}
          {!isUser && !message.isError && (
            <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Disclaimer: AI Triage Assistant — Not a certified medical diagnosis. Consult a doctor.
              </span>
            </div>
          )}
        </div>

        <span className="text-[10px] text-slate-500 block px-1">{message.timestamp}</span>
      </div>
    </div>
  );
}