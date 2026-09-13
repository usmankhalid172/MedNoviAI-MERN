import React from 'react';
import { Bot } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] flex items-center justify-center shrink-0 border border-[#7C3AED]/20">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-bounce"></span>
      </div>
    </div>
  );
}