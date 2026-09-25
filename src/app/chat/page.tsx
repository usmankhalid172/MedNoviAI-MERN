'use client';

import React, { useState } from 'react';
import { sendChatMessage, submitIntakeSummary, IntakeSummaryData } from '@/services/aiService';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I am MedNovi AI Assistant. Describe your symptoms or complete the intake form below to share with a physician.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [intakeForm, setIntakeForm] = useState<IntakeSummaryData>({
    patientAge: 25,
    patientGender: 'Male',
    symptoms: '',
    duration: '',
    severity: 'Moderate',
    recommendedSpecialty: 'General Physician',
    aiSummary: '',
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    const history = messages.map((m) => ({ role: m.sender, content: m.text }));
    const res = await sendChatMessage(inputMessage, history);

    setIsTyping(false);
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: res.reply || 'Thank you. Please complete the medical intake summary form.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, aiMsg]);
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const summaryText = `Patient is a ${intakeForm.patientAge}-year-old ${intakeForm.patientGender} reporting ${intakeForm.symptoms} for ${intakeForm.duration}. Severity: ${intakeForm.severity}. Recommended Specialty: ${intakeForm.recommendedSpecialty}.`;
    
    const payload = { ...intakeForm, aiSummary: summaryText };
    await submitIntakeSummary(payload);

    setShowModal(false);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: `Intake Summary submitted successfully for doctor review: "${summaryText}"`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            AI
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">MedNoviAI Assistant</h1>
            <p className="text-xs text-slate-400">Task 19 — AI Chat & Patient Intake</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          Create Intake Summary
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-md p-4 rounded-2xl text-sm ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
              }`}
            >
              <p>{msg.text}</p>
              <span className="text-[10px] text-slate-400 block text-right mt-1">{msg.time}</span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 text-xs px-4 py-2 rounded-2xl animate-pulse">
              MedNovi AI is typing...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your medical query or symptoms..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition text-sm"
          >
            Send
          </button>
        </div>
      </form>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">Patient Intake Summary</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleIntakeSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Age</label>
                  <input
                    type="number"
                    value={intakeForm.patientAge}
                    onChange={(e) => setIntakeForm({ ...intakeForm, patientAge: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Gender</label>
                  <select
                    value={intakeForm.patientGender}
                    onChange={(e) => setIntakeForm({ ...intakeForm, patientGender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Symptoms Description</label>
                <textarea
                  value={intakeForm.symptoms}
                  onChange={(e) => setIntakeForm({ ...intakeForm, symptoms: e.target.value })}
                  placeholder="e.g. Moderate fever, persistent dry cough, headache"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white h-20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Duration</label>
                  <input
                    type="text"
                    value={intakeForm.duration}
                    onChange={(e) => setIntakeForm({ ...intakeForm, duration: e.target.value })}
                    placeholder="e.g. 3 days"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Severity</label>
                  <select
                    value={intakeForm.severity}
                    onChange={(e) => setIntakeForm({ ...intakeForm, severity: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Recommended Specialty</label>
                <input
                  type="text"
                  value={intakeForm.recommendedSpecialty}
                  onChange={(e) => setIntakeForm({ ...intakeForm, recommendedSpecialty: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg"
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