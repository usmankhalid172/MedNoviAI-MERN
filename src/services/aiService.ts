export interface IntakeSummaryData {
  patientAge: number;
  patientGender: string;
  symptoms: string;
  duration: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Emergency';
  recommendedSpecialty: string;
  aiSummary: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export async function sendChatMessage(message: string, history: Array<{ role: string; content: string }>) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message to AI service');
    }

    return await response.json();
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    return {
      reply: "I'm having trouble connecting to the AI server. Please verify your backend API connection.",
      isError: true,
    };
  }
}

export async function submitIntakeSummary(data: IntakeSummaryData) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to submit intake summary');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting intake summary:', error);
    return { success: false, error: 'Database submission failed' };
  }
}