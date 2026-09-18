const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://localhost:5001';

// Helper to retrieve token from Auth context or localStorage
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface CreateConversationPayload {
  patientId: string;
  appointmentId?: string;
  title: string;
}

// 1. Create AI Conversation Session (POST /api/ai/conversations)
export const createAiConversation = async (payload: CreateConversationPayload) => {
  const response = await fetch(`${BASE_URL}/api/ai/conversations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to initialize AI conversation');
  }
  return data.data; // Returns { id, title, status, startedAt, messageCount }
};

// 2. Fetch Patient Conversations (GET /api/ai/conversations/patient/{patientId})
export const getPatientConversations = async (patientId: string) => {
  const response = await fetch(`${BASE_URL}/api/ai/conversations/patient/${patientId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch conversations');
  }
  return data.data;
};