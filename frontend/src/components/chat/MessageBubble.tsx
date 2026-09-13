import React from 'react';
import { Bot, User } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2.5 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] flex items-center justify-center shrink-0 border border-[#7C3AED]/30">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div
        className={`max-w-[80%] sm:max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
          isUser
            ? 'bg-[#7C3AED] text-white rounded-br-none font-medium'
            : 'bg-slate-800 text-slate-100 border border-slate-700/70 rounded-bl-none'
        }`}
      >
        <p>{message.content}</p>
        {message.timestamp && (
          <span
            className={`block text-[10px] mt-1.5 font-normal ${
              isUser ? 'text-purple-200 text-right' : 'text-slate-400'
            }`}
          >
            {message.timestamp}
          </span>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center shrink-0 border border-slate-600">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}