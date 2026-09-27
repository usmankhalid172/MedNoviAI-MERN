"use client";

import React, { useState } from "react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

export default function ChatbotWidget({
  patientId,
}: {
  patientId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    null
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:5000";

      const res = await fetch(`${apiBaseUrl}/api/ai/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          question: userMsg.text,
          conversationId,
          patientId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await res.json();

      const botReply =
        data.response ||
        data.data?.response ||
        data.reply ||
        "Received response from assistant.";

      if (data.conversationId) {
        setConversationId(data.conversationId);
      } else if (data.data?.conversationId) {
        setConversationId(data.data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: botReply,
        },
      ]);
    } catch (error) {
      console.error("AI query error:", error);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: "Connection error. Please verify backend is running.",
        },
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
          className="rounded-full bg-blue-600 p-4 font-medium text-white shadow-lg transition-all hover:bg-blue-700"
        >
          💬 AI Assistant
        </button>
      ) : (
        <div className="flex h-[480px] w-80 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">
              MedNoviAI Assistant
            </h3>

            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="mt-8 text-center text-xs text-slate-400">
                How can I assist you with your health or appointment today?
              </p>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-xl p-3 text-xs ${
                  m.sender === "user"
                    ? "ml-auto rounded-br-none bg-blue-600 text-white"
                    : "mr-auto rounded-bl-none border border-slate-700 bg-slate-800 text-slate-200"
                }`}
              >
                {m.text}
              </div>
            ))}

            {isLoading && (
              <div className="mr-auto w-24 rounded-lg bg-slate-800 p-2 text-center text-xs italic text-slate-400">
                Thinking...
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="flex gap-2 border-t border-slate-800 bg-slate-800/50 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}