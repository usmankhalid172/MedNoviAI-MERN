'use client';

import React, { useState } from 'react';
import { SendHorizontal } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800/80 sticky bottom-0 z-10 w-full shrink-0">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask MedNoviAI about health symptoms..."
          disabled={disabled}
          className="flex-1 min-w-0 bg-slate-800/90 text-slate-100 placeholder-slate-400 text-xs sm:text-sm rounded-xl px-3.5 sm:px-4 py-3 border border-slate-700/80 focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white p-3 sm:p-3.5 rounded-xl transition-all duration-200 shrink-0 shadow-lg shadow-purple-900/30 flex items-center justify-center"
          aria-label="Send message"
        >
          <SendHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </form>
    </div>
  );
}