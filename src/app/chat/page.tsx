'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bot, RefreshCw, AlertTriangle, Send, CheckCircle2, 
  ArrowLeft, FileText, Sparkles, HelpCircle, Stethoscope, X, Menu, User
} from 'lucide-react';

export interface PatientContext {
  name: string;
  age: string;
  gender: string;
  symptoms: string;
  duration: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  recommendedSpecialty?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system_intake';
  content: string;
  timestamp: string;
  isEmergency?: boolean;
  recommendedSpecialty?: string;
  suggestedQuestions?: string[];
  isError?: boolean;
}

const STORAGE_KEY_MESSAGES = 'mednovi_chat_history_v2';
const STORAGE_KEY_INTAKE = 'mednovi_patient_intake_v2';

export default function AIChatPage() {
  const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastMessageSent, setLastMessageSent] = useState<string>('');
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Client-side hydration safety & state recovery from localStorage
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedIntake = localStorage.getItem(STORAGE_KEY_INTAKE);
      const savedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);

      if (savedIntake) {
        setPatientContext(JSON.parse(savedIntake));
      } else {
        setShowIntakeModal(true);
      }

      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([
          {
            id: 'init-1',
            role: 'assistant',
            content: 'Hello! I am MedNovi AI Assistant. Complete your intake details or describe your symptoms below to get personalized clinical triage guidance.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedQuestions: [
              'What should I do for a mild fever?',
              'When should I see a cardiologist?',
              'How can I manage tension headaches?'
            ]
          }
        ]);
      }
    } catch (e) {
      console.error('Failed to load chat state from storage', e);
    }
  }, []);

  // Save state changes to localStorage
  useEffect(() => {
    if (!isMounted) return;
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
    }
    if (patientContext) {
      localStorage.setItem(STORAGE_KEY_INTAKE, JSON.stringify(patientContext));
    }
  }, [messages, patientContext, isMounted]);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle Intake Modal Form Submission
  const handleIntakeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const context: PatientContext = {
      name: (formData.get('name') as string) || 'Patient',
      age: (formData.get('age') as string) || '25',
      gender: (formData.get('gender') as string) || 'Not specified',
      symptoms: (formData.get('symptoms') as string) || 'General query',
      duration: (formData.get('duration') as string) || '1-2 days',
      severity: (formData.get('severity') as 'Mild' | 'Moderate' | 'Severe') || 'Moderate',
      recommendedSpecialty: 'General Physician'
    };

    setPatientContext(context);
    setShowIntakeModal(false);

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const intakeBubble: ChatMessage = {
      id: `intake-${Date.now()}`,
      role: 'system_intake',
      content: `Patient Intake Registered: ${context.symptoms} (${context.severity} severity, duration: ${context.duration})`,
      timestamp: nowTime
    };

    const initialAck: ChatMessage = {
      id: `ai-init-${Date.now()}`,
      role: 'assistant',
      content: `Thank you, ${context.name}. Your intake record for "${context.symptoms}" is registered. How can I assist you with your treatment or specialist selection today?`,
      timestamp: nowTime,
      suggestedQuestions: [
        `What remedies help with ${context.symptoms}?`,
        `Which doctor specialty should I consult?`,
        `Are there red-flag symptoms to watch out for?`
      ]
    };

    setMessages((prev) => [...prev, intakeBubble, initialAck]);
  };

  // Input Validation (Catch short/unclear inputs)
  const validateInput = (text: string): boolean => {
    setInputError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setInputError('Please enter a description of your symptoms or question.');
      return false;
    }
    if (trimmed.length < 4) {
      setInputError('Please provide a bit more detail about your condition (e.g., "I have a fever since yesterday").');
      return false;
    }
    return true;
  };

  // Main Send Message Function (with Timeout & Multi-Turn History)
  const sendMessage = async (queryText: string) => {
    if (!validateInput(queryText)) return;

    setLastMessageSent(queryText);
    setInputQuery('');
    setApiError(null);

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: nowTime
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Setup 12-second Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const historyPayload = updatedMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: queryText,
          patientContext: patientContext,
          history: historyPayload
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error (${response.status}): Unable to process response.`);
      }

      const data = await response.json();
      const replyContent = data.reply || data.response || data.message || 'Analysis complete. Please consult a qualified practitioner.';

      const isEmergency = /chest pain|difficulty breathing|unconscious|severe bleeding|stroke|high fever/i.test(
        queryText + ' ' + replyContent
      );

      const aiResponse: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEmergency,
        recommendedSpecialty: data.recommendedSpecialty || (isEmergency ? 'Emergency Care' : 'General Physician'),
        suggestedQuestions: [
          'What home remedies or rest care can I follow?',
          'How can I book a doctor appointment?',
          'What symptoms require urgent hospital evaluation?'
        ]
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      const errorMessage = isTimeout
        ? 'Request timed out after 12 seconds. Please check your backend connection and try again.'
        : err.message || 'Failed to reach AI service.';

      setApiError(errorMessage);

      const errorBubble: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };

      setMessages((prev) => [...prev, errorBubble]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear active chat history and reset intake?')) {
      setMessages([]);
      setPatientContext(null);
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
      localStorage.removeItem(STORAGE_KEY_INTAKE);
      setShowIntakeModal(true);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-screen bg-[#0b1727] text-slate-100 font-sans overflow-hidden">
      {/* Header Bar matching MedNovi Navy Theme */}
      <header className="bg-[#173b68] border-b border-blue-900/40 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-md z-20">
        <div className="flex items-center gap-3">
          <Link 
            href="/patient/dashboard" 
            className="p-2 rounded-lg bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 transition cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
              MedNovi AI Assistant
              <span className="hidden sm:inline-block text-[10px] bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30">
                Clinical Triage
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-blue-200/70">Symptom Evaluation & Guidance</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Summary Toggle Button */}
          <button
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="lg:hidden flex items-center gap-1.5 bg-blue-600/70 hover:bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-lg border border-blue-400/30 transition cursor-pointer"
            title="Toggle Patient Summary"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Summary</span>
          </button>

          <button
            onClick={() => setShowIntakeModal(true)}
            className="flex items-center gap-1.5 bg-blue-600/80 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg border border-blue-400/30 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{patientContext ? 'Edit Intake' : 'Fill Intake'}</span>
          </button>
          
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg border border-red-400/30 transition cursor-pointer"
            title="Reset Chat"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Patient Summary Panel (Desktop Sidebar & Mobile Slide-over Drawer) */}
        <aside className={`
          absolute lg:relative inset-y-0 left-0 z-30 w-80 bg-[#0f243d] border-r border-slate-800 p-4 shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out
          ${mobileSummaryOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex items-center justify-between lg:hidden mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" /> Active Patient Summary
            </h2>
            <button 
              onClick={() => setMobileSummaryOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h2 className="hidden lg:flex text-xs font-bold uppercase tracking-wider text-blue-300 mb-3 items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-400" /> Active Patient Summary
          </h2>

          {patientContext ? (
            <div className="bg-[#173b68]/80 border border-blue-800/60 rounded-xl p-4 space-y-3 shadow-inner">
              <div>
                <span className="text-[11px] text-blue-200/70 uppercase font-semibold">Patient Name</span>
                <p className="text-sm font-bold text-white">{patientContext.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0b1727] p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Age / Gender</span>
                  <span className="text-slate-200 font-semibold">{patientContext.age} yrs • {patientContext.gender}</span>
                </div>
                <div className="bg-[#0b1727] p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Severity</span>
                  <span className={`font-bold ${
                    patientContext.severity === 'Severe' ? 'text-red-400' : 'text-amber-400'
                  }`}>{patientContext.severity}</span>
                </div>
              </div>
              <div>
                <span className="text-[11px] text-blue-200/70 uppercase font-semibold">Reported Symptoms</span>
                <p className="text-xs text-slate-200 bg-[#0b1727] p-2.5 rounded-lg border border-slate-800 mt-1">
                  "{patientContext.symptoms}" ({patientContext.duration})
                </p>
              </div>
              <div className="pt-2 border-t border-blue-900/60">
                <span className="text-[11px] text-blue-200/70 uppercase font-semibold block mb-1">Recommended Specialty</span>
                <span className="inline-block bg-blue-500/20 text-blue-200 text-xs font-semibold px-2.5 py-1 rounded border border-blue-400/30">
                  {patientContext.recommendedSpecialty || 'General Physician'}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-[#173b68]/30 border border-dashed border-blue-800/50 rounded-xl p-6 text-center text-xs text-slate-400">
              No active intake record. Click "Fill Intake" above to summarize your condition.
            </div>
          )}

          <div className="mt-auto pt-4 text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
            <p>🔒 <strong>Clinical Safety Standard:</strong> AI results are generated for preliminary triage and do not replace professional diagnosis.</p>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {mobileSummaryOpen && (
          <div 
            onClick={() => setMobileSummaryOpen(false)} 
            className="fixed inset-0 bg-slate-950/60 z-20 lg:hidden backdrop-blur-xs"
          />
        )}

        {/* Right Side: Chat Conversation Timeline */}
        <main className="flex-1 flex flex-col bg-[#0b1727] overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            {messages.map((msg) => {
              // 1. Render Intake Summary Card in Timeline
              if (msg.role === 'system_intake') {
                return (
                  <div key={msg.id} className="my-3 flex justify-center">
                    <div className="bg-[#173b68]/90 border border-blue-500/40 text-slate-200 text-xs px-4 py-3 rounded-xl max-w-lg w-full shadow-md flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-blue-200 block mb-0.5">Clinical Intake Registered</span>
                        <p className="text-slate-200">{msg.content}</p>
                        <span className="text-[10px] text-blue-300/60 mt-1 block">{msg.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              }

              // 2. Render User Messages
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex justify-end mb-3">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 max-w-lg text-sm shadow-md">
                      <p className="whitespace-pre-line">{msg.content}</p>
                      <span className="text-[10px] text-blue-200 mt-1 block text-right">{msg.timestamp}</span>
                    </div>
                  </div>
                );
              }

              // 3. Render AI Response Cards
              return (
                <div key={msg.id} className="flex gap-3 max-w-2xl mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#173b68] border border-blue-500/30 text-blue-300 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className={`rounded-2xl rounded-tl-xs p-4 text-sm border shadow-md ${
                      msg.isError
                        ? 'bg-red-950/50 border-red-800 text-red-200'
                        : msg.isEmergency
                        ? 'bg-amber-950/50 border-amber-800 text-amber-100'
                        : 'bg-[#0f243d] border-slate-800 text-slate-200'
                    }`}>
                      {msg.isEmergency && (
                        <div className="flex items-center gap-2 text-amber-300 font-bold mb-2 text-xs bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-700/50">
                          <AlertTriangle className="w-4 h-4 text-amber-400" /> URGENT CARE EVALUATION RECOMMENDED
                        </div>
                      )}

                      <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>

                      {msg.recommendedSpecialty && !msg.isError && (
                        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Suggested Referral:</span>
                          <span className="font-semibold text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded border border-blue-800">
                            {msg.recommendedSpecialty}
                          </span>
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400 mt-2 block">{msg.timestamp}</span>
                    </div>

                    {/* Suggested Question Chips */}
                    {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && !isLoading && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.suggestedQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => sendMessage(q)}
                            className="text-xs bg-[#173b68]/75 hover:bg-[#173b68] text-blue-200 px-3 py-1.5 rounded-full border border-blue-500/30 transition flex items-center gap-1 cursor-pointer"
                          >
                            <HelpCircle className="w-3 h-3 text-blue-300" />
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3 text-slate-400 text-xs my-2">
                <div className="w-8 h-8 rounded-lg bg-[#173b68] flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                </div>
                <span>Analyzing symptoms with clinical rules...</span>
              </div>
            )}

            {apiError && (
              <div className="flex justify-center my-2">
                <button
                  onClick={() => sendMessage(lastMessageSent)}
                  className="flex items-center gap-2 bg-[#173b68] hover:bg-[#102a45] text-red-300 text-xs px-3.5 py-2 rounded-xl border border-red-500/40 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-red-400" /> Retry Failed Message
                </button>
              </div>
            )}

            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <footer className="p-4 bg-[#0f243d] border-t border-slate-800 shrink-0">
            {inputError && (
              <div className="max-w-3xl mx-auto mb-2 text-xs text-red-400 bg-red-950/60 border border-red-900 px-3 py-1.5 rounded-lg">
                {inputError}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputQuery);
              }}
              className="max-w-3xl mx-auto flex gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => {
                  setInputQuery(e.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder="Describe your symptoms (e.g. fever, chest pain, sore throat)..."
                disabled={isLoading}
                className="flex-1 bg-[#0b1727] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputQuery.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-3 rounded-xl font-medium transition flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </footer>
        </main>
      </div>

      {/* Intake Modal Popup */}
      {showIntakeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f243d] border border-blue-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Patient Intake Assessment
              </h3>
              <button
                onClick={() => setShowIntakeModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIntakeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={patientContext?.name || ''}
                  placeholder="e.g. Ata ur Rehman"
                  className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Age</label>
                  <input
                    name="age"
                    type="number"
                    defaultValue={patientContext?.age || '22'}
                    className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Gender</label>
                  <select
                    name="gender"
                    defaultValue={patientContext?.gender || 'Male'}
                    className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Primary Symptoms</label>
                <textarea
                  name="symptoms"
                  rows={2}
                  defaultValue={patientContext?.symptoms || ''}
                  placeholder="e.g. Mild flu and fever for 2 days"
                  className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Symptom Duration</label>
                  <input
                    name="duration"
                    type="text"
                    defaultValue={patientContext?.duration || '2 days'}
                    className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Severity</label>
                  <select
                    name="severity"
                    defaultValue={patientContext?.severity || 'Moderate'}
                    className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition cursor-pointer active:scale-95"
                >
                  Save Intake Summary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}