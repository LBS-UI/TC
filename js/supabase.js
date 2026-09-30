import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured
} from "./config.js";

let client = null;
let initError = "";

function loadSupabaseSdk() {
  if (
    window.supabase &&
    typeof window.supabase.createClient === "function"
  ) {
    return window.supabase;
  }

  return null;
}

export function getSupabaseError() {
  return initError;
}

export function getSupabase() {
  if (client) return client;

  if (!isSupabaseConfigured()) {
    initError =
      "Supabase is not configured yet. Add your project URL and anon key in js/config.js.";
    return null;
  }

  const sdk = loadSupabaseSdk();

  if (!sdk) {
    initError =
      "Supabase library failed to load. Check your internet connection and refresh.";
    return null;
  }

  try {
    client = sdk.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );

    initError = "";
    return client;
  } catch (error) {
    initError = error?.message || "Could not start Supabase.";
    client = null;
    return null;
  }
}

export function formatSupabaseError(
  error,
  fallback = "Something went wrong."
) {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  return error.message || fallback;
}