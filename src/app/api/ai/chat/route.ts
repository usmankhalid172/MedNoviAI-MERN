import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const aiResponse = `Thank you for sharing your symptoms regarding "${message}". Based on standard preliminary intake guidelines, please make sure to log your symptom duration and severity in the intake form so a doctor can review your record.`;

    return NextResponse.json({
      success: true,
      reply: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error processing AI chat' },
      { status: 500 }
    );
  }
}