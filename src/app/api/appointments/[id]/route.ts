import { NextResponse } from "next/server";
import {
  cancelAppointment,
  clientForToken,
  isBookingConfigured,
  readAccessToken,
  rescheduleAppointment,
  userIdFromToken,
} from "@/lib/appointmentsApi";

export const dynamic = "force-dynamic";

const DETAIL_COLUMNS =
  "id, patient_id, doctor_id, appointment_date, appointment_time, status, notes, created_at";

/**
 * Only the columns that verifiably exist on `public.patients`.
 *
 * The rest of the medical profile (date of birth, gender, blood group,
 * allergies, chronic conditions, medications) has no column on this table, so
 * it cannot be selected without failing the whole request. The UI renders those
 * fields as "Not available" rather than inventing values.
 */
const PATIENT_COLUMNS = "id, user_id, full_name, email, phone_number, medical_record_number";

/**
 * The intake table does carry the clinical fields the intake summary renders.
 * `recommended_specialty_name` is absent, so that panel is left empty.
 */
const INTAKE_COLUMNS =
  "id, patient_id, appointment_id, chief_complaint, symptoms_description, symptom_onset, " +
  "pain_level, temperature_celsius, blood_pressure, heart_rate_bpm, " +
  "current_medications, additional_notes, ai_summary, status, submitted_at, created_at";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function unauthorized(message: string) {
  return NextResponse.json({ error: message, code: "unauthorized" }, { status: 401 });
}

/**
 * Resolves the caller and a Supabase client acting as them, or an error response.
 *
 * Ownership is enforced by RLS rather than by an `id` comparison here: a patient
 * cannot read another patient's row, so an inaccessible id surfaces as 404 rather
 * than as a 403 that would confirm the appointment exists.
 */
function resolveCaller(request: Request) {
  if (!isBookingConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured.", code: "not_configured" },
      { status: 500 }
    );
  }

  const accessToken = readAccessToken(request);

  if (!accessToken) {
    return unauthorized("You must be signed in to manage your appointments.");
  }

  const userId = userIdFromToken(accessToken);

  if (!userId) {
    return unauthorized("Your session is not valid. Please sign in again.");
  }

  return { userId, supabase: clientForToken(accessToken) };
}

