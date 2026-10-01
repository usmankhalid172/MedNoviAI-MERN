import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Matches the ceiling enforced client-side in saveProfileToAuthMetadata. */
const MAX_PAYLOAD_BYTES = 100 * 1024;

/**
 * Node rejects a request once its headers pass ~16 KB, and the caller's
 * Supabase access token arrives as the Authorization header. A token this large
 * means `user_metadata` still holds an image, because GoTrue signs that
 * metadata into the token. Reported explicitly so the cause is visible instead
 * of a bare 431.
 */
const MAX_ACCESS_TOKEN_LENGTH = 12 * 1024;

/**
 * Same-origin proxy for `PUT /auth/v1/user`.
 *
 * Writing `user_metadata` straight from the browser meant every failure came
 * back as "blocked by CORS policy": the Supabase edge answers a rejected request
 * with a bare 5xx that carries no `Access-Control-Allow-Origin`, and the browser
 * discards the body, so the real reason was never visible.
 *
 * Going through the app's own origin removes the CORS layer entirely and lets
 * this handler report the upstream status and message verbatim.
 */
export async function PUT(request: Request) {
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
      { error: "You must be signed in to update your profile." },
      { status: 401 }
    );
  }

  if (accessToken.length > MAX_ACCESS_TOKEN_LENGTH) {
    return NextResponse.json(
      {
        error:
          "Your account metadata is holding an image, which has made your " +
          "sign-in token too large. In Supabase > Authentication > Users, edit " +
          "your account metadata and delete the doctor_profile.avatar_url " +
          "value, then sign out and sign back in.",
      },
      { status: 413 }
    );
  }

  const raw = await request.text();

  // Checked here as well as on the client: an oversized body is what makes the
  // edge answer with a header-less 5xx, so it must never leave this process.
  if (new TextEncoder().encode(raw).length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { error: "Profile data is too large to save. Please use a smaller image." },
      { status: 413 }
    );
  }

  let doctorProfile: unknown;

  try {
    // The client sends the GoTrue body shape, `{ data: { doctor_profile } }`,
    // so that the same serialised string can be length-checked and then
    // forwarded upstream unchanged.
    doctorProfile = (
      JSON.parse(raw) as { data?: { doctor_profile?: unknown } }
    ).data?.doctor_profile;
  } catch {
    return NextResponse.json(
      { error: "Request body was not valid JSON." },
      { status: 400 }
    );
  }

  if (!doctorProfile || typeof doctorProfile !== "object") {
    return NextResponse.json(
      { error: "Missing doctor_profile in request body." },
      { status: 400 }
    );
  }

  // Defence in depth: GoTrue signs `user_metadata` into the access token, so an
  // inline image stored here would bloat the JWT and break every later
  // authenticated request. It is dropped here even if a caller sends one.
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(
    doctorProfile as Record<string, unknown>
  )) {
    if (key === "avatar_url") continue;
    if (typeof value === "string" && value.startsWith("data:")) continue;

    sanitized[key] = value;
  }

  const body = JSON.stringify({ data: { doctor_profile: sanitized } });

  // Calls GoTrue directly rather than through supabase-js: a client created
  // with persistSession:false has no stored session, so updateUser would fail
  // with "Auth session missing!" instead of using the caller's token.
  let lastStatus = 500;
  let lastMessage = "Failed to update profile.";

  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;

    try {
      response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body,
      });
    } catch {
      if (attempt === 2) {
        return NextResponse.json(
          {
            error:
              "Could not reach Supabase. Please check your connection and try again.",
          },
          { status: 502 }
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
      continue;
    }

    if (response.ok) {
      return NextResponse.json({ ok: true });
    }

    const text = await response.text();
    lastStatus = response.status;

    try {
      const parsed = JSON.parse(text) as {
        msg?: string;
        message?: string;
        error_description?: string;
      };

      lastMessage =
        parsed.msg ??
        parsed.message ??
        parsed.error_description ??
        `Save failed (${response.status}).`;
    } catch {
      // The edge answers some failures with an HTML error page, which is the
      // same response the browser used to hide behind "CORS policy".
      lastMessage =
        response.status >= 500
          ? "Supabase is temporarily unavailable. Please try again in a moment."
          : `Save failed (${response.status}).`;
    }

    const transient = [408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524].includes(
      response.status
    );

    if (!transient || attempt === 2) break;

    await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
  }

  return NextResponse.json({ error: lastMessage }, { status: lastStatus });
}

