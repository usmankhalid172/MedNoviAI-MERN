import { NextResponse } from "next/server";

const backendUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!backendUrl) {
    return NextResponse.json(
      { message: "Availability API is not configured", slots: [] },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${backendUrl.replace(/\/$/, "")}/api/doctors/${encodeURIComponent(id)}/availability`,
      { cache: "no-store" },
    );
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Availability API is unavailable", slots: [] },
      { status: 503 },
    );
  }
}
