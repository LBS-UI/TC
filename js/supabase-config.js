/* ===================================================================
   TAMBAYAN CAWAG — SUPABASE CONFIGURATION
   -------------------------------------------------------------------
   >>> THIS IS THE ONLY FILE WHERE YOU PASTE YOUR SUPABASE CREDENTIALS. <<<

   HOW TO SET THIS UP (see SUPABASE_SETUP.md for the full walkthrough):
   1. Go to https://supabase.com/dashboard and create a project.
   2. Run supabase/schema.sql in the SQL Editor to create every table,
      function, and security policy this site needs.
   3. Go to Project Settings -> API and copy the Project URL and the
      anon/public key into SUPABASE_URL / SUPABASE_ANON_KEY below.

   The anon/public key is NOT secret — it's designed to ship to the
   browser, the same way a Firebase apiKey is. Real security comes
   from Postgres Row Level Security policies (supabase/schema.sql),
   not from hiding this key. NEVER put your Supabase **service_role**
   key anywhere in this project — that key bypasses every RLS policy
   and belongs only on a trusted server, never in frontend code.

   >>> IMPORTANT — THIS PROJECT DOES NOT USE NPM. <<<
   Every file in this project imports the Supabase client from the
   CDN (https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm),
   the same way this file does below. Do not change this file (or any
   other) to:
     import { createClient } from "@supabase/supabase-js";
   That's the npm package specifier — it only resolves inside a
   bundler (Vite/Webpack/Node), and a plain browser loading this file
   via `python3 -m http.server` (or any static host) cannot resolve
   it, which breaks Supabase initialization silently. Always use the
   full https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm URL
   form shown below.
=================================================================== */

const SUPABASE_URL = "https://qtonbhzedwqgrcmfjbum.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0b25iaHplZHdxZ3JjbWZqYnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDA0MDcsImV4cCI6MjEwNTQ3NjQwN30.aPKOBgb97ux94Xx4SLnUl5VAiu3SoLkRNnfaqDdwpTQ";

/* Detects whether the placeholders above have been replaced yet, so
   the rest of the app can distinguish "nobody has configured this
   site yet" from "it's configured but currently unreachable" and
   show the right message for each, instead of a cryptic SDK error. */
function isSupabaseConfigured(url, key) {
  return typeof url === "string" && url.length > 0 && !url.startsWith("YOUR_") &&
    typeof key === "string" && key.length > 0 && !key.startsWith("YOUR_");
}

const SUPABASE_CONFIG_PROVIDED = isSupabaseConfigured(SUPABASE_URL, SUPABASE_ANON_KEY);

let supabase = null;
let initError = null;

if (SUPABASE_CONFIG_PROVIDED) {
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    initError = err;
    console.error("Supabase failed to initialize:", err);
  }
} else {
  console.warn(
    "Tambayan Cawag: Supabase is not configured yet. Edit js/supabase-config.js with your project's URL and anon key. " +
    "See SUPABASE_SETUP.md for step-by-step instructions."
  );
}

// SUPABASE_READY means "fully initialized and safe to use" — true only
// when config was provided AND createClient() succeeded. Every other
// module in this project can trust this single flag rather than
// separately null-checking the client every time.
const SUPABASE_READY = SUPABASE_CONFIG_PROVIDED && !!supabase;

/* Shared, specific error message for every module to use when Supabase
   isn't usable — distinguishes "nobody has configured this site yet"
   from "it's configured but failed to initialize" (bad URL/key,
   network/firewall blocking the CDN or the Supabase project itself). */
function notReadyMessage() {
  if (!SUPABASE_CONFIG_PROVIDED) {
    return "This site hasn't been connected to Supabase yet. See SUPABASE_SETUP.md for setup steps.";
  }
  return "Supabase is configured but failed to initialize (" +
    (initError && initError.message ? initError.message : "unknown error") +
    "). Check your internet connection and the values in js/supabase-config.js.";
}

// Let non-module scripts (main.js, admin.js) detect configuration status
// without needing to become modules themselves.
window.TC_SUPABASE_READY = SUPABASE_READY;
window.TC_SUPABASE_CONFIG_PROVIDED = SUPABASE_CONFIG_PROVIDED;
window.TC_SUPABASE_INIT_ERROR = initError;
window.TC_SUPABASE_NOT_READY_MESSAGE = notReadyMessage();

export { supabase, SUPABASE_READY, SUPABASE_CONFIG_PROVIDED, initError, notReadyMessage };
