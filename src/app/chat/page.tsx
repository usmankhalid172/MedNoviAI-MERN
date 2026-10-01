"use client";
import React, { useEffect, useState } from "react";
import {
  getConversation,
  sendChatMessage,
  submitIntakeSummary,
  symptomCheck,
  type IntakeSummaryData,
  type SymptomCheckResponse,
} from "@/services/aiService";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
}

export default function AIChatPage() {
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text:
        "Hello! I am MedNovi AI Assistant. Describe your symptoms or complete the intake form below to share with a physician.",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmittingIntake, setIsSubmittingIntake] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [conversationId, setConversationId] =
    useState<string | null>(null);
  const [symptomResult, setSymptomResult] =
    useState<SymptomCheckResponse | null>(null);

  const [intakeForm, setIntakeForm] = useState({
    chiefComplaint: "",
    symptomsDescription: "",
    symptomOnset: "",
    painLevel: "",
    temperatureCelsius: "",
    bloodPressure: "",
    heartRateBpm: "",
    currentMedications: "",
    additionalNotes: "",
    age: "25",
    gender: "Male",
  });

  useEffect(() => {
    const savedConversationId = localStorage.getItem(
      "mednoviai-conversation-id"
    );

    if (!savedConversationId) {
      return;
    }

    setConversationId(savedConversationId);

    const loadConversation = async () => {
      try {
        const response = await getConversation(savedConversationId);

        const conversation = response?.data ?? response;

        if (!conversation?.messages) {
          return;
        }

        const restoredMessages: Message[] =
          conversation.messages.map(
            (
              item: {
                id?: string;
                role?: string;
                content?: string;
                timestamp?: string;
              },
              index: number
            ) => ({
              id:
                item.id ||
                `${Date.now()}-${index}`,
              sender:
                item.role?.toLowerCase() === "user"
                  ? "user"
                  : "ai",
              text: item.content || "",
              time: item.timestamp
                ? new Date(
                    item.timestamp
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
            })
          );

        if (restoredMessages.length > 0) {
          setMessages(restoredMessages);
        }
      } catch (error) {
        console.error(
          "Failed to restore conversation:",
          error
        );

        localStorage.removeItem(
          "mednoviai-conversation-id"
        );

        setConversationId(null);
      }
    };

    loadConversation();
  }, []);

  const formatTime = () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleSendMessage = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const messageText = inputMessage.trim();

    if (!messageText || isTyping) {
      return;
    }

    setErrorMessage("");

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: messageText,
      time: formatTime(),
    };

    setMessages((prev) => [
      ...prev,
      userMsg,
    ]);

    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await sendChatMessage(
        messageText,
        conversationId || undefined
      );

      const nextConversationId =
        response.conversationId;

      if (nextConversationId) {
        setConversationId(nextConversationId);

        localStorage.setItem(
          "mednoviai-conversation-id",
          nextConversationId
        );
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text:
          response.message ||
          "I received your message. Please provide more details about your symptoms.",
        time: formatTime(),
      };

      setMessages((prev) => [
        ...prev,
        aiMsg,
      ]);
    } catch (error) {
      console.error(
        "AI chat error:",
        error
      );

      setErrorMessage(
        "Unable to connect to the AI service. Please check the API connection and authentication."
      );

      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: "ai",
        text:
          "I could not connect to the AI service right now. Please try again.",
        time: formatTime(),
      };

      setMessages((prev) => [
        ...prev,
        errorMsg,
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const getPatientId = async (): Promise<string> => {
    if (!user?.id) {
      throw new Error(
        "User ID not found. Please log in again."
      );
    }

    const response = await api.get(
      `/patients/user/${user.id}`
    );

    const patient =
      response.data?.data ??
      response.data;

    if (!patient?.id) {
      throw new Error(
        "Patient ID was not returned by the API."
      );
    }

    return patient.id;
  };

  const handleIntakeSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!intakeForm.chiefComplaint.trim()) {
      setErrorMessage(
        "Chief complaint is required."
      );
      return;
    }

    if (
      !intakeForm.symptomsDescription.trim()
    ) {
      setErrorMessage(
        "Symptoms description is required."
      );
      return;
    }

    if (
      !intakeForm.age ||
      Number(intakeForm.age) < 1 ||
      Number(intakeForm.age) > 120
    ) {
      setErrorMessage(
        "Age must be between 1 and 120."
      );
      return;
    }

    if (
      intakeForm.painLevel !== "" &&
      (Number(intakeForm.painLevel) < 0 ||
        Number(intakeForm.painLevel) > 10)
    ) {
      setErrorMessage(
        "Pain level must be between 0 and 10."
      );
      return;
    }

    if (
      intakeForm.temperatureCelsius !== "" &&
      (Number(
        intakeForm.temperatureCelsius
      ) < 25 ||
        Number(
          intakeForm.temperatureCelsius
        ) > 50)
    ) {
      setErrorMessage(
        "Temperature must be between 25°C and 50°C."
      );
      return;
    }

    if (
      intakeForm.heartRateBpm !== "" &&
      (Number(
        intakeForm.heartRateBpm
      ) < 20 ||
        Number(
          intakeForm.heartRateBpm
        ) > 250)
    ) {
      setErrorMessage(
        "Heart rate must be between 20 and 250 BPM."
      );
      return;
    }

    setErrorMessage("");
    setIsSubmittingIntake(true);

    try {
      const patientId =
        await getPatientId();

      let aiSummary = "";
      let latestSymptomResult:
        | SymptomCheckResponse
        | null = null;

      try {
        latestSymptomResult =
          await symptomCheck({
            symptoms:
              intakeForm.symptomsDescription,
            age: Number(intakeForm.age),
            gender:
              intakeForm.gender ||
              undefined,
            currentMedications:
              intakeForm.currentMedications ||
              undefined,
          });

        setSymptomResult(
          latestSymptomResult
        );

        aiSummary = [
          latestSymptomResult.summary,
          `Possible conditions: ${latestSymptomResult.possibleConditions}`,
          `Recommended action: ${latestSymptomResult.recommendedAction}`,
          `Urgency: ${latestSymptomResult.urgency}`,
          latestSymptomResult.requiresEmergencyCare
            ? "Emergency care may be required."
            : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch (error) {
        console.error(
          "Symptom check failed:",
          error
        );

        aiSummary =
          `Patient reported ${intakeForm.symptomsDescription}.`;
      }

      const payload: IntakeSummaryData = {
        patientId,
        aiConversationId:
          conversationId || undefined,

        chiefComplaint:
          intakeForm.chiefComplaint,

        symptomsDescription:
          intakeForm.symptomsDescription,

        symptomOnset:
          intakeForm.symptomOnset ||
          undefined,

        painLevel:
          intakeForm.painLevel !== ""
            ? Number(intakeForm.painLevel)
            : undefined,

        temperatureCelsius:
          intakeForm.temperatureCelsius !== ""
            ? Number(
                intakeForm.temperatureCelsius
              )
            : undefined,

        bloodPressure:
          intakeForm.bloodPressure ||
          undefined,

        heartRateBpm:
          intakeForm.heartRateBpm !== ""
            ? Number(
                intakeForm.heartRateBpm
              )
            : undefined,

        currentMedications:
          intakeForm.currentMedications ||
          undefined,

        additionalNotes:
          intakeForm.additionalNotes ||
          undefined,

        aiSummary,
      };

      await submitIntakeSummary(
        payload
      );

      const summaryMessage =
        latestSymptomResult
          ? [
              "Intake submitted successfully.",
              "",
              `Summary: ${latestSymptomResult.summary}`,
              "",
              `Recommended action: ${latestSymptomResult.recommendedAction}`,
              "",
              `Urgency: ${latestSymptomResult.urgency}`,
            ].join("\n")
          : "Patient intake submitted successfully for doctor review.";

      setMessages((prev) => [
        ...prev,
        {
          id: `intake-${Date.now()}`,
          sender: "ai",
          text: summaryMessage,
          time: formatTime(),
        },
      ]);

      setShowModal(false);

      setIntakeForm({
        chiefComplaint: "",
        symptomsDescription: "",
        symptomOnset: "",
        painLevel: "",
        temperatureCelsius: "",
        bloodPressure: "",
        heartRateBpm: "",
        currentMedications: "",
        additionalNotes: "",
        age: "25",
        gender: "Male",
      });
    } catch (error) {
      console.error(
        "Intake submission failed:",
        error
      );

      setErrorMessage(
        "Unable to submit patient intake. Please check your login and API connection."
      );
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  const handleClearConversation =
    () => {
      localStorage.removeItem(
        "mednoviai-conversation-id"
      );

      setConversationId(null);
      setSymptomResult(null);

      setMessages([
        {
          id: "welcome-new",
          sender: "ai",
          text:
            "Hello! I am MedNovi AI Assistant. Describe your symptoms or complete the intake form below to share with a physician.",
          time: formatTime(),
        },
      ]);

      setInputMessage("");
      setErrorMessage("");
    };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
            AI
=======
﻿"use client";
import React, { useState } from "react";
import Link from "next/link";
import { 
  RefreshCw, AlertTriangle, Send, 
  ArrowLeft, FileText, Sparkles, Stethoscope, X, Menu, Plus
} from "lucide-react";
import { useAiChat } from "@/hooks/useAiChat";
import { PatientSummaryCard, IntakeData } from "@/components/chat/PatientSummaryCard";
import { ChatResponseCard } from "@/components/chat/ChatResponseCard";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
export default function AIChatPage() {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    inputMessage,
    setInputMessage,
    isLoading,
    validationError,
    setValidationError,
    messagesEndRef,
    createNewSession,
    handleSendMessage,
    clearAllHistory,
  } = useAiChat();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [patientContext, setPatientContext] = useState<IntakeData | null>(null);
  // Form State
  const [name, setName] = useState("Ata ur Rehman");
  const [age, setAge] = useState("22");
  const [gender, setGender] = useState("Male");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("2 days");
  const [severity, setSeverity] = useState<"Mild" | "Moderate" | "Severe">("Moderate");
  const [specialty, setSpecialty] = useState("General Physician");
  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;
    const intake: IntakeData = { age, gender, symptoms, duration, severity, specialty };
    setPatientContext(intake);
    const summaryText = `Patient Intake Registered: ${symptoms} (${severity} severity, duration: ${duration})`;
    handleSendMessage(summaryText, intake);
    setShowIntakeModal(false);
  };
  return (
    <div className="flex flex-col h-screen bg-[#0b1727] text-slate-100 font-sans overflow-hidden">
      {/* Header Bar */}
      <header className="bg-[#173b68] border-b border-blue-900/40 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 transition lg:hidden cursor-pointer"
            title="Open Chat History"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link 
            href="/patient/dashboard" 
            className="p-2 rounded-lg bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 transition"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/30">
            <Stethoscope className="w-5 h-5" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-white">
              MedNoviAI Assistant
            </h1>

            <p className="text-xs text-slate-400">
              AI Chat & Patient Intake
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={
              handleClearConversation
            }
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            New Chat
          </button>

          <button
            type="button"
            onClick={() =>
              setShowModal(true)
            }
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Create Intake Summary
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="border-b border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-xl rounded-2xl p-4 text-sm ${
                  msg.sender === "user"
                    ? "rounded-br-none bg-emerald-600 text-white"
                    : "rounded-bl-none border border-slate-700 bg-slate-800 text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {msg.text}
                </p>

                <span className="mt-2 block text-right text-[10px] text-slate-400">
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="animate-pulse rounded-2xl bg-slate-800 px-4 py-2 text-xs text-slate-400">
                MedNovi AI is typing...
              </div>
            </div>
          )}

          {symptomResult && (
            <div className="rounded-2xl border border-emerald-900 bg-emerald-950/30 p-5">
              <h2 className="mb-3 text-base font-bold text-emerald-400">
                AI Symptom Assessment
              </h2>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-300">
                    Summary
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-slate-400">
                    {symptomResult.summary}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-300">
                    Possible Conditions
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-slate-400">
                    {
                      symptomResult.possibleConditions
                    }
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-300">
                    Recommended Action
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-slate-400">
                    {
                      symptomResult.recommendedAction
                    }
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-300">
                    Urgency
                  </p>

                  <p className="mt-1 text-slate-400">
                    {symptomResult.urgency}
                  </p>
                </div>

                {symptomResult.requiresEmergencyCare && (
                  <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-red-300">
                    The AI response indicates
                    that emergency care may be
                    required.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSendMessage}
        className="border-t border-slate-800 bg-slate-900 p-4"
      >
        <div className="mx-auto flex max-w-4xl gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) =>
              setInputMessage(e.target.value)
            }
            placeholder="Type your medical query or symptoms..."
            disabled={isTyping}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={
              isTyping ||
              !inputMessage.trim()
            }
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isTyping
              ? "Sending..."
              : "Send"}
          </button>
        </div>
      </form>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100">
            <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                Patient Intake Summary
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
                disabled={
                  isSubmittingIntake
                }
                className="text-xl text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleIntakeSubmit
              }
              className="space-y-4 text-sm"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-slate-400">
                    Age
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="120"
            <h1 className="font-bold text-sm text-white flex items-center gap-2">
              MedNovi AI Assistant
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                Day 21 Reusable Triage
              </span>
            </h1>
            <p className="text-xs text-blue-200/70">Clinical AI Chat & Symptom Triage</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createNewSession}
            className="hidden sm:flex items-center gap-1.5 bg-blue-600/80 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg border border-blue-400/30 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => setShowIntakeModal(true)}
            className="flex items-center gap-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg border border-emerald-400/30 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{patientContext ? "Edit Intake" : "Fill Intake"}</span>
          </button>
        </div>
      </header>
      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat History Sidebar */}
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
        {/* Left Side: Patient Intake Panel */}
        <aside className="hidden lg:flex flex-col w-80 bg-[#0f243d] border-r border-slate-800 p-4 shrink-0 overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-400" /> Active Patient Summary
          </h2>
          {patientContext ? (
            <PatientSummaryCard intake={patientContext} />
          ) : (
            <div className="bg-[#173b68]/30 border border-dashed border-blue-800/50 rounded-xl p-6 text-center text-xs text-slate-400">
              No active intake record. Click "Fill Intake" above to summarize your condition.
            </div>
          )}
          <div className="mt-auto pt-4 text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
            <p>🔒 <strong>Clinical Safety Standard:</strong> AI results are generated for preliminary triage and do not replace professional diagnosis.</p>
          </div>
        </aside>
        {/* Right Side: Chat Timeline */}
        <main className="flex-1 flex flex-col bg-[#0b1727] overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-xl rounded-2xl p-4 shadow-md text-xs sm:text-sm ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-[#0f243d] border border-slate-800 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {/* Inline Reusable Intake Card if attached */}
                  {msg.intakeSummary && (
                    <div className="mb-3">
                      <PatientSummaryCard intake={msg.intakeSummary} compact />
                    </div>
                  )}
                  {msg.sender === "ai" ? (
                    <ChatResponseCard
                      content={msg.content}
                      suggestedPrompts={msg.suggestedPrompts}
                      onPromptClick={(prompt) => handleSendMessage(prompt)}
                    />
                  ) : (
                    <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                  )}
                  <span className="text-[10px] text-slate-400 mt-2 block text-right opacity-70">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 text-slate-400 text-xs my-2 bg-[#0f243d]/80 p-3 rounded-xl border border-slate-800 w-fit">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Analyzing symptoms with clinical AI rules...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Footer Input Area */}
          <footer className="p-4 bg-[#0f243d] border-t border-slate-800 shrink-0">
            {validationError && (
              <div className="max-w-3xl mx-auto mb-2 text-xs text-red-400 bg-red-950/60 border border-red-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="max-w-3xl mx-auto flex gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Describe your symptoms (e.g. fever, headache, chest pain)..."
                disabled={isLoading}
                className="flex-1 bg-[#0b1727] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-3 rounded-xl font-medium transition flex items-center justify-center shrink-0 cursor-pointer"
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
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                    required
                    value={intakeForm.age}
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        age: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
                  />
                </div>

                <div>

                  <label className="mb-1 block text-slate-400">
                    Gender
                  </label>

                  <select
                    value={
                      intakeForm.gender
                    }
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        gender:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
=======
                  <label className="block text-slate-300 font-medium mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-slate-400">
                  Chief Complaint
                </label>

                <input
                  type="text"
                  required
                  maxLength={1000}
                  value={
                    intakeForm.chiefComplaint
                  }
                  onChange={(e) =>
                    setIntakeForm({
                      ...intakeForm,
                      chiefComplaint:
                        e.target.value,
                    })
                  }
                  placeholder="e.g. Fever and persistent cough"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">
                  Symptoms Description
                </label>

                <textarea

                <label className="block text-slate-300 font-medium mb-1">Primary Symptoms</label>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Mild flu and sore throat for 2 days"
                  className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"

                  required
                  maxLength={4000}
                  value={
                    intakeForm.symptomsDescription
                  }
                  onChange={(e) =>
                    setIntakeForm({
                      ...intakeForm,
                      symptomsDescription:
                        e.target.value,
                    })
                  }
                  placeholder="Describe symptoms in detail..."
                  className="h-24 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
                />
              </div>


              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-slate-400">
                    Symptom Onset
                  </label>

                  <input
                    type="text"
                    maxLength={200}
                    value={
                      intakeForm.symptomOnset
                    }
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        symptomOnset:
                          e.target.value,
                      })
                    }
                    placeholder="e.g. 3 days ago"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