/** A single appointment with its doctor and patient details resolved. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = resolveCaller(request);

  if (caller instanceof NextResponse) return caller;

  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "Appointment not found.", code: "not_found" },
      { status: 404 }
    );
  }

  const { data, error } = await caller.supabase
    .from("appointments")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message, code: "upstream" },
      { status: 502 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Appointment not found.", code: "not_found" },
      { status: 404 }
    );
  }

  const row = data as {
    id: string;
    patient_id: string | null;
    doctor_id: string | null;
  };

  // Both joins are best-effort: a patient cannot read the `patients` table and
  // RLS may hide a doctor row, so a missing side renders blank rather than
  // failing the whole detail view.
  let doctor = null;
  let patient = null;

  if (row.doctor_id) {
    const { data: doctorRow } = await caller.supabase
      .from("doctors")
      .select("id, full_name, specialty, avatar_url")
      .eq("id", row.doctor_id)
      .maybeSingle();
    doctor = doctorRow ?? null;
  }

  if (row.patient_id) {
    // `appointments.patient_id` is written as the auth user id, but the seeded
    // profile rows use it as `patients.id`, and a profile created at signup can
    // carry a separate primary key. Try both so the panel is not blank purely
    // because of which convention a given row used.
    const { data: patientRow } = await caller.supabase
      .from("patients")
      .select(PATIENT_COLUMNS)
      .eq("id", row.patient_id)
      .maybeSingle();

    if (patientRow) {
      patient = patientRow;
    } else {
      const { data: byUserId } = await caller.supabase
        .from("patients")
        .select(PATIENT_COLUMNS)
        .eq("user_id", row.patient_id)
        .maybeSingle();

      patient = byUserId ?? null;
    }
  }

  // Intake is optional. Prefer the row linked to this appointment, then fall
  // back to the patient's most recent intake so the doctor still gets context
  // when the patient booked without completing a fresh intake.
  let intake = null;

  if (row.patient_id) {
    const { data: intakeRow } = await caller.supabase
      .from("patient_intakes")
      .select(INTAKE_COLUMNS)
      .eq("patient_id", row.patient_id)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(2);

    const rows = (intakeRow ?? []) as Array<{ appointment_id?: string | null }>;

    intake =
      rows.find((item) => item.appointment_id === id) ??
      rows[0] ??
      null;
  }

  return NextResponse.json({
    appointment: { ...row, doctor, patient, intake },
  });
}

/**
 * Cancels or reschedules an appointment.
 *
 * `action: "cancel"` releases the slot so it can be rebooked. `action:
 * "reschedule"` moves it to a new date and time, re-validating availability and
 * conflicts server-side, excluding the appointment itself from the conflict
 * check so re-picking its current slot is not treated as a clash.
 *
 * Both verify the affected row rather than trusting a null error, because RLS
 * rejects a write by returning no row and no error.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = resolveCaller(request);

  if (caller instanceof NextResponse) return caller;

  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "Appointment not found.", code: "not_found" },
      { status: 404 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A request body is required.", code: "invalid_body" },
      { status: 400 }
    );
  }

  const input = (body ?? {}) as Record<string, unknown>;
  const action = input.action;

  if (action === "cancel") {
    const result = await cancelAppointment(caller.supabase, id);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.status }
      );
    }

    return NextResponse.json({ appointment: result.appointment });
  }

  if (action === "reschedule") {
    // doctorId is taken from the stored row, so a reschedule cannot be aimed at
    // a different doctor; only the date, time and notes are client-supplied.
    const { date, time, notes } = input as {
      date?: unknown;
      time?: unknown;
      notes?: unknown;
    };

    const result = await rescheduleAppointment(caller.supabase, id, {
      date: typeof date === "string" ? date : "",
      time: typeof time === "string" ? time : "",
      notes: typeof notes === "string" ? notes : null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.status }
      );
    }

    return NextResponse.json({ appointment: result.appointment });
  }

  if (action === "set_status") {
    // Status transitions belong to the doctor or the appointment lifecycle, not
    // to a patient-supplied string. Only the values the schema allows are
    // accepted, and the decisions that represent the doctor acting on a booking
    // - approving it with 'confirmed', closing it with 'completed' - are the
    // doctor's alone. A patient must not be able to approve their own request.
    const next = typeof input.status === "string" ? input.status : "";
    const allowed = ["pending", "confirmed", "cancelled", "completed"];
    const doctorOnly: string[] = ["confirmed", "completed"];

    if (!allowed.includes(next)) {
      return NextResponse.json(
        { error: "That status is not valid.", code: "invalid_status" },
        { status: 400 }
      );
    }

    const { data: current, error: readError } = await caller.supabase
      .from("appointments")
      .select("doctor_id, status")
      .eq("id", id)
      .maybeSingle();

    if (readError) {
      return NextResponse.json(
        { error: readError.message, code: "upstream" },
        { status: 502 }
      );
    }

    if (!current) {
      return NextResponse.json(
        { error: "Appointment not found.", code: "not_found" },
        { status: 404 }
      );
    }

    const existing = current as { doctor_id: string | null; status: string };

    if (doctorOnly.includes(next) && existing.doctor_id !== caller.userId) {
      return NextResponse.json(
        {
          error:
            next === "confirmed"
              ? "Only the doctor can approve an appointment."
              : "Only the doctor can mark an appointment as completed.",
          code: "forbidden",
        },
        { status: 403 }
      );
    }

    const { data, error } = await caller.supabase
      .from("appointments")
      .update({ status: next })
      .eq("id", id)
      .select(DETAIL_COLUMNS)
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "That change conflicts with an existing booking.",
            code: "slot_taken",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message, code: "upstream" },
        { status: 502 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "The status change was not saved. Please try again.", code: "conflict" },
        { status: 403 }
      );
    }

    return NextResponse.json({ appointment: data, previousStatus: existing.status });
  }

  return NextResponse.json(
    {
      error: 'action must be one of "cancel", "reschedule", "set_status".',
      code: "invalid_action",
    },
    { status: 400 }
  );
}
