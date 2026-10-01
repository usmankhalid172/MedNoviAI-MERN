import { supabase } from "@/lib/supabase";

export interface DoctorProfileExtras {
  bio: string;
  experience_years: number | null;
  avatar_url: string | null;
}

/** Columns known to exist on public.doctors, used if the probe finds no rows. */
const FALLBACK_COLUMNS = ["id", "full_name", "avatar_url", "created_at"];
let cachedColumns: Set<string> | null = null;
const COLUMN_CACHE_KEY = "doctor_profile_columns";
const COLUMN_CACHE_TTL_MS = 5 * 60 * 1000;
const PROFILE_COLUMNS = ["bio", "experience_years"];

interface ColumnCache {
  columns: Set<string>;
  at: number;
}

function readColumnCache(): ColumnCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(COLUMN_CACHE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as
      | string[]
      | { columns?: string[]; at?: number };

    // The older cache format was a bare array with no timestamp, so it is
    // treated as expired and re-probed rather than trusted.
    if (Array.isArray(parsed)) {
      return { columns: new Set(parsed), at: 0 };
    }

    if (!Array.isArray(parsed.columns)) return null;

    return { columns: new Set(parsed.columns), at: parsed.at ?? 0 };
  } catch {
    return null;
  }
}

function writeColumnCache(columns: Set<string>): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      COLUMN_CACHE_KEY,
      JSON.stringify({ columns: [...columns], at: Date.now() })
    );
  } catch {
    // Storage may be unavailable; the in-memory cache still works.
  }
}

export function isMissingColumnError(message: string): boolean {
  return (
    message.includes("schema cache") ||
    message.includes("PGRST204") ||
    message.includes("42703") ||
    message.includes("column") ||
    message.includes("does not exist")
  );
}

export function isTransientError(err: unknown): boolean {
  const message =
    err instanceof Error ? err.message : String(err ?? "");

  if (/fetch failed|failed to fetch|networkerror|load failed/i.test(message)) {
    return true;
  }
  return /\b(408|425|429|500|502|503|504|520|521|522|523|524)\b/.test(message);
}

export async function withRetry<T>(
  run: () => PromiseLike<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run();
    } catch (err) {
      lastError = err;

      if (attempt === attempts - 1 || !isTransientError(err)) {
        throw err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, 400 * 2 ** attempt)
      );
    }
  }

  throw lastError;
}

export async function getDoctorColumns(): Promise<Set<string>> {
  if (cachedColumns) return cachedColumns;

  const fromCache = readColumnCache();

  if (fromCache) {
    const isFresh = Date.now() - fromCache.at < COLUMN_CACHE_TTL_MS;
    const hasProfileColumns = PROFILE_COLUMNS.every((column) =>
      fromCache.columns.has(column)
    );

    // A cache written before the profile migration was applied is missing
    // bio/experience_years. Trusting it kept every save on the auth-metadata
    // fallback for the whole browser session, long after the columns existed,
    // so an entry without them is always re-probed.
    if (isFresh && hasProfileColumns) {
      cachedColumns = fromCache.columns;
      return cachedColumns;
    }
  }

  let result: Set<string>;

  try {
    const { data, error } = await withRetry(() =>
      supabase!.from("doctors").select("*").limit(1)
    );

    if (error) {
      throw error;
    }

    const row = (data ?? [])[0] as Record<string, unknown> | undefined;
    const keys = row ? Object.keys(row) : [];

    result = new Set(keys.length > 0 ? keys : FALLBACK_COLUMNS);
  } catch {
    result = new Set(["id", "full_name"]);
  }

  cachedColumns = result;
  writeColumnCache(result);
  return cachedColumns;
}

export async function tableCanStoreProfile(): Promise<boolean> {
  try {
    const columns = await getDoctorColumns();
    return columns.has("bio") && columns.has("experience_years");
  } catch {
    return false;
  }
}

function filterToColumns(
  values: Record<string, unknown>,
  columns: Set<string>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(values)) {
    if (columns.has(key)) {
      row[key] = value;
    }
  }

  return row;
}

export type SaveDoctorProfileResult =
  /** The row exists in public.doctors and was written. */
  | { status: "saved" }
  /**
   * The table cannot hold this data right now. `reason` carries the underlying
   * PostgREST/RLS message so the failure can be diagnosed instead of guessed at.
   */
  | { status: "unavailable"; reason: string };

function describePostgrestError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);

  return message || "unknown error";
}

/**
 * PostgREST resolves with `{ error }` rather than rejecting, so a plain
 * `withRetry` around the builder only ever retries hard network failures. This
 * retries the returned error too when it looks transient.
 */
async function writeWithRetry<T>(
  run: () => PromiseLike<{ data: T; error: unknown }>
): Promise<{ data: T; error: unknown }> {
  let last: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await run();

      if (!result.error) return result;
      if (!isTransientError(result.error)) return result;

      last = result.error;
    } catch (err) {
      if (!isTransientError(err)) throw err;
      last = err;
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
    }
  }

  return { data: null as T, error: last };
}

