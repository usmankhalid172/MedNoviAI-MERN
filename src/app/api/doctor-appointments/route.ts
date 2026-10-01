import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const APPOINTMENT_COLUMNS =
  "id, patient_id, appointment_date, appointment_time, status";

/**
 * `patient_name` carries who booked, copied onto the appointment at booking time.
 *
 * It only exists once supabase/appointment_patient_name.sql has been applied, so
 * the GET below retries without it rather than selecting a column that would make
 * every request fail with PGRST204.
 */
const APPOINTMENT_COLUMNS_WITH_NAME = `${APPOINTMENT_COLUMNS}, patient_name`;

function errorIsMissingPatientName(error: {
  code?: string;
  message?: string;
}): boolean {
  const code = error.code ?? "";
  const message = error.message ?? "";

  return (
    code === "PGRST204" ||
    code === "42703" ||
    /could not find the 'patient_name' column|column patient_name/i.test(message)
  );
}

/**
 * Resolves a display name for each `appointments.patient_id`.
 *
 * `patient_id` is written as the caller's auth user id, but the profile rows in
 * `public.patients` do not all use that convention: some seed `patients.id` with
 * it, others carry it in `patients.user_id` while `id` holds a separate key.
 * Looking up only `patients.id` therefore missed every patient who has not been
 * migrated, and the dashboard fell back to the literal "Patient" for each row -
 * the doctor could not tell who had booked. Both columns are tried and the
 * result is keyed by `patient_id`, which is what the caller looks up.
 */
async function resolvePatientNames(
  supabase: SupabaseClient,
  patientIds: string[]
): Promise<Record<string, string>> {
  const namesByPatientId: Record<string, string> = {};

  if (patientIds.length === 0) return namesByPatientId;

  const { data: byUserId } = await supabase
    .from("patients")
    .select("user_id, full_name")
    .in("user_id", patientIds);

  for (const patient of
    (byUserId ?? []) as Array<{ user_id: string | null; full_name: string | null }>) {
    if (patient.user_id && patient.full_name) {
      namesByPatientId[patient.user_id] = patient.full_name;
    }
  }

  // Only the ids still unresolved need the second lookup, so the common case
  // costs one round trip instead of two.
  const missing = patientIds.filter((id) => !namesByPatientId[id]);

  if (missing.length > 0) {
    const { data: byId } = await supabase
      .from("patients")
      .select("id, full_name")
      .in("id", missing);

    for (const patient of
      (byId ?? []) as Array<{ id: string | null; full_name: string | null }>) {
      if (patient.id && patient.full_name) {
        namesByPatientId[patient.id] = patient.full_name;
      }
    }
  }

  return namesByPatientId;
}

/**
 * Same-origin read for the doctor appointment list.
 *
 * Queried straight from the browser, PostgREST sits behind Cloudflare and a
 * rejected request comes back with no `Access-Control-Allow-Origin`, so the
 * browser reports "blocked by CORS policy" and the real status is discarded.
 * Going through the app's own origin removes the CORS layer, and the upstream
 * error can be reported verbatim.
 *
 * The doctor id is read from the caller's own token rather than a query
 * parameter, so this can only ever return the caller's own appointments, and
 * row level security still applies on top.
 */
export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    return NextResponse.json(
      { error: "You must be signed in to view your appointments." },
      { status: 401 }
    );
  }

  let doctorId: string | undefined;

  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8")
    ) as { sub?: string };

    doctorId = payload.sub;
  } catch {
    doctorId = undefined;
  }

  if (!doctorId) {
    return NextResponse.json(
      { error: "Your session is not valid. Please sign in again." },
      { status: 401 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let lastStatus = 500;
  let lastMessage = "Could not load your appointment schedule.";

  // Dropped once the column is found to be absent, so the rest of the dashboard
  // keeps working on a database where the migration has not been applied.
  let wantsPatientName = true;

  for (let attempt = 0; attempt < 3; attempt++) {
    const columns = wantsPatientName
      ? APPOINTMENT_COLUMNS_WITH_NAME
      : APPOINTMENT_COLUMNS;

    const { data, error } = await supabase
      .from("appointments")
      .select(columns)
      .eq("doctor_id", doctorId)
      .order("appointment_date", { ascending: false });

    if (!error) {
      // Only rows without a stored name need the profile lookup, so once the
      // migration has been applied and every booking carries one, this costs no
      // extra round trips at all.
      //
      // The cast goes through `unknown` because the column list is now built at
      // runtime, which the generated PostgREST parser cannot resolve.
      const unresolvedIds = Array.from(
        new Set(
          ((data ?? []) as unknown as Array<{
            patient_id: string | null;
            patient_name?: string | null;
          }>)
            .filter((row) => !row.patient_name)
            .map((row) => row.patient_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      return NextResponse.json({
        rows: data ?? [],
        // The caller prefers the stored `patient_name` and uses this only for
        // bookings made before the column existed.
        namesByPatientId: await resolvePatientNames(supabase, unresolvedIds),
      });
    }

    // The column is absent, so drop it and retry immediately rather than
    // spending an attempt on a request that cannot succeed.
    if (wantsPatientName && errorIsMissingPatientName(error)) {
      wantsPatientName = false;
      continue;
    }

    // PostgrestError carries no HTTP status, so transience is read off the
    // message: a dropped connection and an edge fault are both worth retrying,
    // a rejected claim or a missing row is not.
    const message = error.message ?? "Could not load your appointment schedule.";

    const transient =
      /fetch failed|failed to fetch|networkerror|load failed/i.test(message) ||
      /\b(408|425|429|500|502|503|504|520|521|522|523|524)\b/.test(message);

    lastStatus = transient ? 503 : 500;
    lastMessage = message;

    if (!transient || attempt === 2) break;

    await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
  }

  return NextResponse.json({ error: lastMessage }, { status: lastStatus });
}
