import api from "@/lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatResponse {
  conversationId: string;
  message: string;
}

export interface SymptomCheckRequest {
  symptoms: string;
  age: number;
  gender?: string;
  medicalHistory?: string;
  currentMedications?: string;
  allergies?: string;
}

export interface SymptomCheckResponse {
  summary: string;
  possibleConditions: string;
  recommendedAction: string;
  urgency: string;
  requiresEmergencyCare: boolean;
}

export interface IntakeSummaryData {
  patientId?: string;
  appointmentId?: string;
  aiConversationId?: string;
  recommendedSpecialtyId?: string;
  chiefComplaint: string;
  symptomsDescription?: string;
  symptomOnset?: string;
  painLevel?: number;
  temperatureCelsius?: number;
  bloodPressure?: string;
  heartRateBpm?: number;
  currentMedications?: string;
  additionalNotes?: string;
  aiSummary?: string;
}

export async function sendChatMessage(
  message: string,
  conversationId?: string
): Promise<AIChatResponse> {
  try {
    const response = await api.post<AIChatResponse>("/ai/chat", {
      message,
      conversationId: conversationId || null,
    });

    return response.data;
  } catch (error) {
    console.error("Error in sendChatMessage:", error);
    throw error;
  }
}

export async function symptomCheck(
  data: SymptomCheckRequest
): Promise<SymptomCheckResponse> {
  try {
    const response = await api.post<SymptomCheckResponse>(
      "/ai/symptom-check",
      data
    );

    return response.data;
  } catch (error) {
    console.error("Error in symptomCheck:", error);
    throw error;
  }
}

export async function createConversation(
  patientId: string,
  title: string,
  appointmentId?: string
) {
  const response = await api.post("/ai/conversations", {
    patientId,
    appointmentId: appointmentId || null,
    title,
  });

  return response.data;
}

export async function getConversation(conversationId: string) {
  const response = await api.get(`/ai/conversations/${conversationId}`);
  return response.data;
}

export async function getPatientConversations(patientId: string) {
  const response = await api.get(
    `/ai/conversations/patient/${patientId}`
  );

  return response.data;
}

export async function submitIntakeSummary(
  data: IntakeSummaryData
) {
  try {
    const response = await api.post("/patientintakes", data);

    return response.data;
  } catch (error) {
    console.error("Error submitting intake summary:", error);
    throw error;
  }
}