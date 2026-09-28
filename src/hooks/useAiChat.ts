"use client";
import { useState, useEffect, useRef } from "react";
import { IntakeData } from "@/components/chat/PatientSummaryCard";
export interface Message {
  id: string;
  sender: "user" | "ai";
  content: string;
  timestamp: string;
  intakeSummary?: IntakeData;
  suggestedPrompts?: string[];
}
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}
const STORAGE_KEY = "mednovi_chat_sessions_v3";
export const useAiChat = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ChatSession[] = JSON.parse(stored);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } else {
        createNewSession();
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
      createNewSession();
    }
  }, []);
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Triage Session",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      messages: [
        {
          id: "welcome-" + Date.now(),
          sender: "ai",
          content: "Hello! I am MedNovi AI Assistant. Complete your intake details or describe your symptoms below to get personalized clinical triage guidance.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          suggestedPrompts: [
            "What should I do for a mild fever?",
            "When should I see a cardiologist?",
            "How can I manage tension headaches?"
          ]
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };
  const handleSendMessage = async (customContent?: string, intakeData?: IntakeData) => {
    const textToSend = customContent || inputMessage;
    if (!textToSend.trim() && !intakeData) return;
    if (!intakeData && textToSend.trim().length < 3) {
      setValidationError("Please describe your symptoms in a bit more detail.");
      return;
    }
    setValidationError(null);
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: textToSend,
      timestamp: timeStr,
      intakeSummary: intakeData,
    };
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const updatedTitle = s.messages.length <= 1 ? textToSend.slice(0, 25) + "..." : s.title;
          return { ...s, title: updatedTitle, messages: [...s.messages, userMsg] };
        }
        return s;
      })
    );
    setInputMessage("");
    setIsLoading(true);
    try {
      const historyPayload = messages.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.content,
      }));
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, history: historyPayload }),
      });
      const data = await res.json();
      const aiReply = data?.reply || data?.message || "Analysis complete. Please consult a qualified practitioner.";
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedPrompts: [
          "What home remedies help?",
          "When should I see a doctor?",
          "What symptoms require emergency care?"
        ]
      };
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [...s.messages, aiMsg] } : s))
      );
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        content: "⚠️ Connection timeout. Please verify your backend server is active and click retry.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [...s.messages, errorMsg] } : s))
      );
    } finally {
      setIsLoading(false);
    }
  };
  const clearAllHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSessions([]);
    createNewSession();
  };
  return {
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
  };
};
