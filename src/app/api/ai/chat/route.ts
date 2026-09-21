import { NextRequest, NextResponse } from "next/server";
import https from "https";
import axios from "axios";

// Bypass local SSL certificate validation for development
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          message: "Authorization token required. Please log in first.",
        },
        { status: 401 }
      );
    }

    // Call the .NET backend API
    const response = await axios.post(
      "https://localhost:5001/api/ai/conversations",
      body,
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        httpsAgent,
      }
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("AI Proxy Error:", error?.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        message:
          error?.response?.data?.message || "AI service temporarily unavailable",
      },
      { status: error?.response?.status || 500 }
    );
  }
}