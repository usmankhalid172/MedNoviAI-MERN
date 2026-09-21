'use client';

import React, { useState, useEffect } from 'react';
import { createAiConversation } from '@/services/aiService';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

export default function ChatbotWidget({ patientId }: { patientId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Initialize active conversation session with MERN backend
  const startNewSession = async () => {
    if (!patientId) return;
    try {
      const session = await createAiConversation({
        patientId,
        title: 'MedNoviAI Assistance',
      });
      setConversationId(session.id);
    } catch (err) {
      console.error('Session initialization error:', err);
    }
  };

  useEffect(() => {
    if (isOpen && !conversationId && patientId) {
      startNewSession();
    }
  }, [isOpen, patientId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Connect query to backend / AI assistant route
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:5001'}/api/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          question: userMsg.text,
          conversationId,
        }),
      });

      const data = await res.json();
      const botReply = data.response || data.data?.response || 'Received response from assistant.';

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), sender: 'assistant', text: botReply },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), sender: 'assistant', text: 'Connection error. Please verify backend is running.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg font-medium transition-all"
        >
          💬 AI Assistant
        </button>
      ) : (
        <div className="w-80 sm:w-96 h-[480px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-800 px-4 py-3 flex justify-between items-center border-b border-slate-700">
            <h3 className="text-white font-semibold text-sm">MedNoviAI Assistant</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-slate-400 text-center mt-8">
                How can I assist you with your health or appointment today?
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] text-xs p-3 rounded-xl ${
                  m.sender === 'user'
                    ? 'ml-auto bg-blue-600 text-white rounded-br-none'
                    : 'mr-auto bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}
              >
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div className="mr-auto text-xs text-slate-400 italic bg-slate-800 p-2 rounded-lg w-24 text-center">
                Thinking...
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-slate-800/50 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}