=======
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Symptom Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"

                  />
                </div>

                <div>

                  <label className="mb-1 block text-slate-400">
                    Pain Level (0–10)
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={
                      intakeForm.painLevel
                    }
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        painLevel:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-slate-400">
                    Temperature (°C)
                  </label>

                  <input
                    type="number"
                    min="25"
                    max="50"
                    step="0.1"
                    value={
                      intakeForm.temperatureCelsius
                    }
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        temperatureCelsius:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-slate-400">
                    Blood Pressure
                  </label>

                  <input
                    type="text"
                    maxLength={50}
                    value={
                      intakeForm.bloodPressure
                    }
                    onChange={(e) =>
                      setIntakeForm({
                        ...intakeForm,
                        bloodPressure:
                          e.target.value,
                      })
                    }
                    placeholder="e.g. 120/80"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
                  />
=======
                  <label className="block text-slate-300 font-medium mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>

                </div>
              </div>
              <div>
                <label className="mb-1 block text-slate-400">
                  Heart Rate (BPM)
                </label>

                <input
                  type="number"
                  min="20"
                  max="250"
                  value={
                    intakeForm.heartRateBpm
                  }
                  onChange={(e) =>
                    setIntakeForm({
                      ...intakeForm,
                      heartRateBpm:
                        e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">
                  Current Medications
                </label>

                <textarea
                  maxLength={2000}
                  value={
                    intakeForm.currentMedications
                  }
                  onChange={(e) =>
                    setIntakeForm({
                      ...intakeForm,
                      currentMedications:
                        e.target.value,
                    })
                  }
                  className="h-20 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
                  placeholder="List current medications if any"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">
                  Additional Notes
                </label>

                <textarea
                  maxLength={3000}
                  value={
                    intakeForm.additionalNotes
                  }
                  onChange={(e) =>
                    setIntakeForm({
                      ...intakeForm,
                      additionalNotes:
                        e.target.value,
                    })
                  }
                  className="h-20 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-white"
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={
                    isSubmittingIntake
                  }
                  className="rounded-lg bg-slate-800 px-4 py-2 text-slate-300 hover:bg-slate-700"
=======
                <label className="block text-slate-300 font-medium mb-1">Preferred Specialty</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full bg-[#0b1727] border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="General Physician">General Physician</option>
                  <option value="Pulmonology">Pulmonology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Neurology">Neurology</option>
                </select>
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

                  disabled={
                    isSubmittingIntake
                  }
                  className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isSubmittingIntake
                    ? "Submitting..."
                    : "Save & Send Summary"}
=======
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition cursor-pointer"
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
