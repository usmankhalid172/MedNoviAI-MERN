import { NextResponse } from "next/server";
import {
  bookAppointment,
  clientForToken,
  isBookingConfigured,
  patientNameFromToken,
  readAccessToken,
  userIdFromToken,
  validateBookingBody,
} from "@/lib/appointmentsApi";

export const dynamic = "force-dynamic";

const LIST_COLUMNS =
  "id, patient_id, doctor_id, appointment_date, appointment_time, status, notes, created_at";

/**
 * The caller's own appointments.
 *
 * Scoped to the token's subject rather than a query parameter, so this can only
 * ever return the caller's own bookings. `scope=doctor` reads the bookings made
 * against the caller as a doctor; without it the caller's own bookings as a
 * patient are returned.
 *
 * `doctor` details are joined in so the list renders without a second round
 * trip, and `?upcoming=1` limits the result to live, future bookings.
 */
export async function GET(request: Request) {
  if (!isBookingConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured.", code: "not_configured" },
      { status: 500 }
    );
  }

  const accessToken = readAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "You must be signed in to view your appointments.",
        code: "unauthorized",
      },
      { status: 401 }
    );
  }

  const userId = userIdFromToken(accessToken);

  if (!userId) {
    return NextResponse.json(
      { error: "Your session is not valid. Please sign in again.", code: "unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "doctor" ? "doctor" : "patient";
  const upcomingOnly = searchParams.get("upcoming") === "1";

  const supabase = clientForToken(accessToken);

  let query = supabase
    .from("appointments")
    .select(LIST_COLUMNS)
    .eq(scope === "doctor" ? "doctor_id" : "patient_id", userId)
    .order("appointment_date", { ascending: scope === "doctor" })
    .order("appointment_time", { ascending: true });

  if (upcomingOnly) {
    const today = new Date().toISOString().slice(0, 10);
    query = query
      .gte("appointment_date", today)
      .in("status", ["pending", "confirmed"]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message, code: "upstream" },
      { status: 502 }
    );
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return NextResponse.json({ appointments: [] });
  }

  // Doctors are only readable through the caller's own token; a patient is not
  // granted read access to other doctors here, so a missing doctor block simply
  // renders without a name rather than failing the whole list.
  const doctorIds = Array.from(
    new Set(
      rows
        .map((row) => (row as { doctor_id: string | null }).doctor_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  let doctorsById: Record<string, { full_name: string | null; specialty: string | null; avatar_url: string | null }> = {};

  if (doctorIds.length > 0) {
    const { data: doctorRows } = await supabase
      .from("doctors")
      .select("id, full_name, specialty, avatar_url")
      .in("id", doctorIds);

    doctorsById = Object.fromEntries(
      (doctorRows ?? []).map((doctor) => [
        doctor.id,
        {
          full_name: doctor.full_name ?? null,
          specialty: doctor.specialty ?? null,
          avatar_url: doctor.avatar_url ?? null,
        },
      ])
    );
  }

  return NextResponse.json({
    appointments: rows.map((row) => {
      const typed = row as { doctor_id: string | null };
      return { ...typed, doctor: typed.doctor_id ? (doctorsById[typed.doctor_id] ?? null) : null };
    }),
  });
}

/**
 * Books an appointment.
 *
 * `patient_id` is taken from the caller's token and never from the body, so a
 * request cannot book on someone else's behalf. The slot is re-validated
 * against the doctor's configured availability here rather than trusted from
 * the client, and the database enforces uniqueness of live bookings.
 */
export async function POST(request: Request) {
  if (!isBookingConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured.", code: "not_configured" },
      { status: 500 }
    );
  }

  const accessToken = readAccessToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        error: "You must be signed in to book an appointment.",
        code: "unauthorized",
      },
      { status: 401 }
    );
  }

  const userId = userIdFromToken(accessToken);

  if (!userId) {
    return NextResponse.json(
      { error: "Your session is not valid. Please sign in again.", code: "unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A booking request body is required.", code: "invalid_body" },
      { status: 400 }
    );
  }

  const validated = validateBookingBody(body);

  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.message, code: validated.code },
      { status: validated.status }
    );
  }

  const supabase = clientForToken(accessToken);

  // The name is copied onto the appointment row so the doctor's dashboard can
  // show who booked. It comes from the caller's own token, never from the body,
  // so it cannot be forged by the client.
  const result = await bookAppointment(
    supabase,
    userId,
    validated.value,
    patientNameFromToken(accessToken)
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.status }
    );
  }

  return NextResponse.json({ appointment: result.appointment }, { status: 201 });
}
