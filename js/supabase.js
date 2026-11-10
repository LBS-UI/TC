import { CONFIG, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

let client = null;
let initError = "";

function loadSupabaseSdk() {
  if (window.supabase && typeof window.supabase.createClient === "function") {
    return window.supabase;
  }
  return null;
}

function readConfig() {
  const url = String(CONFIG.supabaseUrl || SUPABASE_URL || "").trim();
  const key = String(CONFIG.supabaseAnonKey || SUPABASE_ANON_KEY || "").trim();
  return { url, key };
}

export function isSupabaseConfigured() {
  const { url, key } = readConfig();
  return url.startsWith("https://") && key.length > 20;
}

export function getSupabaseError() {
  return initError;
}

export function getSupabase() {
  if (client) return client;

  const { url, key } = readConfig();
  if (!url || !key) {
    initError = "Supabase is not configured yet. Add your project URL and anon key in js/config.js.";
    return null;
  }
  if (!url.startsWith("https://")) {
    initError = "The Supabase URL is not valid. It must start with https://.";
    return null;
  }

  const sdk = loadSupabaseSdk();
  if (!sdk) {
    initError = "Supabase library failed to load. Check your internet connection and refresh.";
    return null;
  }

  try {
    client = sdk.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    initError = "";
    return client;
  } catch (error) {
    initError = error?.message || "Could not start Supabase.";
    client = null;
    return null;
  }
}

export function formatSupabaseError(error, fallback = "Something went wrong.") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  return error.message || fallback;
}