export async function saveDoctorProfile(
  id: string,
  values: Record<string, unknown>
): Promise<SaveDoctorProfileResult> {
  const columns = await getDoctorColumns();

  const row = filterToColumns({ id, ...values }, columns);

  // Nothing writable beyond the key itself - do not send an empty upsert.
  if (Object.keys(row).length <= 1) {
    return {
      status: "unavailable",
      reason:
        "public.doctors has none of the profile columns. Apply the doctor " +
        "profile migration.",
    };
  }

  // `upsert({ onConflict: "id" })` needs a unique index on `id`, which only the
  // migration creates. Update-then-insert gets the same result with no such
  // dependency, so a half-applied migration cannot break the write.
  const { data: updated, error: updateError } = await writeWithRetry(() =>
    supabase!.from("doctors").update(row).eq("id", id).select("id")
  );

  if (updateError) {
    return { status: "unavailable", reason: describePostgrestError(updateError) };
  }

  if (updated && updated.length > 0) {
    return { status: "saved" };
  }

  const { data: inserted, error: insertError } = await writeWithRetry(() =>
    supabase!.from("doctors").insert(row).select("id")
  );

  if (insertError) {
    return { status: "unavailable", reason: describePostgrestError(insertError) };
  }

  // RLS rejects the write without raising an error, so no returned row means
  // nothing was persisted.
  if (inserted && inserted.length > 0) {
    return { status: "saved" };
  }

  return {
    status: "unavailable",
    reason:
      "Row-level security rejected the write (no rows returned). Apply the " +
      "doctor profile migration to create doctors_insert_own / doctors_update_own.",
  };
}

/**
 * Guarantees a `public.doctors` row exists for `id`.
 *
 * A newly registered doctor has an auth account but no table row, so the public
 * profile page (`/doctors/[id]`) has nothing to read and reports "not found"
 * until something writes that row. Without this the row only appeared as a side
 * effect of manually pressing Save, which is invisible to the user and easy to
 * miss. Provisioning on dashboard load makes the profile self-healing.
 *
 * Safe to call repeatedly: it reads before it writes and treats the
 * duplicate-key race (two tabs loading at once) as success.
 */
export async function ensureDoctorRow(
  id: string,
  defaults: Record<string, unknown> = {}
): Promise<SaveDoctorProfileResult> {
  const columns = await getDoctorColumns();

  if (!PROFILE_COLUMNS.every((column) => columns.has(column))) {
    return {
      status: "unavailable",
      reason:
        "public.doctors is missing bio/experience_years, so no row can be " +
        "created. Apply the doctor profile migration.",
    };
  }

  const row = filterToColumns({ id, ...defaults }, columns);

  if (Object.keys(row).length <= 1) {
    return {
      status: "unavailable",
      reason: "public.doctors exposes no writable profile columns.",
    };
  }

  const { data: existing, error: readError } = await withRetry(() =>
    supabase!.from("doctors").select("id").eq("id", id).maybeSingle()
  );

  if (readError) {
    return { status: "unavailable", reason: describePostgrestError(readError) };
  }

  if (existing) {
    return { status: "saved" };
  }

  const { data: inserted, error: insertError } = await writeWithRetry(() =>
    supabase!.from("doctors").insert(row).select("id")
  );

  if (insertError) {
    const reason = describePostgrestError(insertError);

    // Another tab provisioned the row between our read and write. That is the
    // outcome we wanted, so report success rather than a failure.
    if (/duplicate key|already exists/i.test(reason)) {
      return { status: "saved" };
    }

    return { status: "unavailable", reason };
  }

  if (inserted && inserted.length > 0) {
    return { status: "saved" };
  }

  return {
    status: "unavailable",
    reason:
      "Row-level security rejected the insert (no rows returned). Apply the " +
      "doctor profile migration to create doctors_insert_own.",
  };
}

/**
 * Ceiling for the whole `updateUser` body. GoTrue sits behind the Supabase API
 * gateway, and the gateway rejects an oversized `PUT /auth/v1/user` with a bare
 * `500` that carries no CORS headers. The browser then reports
 * "blocked by CORS policy" and the real cause is invisible, so the payload is
 * measured here instead of being allowed to fail opaquely.
 */
const MAX_METADATA_PAYLOAD_BYTES = 100 * 1024;

/**
 * Node rejects a request once its headers pass ~16 KB, and the Supabase access
 * token is sent as one. GoTrue signs `user_metadata` straight into that token,
 * so a few kilobytes of stored metadata can push it over the limit and break
 * every authenticated request. Stay clear of the ceiling.
 */
export const MAX_ACCESS_TOKEN_LENGTH = 12 * 1024;

/**
 * Fallback storage that needs no table, column or RLS policy: the signed-in
 * user can always update their own auth metadata.
 */
/**
 * Decodes a JWT payload without verifying it. Safe here: the values are only
 * read back to be re-sent, and Supabase still authorises the write.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split(".")[1];

    if (!segment) return null;

    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Removes an inline image that a previous version of this app stored in
 * `user_metadata`, which is what inflated the access token.
 *
 * This calls GoTrue directly rather than going through the app's own route
 * handler, because the whole point is that the token is already too big for
 * Node's 16 KB header limit. The Supabase auth edge accepts a much larger
 * header, so the cleanup can still get through.
 *
 * Returns false when the token is too large even for that, which is the one
 * case that genuinely needs the Supabase dashboard.
 */
