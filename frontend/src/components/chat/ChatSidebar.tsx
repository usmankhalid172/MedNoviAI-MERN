"use client";

import React from "react";
import { Plus, MessageSquare, Trash2, X } from "lucide-react";

export interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSessionItem[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onClearAll: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs lg:static lg:bg-transparent">
      <div className="flex h-full w-72 flex-col border-r border-slate-800 bg-[#0f243d] p-4 text-white">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-300">Chat Sessions</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={onNewChat}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-blue-500 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Start New Conversation
        </button>

        <div className="mt-4 flex-1 overflow-y-auto space-y-1.5 pr-1">
          {sessions.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-8">No previous conversations</p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition-all cursor-pointer ${
                  session.id === activeSessionId
                    ? "bg-[#173b68] text-blue-200 font-semibold border border-blue-500/40"
                    : "text-slate-400 hover:bg-[#173b68]/40 hover:text-slate-200"
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
            ))
          )}
        </div>

        {sessions.length > 0 && (
          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={onClearAll}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs text-rose-400 hover:bg-rose-500/20 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};