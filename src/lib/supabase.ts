import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isValidSupabaseUrl =
  typeof supabaseUrl === "string" &&
  /^https?:\/\/.+/.test(supabaseUrl);

const hasValidSupabaseKey =
  typeof supabaseAnonKey === "string" &&
  supabaseAnonKey.trim() !== "" &&
  supabaseAnonKey !== "YOUR_ANON_KEY";

export const isSupabaseConfigured =
  isValidSupabaseUrl && hasValidSupabaseKey;

export const supabase = isSupabaseConfigured
  ? createClient(
      supabaseUrl!,
      supabaseAnonKey!
    )
  : null;