import { NextResponse } from "next/server";

const backendUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

async function proxyDoctorRequest(id: string) {
  if (!backendUrl) {
    return NextResponse.json(
      { message: "Doctor API is not configured" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `${backendUrl.replace(/\/$/, "")}/api/doctors/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Doctor API is unavailable" },
      { status: 503 },
    );
  }
}

export function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return params.then(({ id }) => proxyDoctorRequest(id));
}