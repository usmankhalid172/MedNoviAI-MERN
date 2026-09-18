'use client';

import React, { useState, useRef, useEffect } from 'react';
import IntakeModal, { PatientContextData } from '@/components/chat/IntakeModal';
import MessageBubble, { Message } from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import { Bot, Activity, RefreshCw } from 'lucide-react';

export default function ChatPage() {
  const [patientContext, setPatientContext] = useState<PatientContextData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleIntakeSubmit = (data: PatientContextData) => {
    setPatientContext(data);
    const initialGreeting: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hello! I have noted your reported symptoms (${data.symptoms}). How can I assist you further today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialGreeting]);
  };

  const handleSendMessage = async (userQuery: string) => {
    setLastMessage(userQuery);
    setHasError(false);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userQuery,
          patientContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI service temporarily unavailable');
      }

      const isEmergency = /chest pain|difficulty breathing|unconscious|stroke|severe bleeding/i.test(
        userQuery + ' ' + (data.response || '')
      );

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.message || 'Consultation processed successfully.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEmergency,
        recommendedSpecialty: data.recommendedSpecialty || 'General Practitioner',
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: any) {
      setHasError(true);
      const errorBubble: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: err.message || 'AI service temporarily unavailable. Please verify your connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorBubble]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      {!patientContext && <IntakeModal onSubmit={handleIntakeSubmit} />}

      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">MedNoviAI Triage Assistant</h1>
            <p className="text-xs text-slate-400">Connected & Ready</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          {hasError && (
            <div className="flex justify-center my-2">
              <button
                onClick={() => handleSendMessage(lastMessage)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Request
              </button>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading || !patientContext} />
    </div>
  );
}