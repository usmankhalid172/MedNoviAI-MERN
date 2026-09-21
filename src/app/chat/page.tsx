'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import MessageBubble, { Message } from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import TypingIndicator from '@/components/chat/TypingIndicator';
import api from '@/lib/api';
import { Bot, Sparkles, Activity } from 'lucide-react';

const formatChatTime = (date: Date) =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your MedNoviAI Health Assistant. How can I help you analyze your symptoms or answer medical questions today?',
      timestamp: formatChatTime(new Date()),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: formatChatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: content });
      const reply =
        res.data?.reply ||
        res.data?.message ||
        res.data?.response ||
        res.data?.data?.reply || '';
      if (reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: reply,
            timestamp: formatChatTime(new Date()),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Sorry, I could not reach the AI service right now. Please try again shortly.',
          timestamp: formatChatTime(new Date()),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-dvh w-full bg-slate-950 text-slate-100 overflow-hidden">
      <header className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" aria-label="Back to home" className="inline-flex h-8 w-30 shrink-0 items-center 
            justify-center rounded-lg bg-blue-600 text-slate-200 transition-colors
            hover:bg-blue-700 hover:text-white">
            &larr; Go to Home
          </Link>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-900/30">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-bold text-sm sm:text-lg tracking-wide text-white truncate">MedNoviAI Assistant</h1>
              <span className="hidden sm:inline-flex items-center gap-1 bg-purple-950/80 border border-purple-800 text-purple-300 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0">
                <Sparkles className="w-3 h-3 text-[#7C3AED]" /> Vital AI
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              Active & ready
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 shrink-0">
          <Activity className="w-4 h-4 text-[#7C3AED]" />
          Healthcare Assistant Mode
        </div>
      </header>

      {/* Main Chat Scroll Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full px-3 sm:px-6 py-4 sm:py-6">
          <div className="max-w-4xl mx-auto space-y-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Bottom Input */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
}