export async function repairOversizedProfileMetadata(): Promise<boolean> {
  const { data: sessionData } = await supabase!.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) return false;

  // Measured against the auth edge, which rejects an oversized Authorization
  // header with a 5xx that carries no CORS headers.
  if (accessToken.length > 40 * 1024) return false;

  const payload = decodeJwtPayload(accessToken);
  const metadata = (payload?.user_metadata ?? {}) as Record<string, unknown>;
  const current = (metadata.doctor_profile ?? {}) as Record<string, unknown>;

  // GoTrue merges `data` into user_metadata. The key is set to an explicit null
  // rather than omitted, so the image is dropped whether the merge is shallow
  // or deep. Any other oversized top-level key is cleared the same way, since
  // the token is signed from this object in full.
  const doctorProfile: Record<string, unknown> = {
    bio: typeof current.bio === "string" ? current.bio : "",
    experience_years:
      typeof current.experience_years === "number"
        ? current.experience_years
        : null,
    avatar_url: null,
  };

  const patch: Record<string, unknown> = { doctor_profile: doctorProfile };

  for (const [key, value] of Object.entries(metadata)) {
    if (key === "doctor_profile") continue;

    if (JSON.stringify(value ?? null).length > 1024) {
      patch[key] = null;
    }
  }

  const { error } = await supabase!.auth.updateUser({ data: patch });

  return !error;
}

export async function saveProfileToAuthMetadata(
  extras: DoctorProfileExtras
): Promise<void> {
  // Never put an inline image in auth metadata.
  //
  // GoTrue copies `user_metadata` into the signed access token, so a base64
  // picture stored here inflates the JWT itself. Once it passes ~16 KB every
  // authenticated request is rejected by the edge before it reaches GoTrue -
  // as a 431 here, and as a header-less 5xx that the browser misreports as
  // "blocked by CORS policy" when it goes cross-origin. The avatar belongs in
  // public.doctors.avatar_url, which the dashboard reads directly.
  const scalars: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(extras)) {
    if (key === "avatar_url") continue;
    if (typeof value === "string" && value.startsWith("data:")) continue;

    scalars[key] = value;
  }

  const body = JSON.stringify({ data: { doctor_profile: scalars } });
  const bytes = new TextEncoder().encode(body).length;

  if (bytes > MAX_METADATA_PAYLOAD_BYTES) {
    throw new Error(
      `Profile data is too large to save (${Math.round(bytes / 1024)} KB). ` +
        "Please shorten the bio."
    );
  }

  const { data: sessionData, error: sessionError } =
    await supabase!.auth.getSession();

  if (sessionError || !sessionData.session?.access_token) {
    throw new Error(
      "Your session has expired. Please sign in again to save your profile."
    );
  }

  // A token this large means a previous save left an image in user_metadata.
  // Repair it in place rather than stranding the account: GoTrue merges the
  // top-level keys of `data`, so re-sending `doctor_profile` without
  // `avatar_url` drops the image while keeping the text fields.
  if (sessionData.session.access_token.length > MAX_ACCESS_TOKEN_LENGTH) {
    const repaired = await repairOversizedProfileMetadata();

    if (repaired) {
      throw new Error(
        "Your profile picture was stored inside your account data and made " +
          "your sign-in token too large. It has now been removed from your " +
          "account - please sign out and sign back in, then save again."
      );
    }

    throw new Error(
      "Your saved profile is holding an image inside your account data, which " +
        "has made your sign-in token too large to reach the server at all. " +
        "Open Supabase > Authentication > Users, edit your account metadata " +
        "and delete the doctor_profile.avatar_url value, then sign out and " +
        "sign back in."
    );
  }

  let lastMessage = "Failed to save profile.";

  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;

    try {
      response = await fetch("/api/doctor-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body,
      });
    } catch {
      if (attempt === 2) {
        throw new Error(
          "Could not reach the server. Check your connection and try again."
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
      continue;
    }

    if (response.ok) return;

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    lastMessage = payload?.error ?? `Save failed (${response.status}).`;

    const transient = [408, 425, 429, 500, 502, 503, 504].includes(
      response.status
    );

    if (!transient || attempt === 2) {
      throw new Error(lastMessage);
    }

    await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
  }

  throw new Error(lastMessage);
}

export function readProfileFromAuthMetadata(
  userMetadata: Record<string, unknown> | undefined | null
): DoctorProfileExtras {
  const raw = userMetadata?.doctor_profile as
    | Partial<DoctorProfileExtras>
    | undefined;

  return {
    bio: typeof raw?.bio === "string" ? raw.bio : "",
    experience_years:
      typeof raw?.experience_years === "number"
        ? raw.experience_years
        : null,
    avatar_url:
      typeof raw?.avatar_url === "string" ? raw.avatar_url : null,
  };
}
