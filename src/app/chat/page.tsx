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
                >
                  Cancel
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
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}