"use client";

import React, { useState } from "react";
import { Send, Menu, Sparkles, Plus, AlertCircle } from "lucide-react";
import { useAiChat } from "../../hooks/useAiChat";
import { PatientSummaryCard, IntakeData } from "../../components/chat/PatientSummaryCard";
import { ChatResponseCard } from "../../components/chat/ChatResponseCard";
import { ChatSidebar } from "../../components/chat/ChatSidebar";

export default function ChatPage() {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    validationError,
    messagesEndRef,
    createNewSession,
    handleSendMessage,
    clearAllHistory,
  } = useAiChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);

  const [age, setAge] = useState("25");
  const [gender, setGender] = useState("Male");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("2 days");
  const [severity, setSeverity] = useState<"Mild" | "Moderate" | "Severe">("Moderate");
  const [specialty, setSpecialty] = useState("General Physician");

  const submitIntake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    const intake: IntakeData = { age, gender, symptoms, duration, severity, specialty };
    const summaryText = `Submitted Patient Intake Summary: ${symptoms} (${severity} severity, ${duration})`;

    handleSendMessage(summaryText, intake);
    setIsIntakeModalOpen(false);
    setSymptoms("");
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      <ChatSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setIsSidebarOpen(false);
        }}
        onNewChat={createNewSession}
        onClearAll={clearAllHistory}
      />

      <div className="flex flex-1 flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-base font-bold text-white">
                <Sparkles className="h-4 w-4 text-emerald-400" /> MedNovi AI Assistant
              </h1>
              <p className="text-xs text-slate-400">Day 21 — Reusable Clinical AI Chat Experience</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={createNewSession}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> New Session
            </button>
            <button
              onClick={() => setIsIntakeModalOpen(true)}
              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer"
            >
              Create Intake Summary
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-4 shadow-md ${
                    msg.sender === "user"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-none"
                  }`}
                >
                  {msg.intakeSummary && (
                    <div className="mb-3">
                      <PatientSummaryCard intake={msg.intakeSummary} compact />
                    </div>
                  )}

                  {msg.sender === "ai" ? (
                    <ChatResponseCard
                      content={msg.content}
                      suggestedPrompts={msg.suggestedPrompts}
                      onPromptClick={(prompt) => {
                        if (prompt === "Create Intake Summary") {
                          setIsIntakeModalOpen(true);
                        } else {
                          handleSendMessage(prompt);
                        }
                      }}
                    />
                  ) : (
                    <p className="text-xs leading-relaxed whitespace-pre-line">{msg.content}</p>
                  )}

                  <span className="mt-2 block text-right text-[10px] text-slate-400 opacity-70">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800 w-fit">
                <div className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                MedNovi AI is analyzing clinical context...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="border-t border-slate-800 bg-slate-900/90 p-4">
          <div className="mx-auto max-w-3xl">
            {validationError && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" /> {validationError}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Type your medical query or symptoms..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            </form>
          </div>
        </footer>
      </div>

      {isIntakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Patient Intake Form</h3>
            <form onSubmit={submitIntake} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Symptoms Description</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. High fever, dry cough, severe fatigue"
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  >
                    <option>Mild</option>
                    <option>Moderate</option>
                    <option>Severe</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Preferred Specialty</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                >
                  <option>General Physician</option>
                  <option>Pulmonology</option>
                  <option>Cardiology</option>
                  <option>Pediatrics</option>
                  <option>Neurology</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsIntakeModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                >
                  Save & Send Summary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}