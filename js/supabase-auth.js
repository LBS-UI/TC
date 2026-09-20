/* ===================================================================
   TAMBAYAN CAWAG — SUPABASE AUTH MODULE
   -------------------------------------------------------------------
   Gates the admin dashboard behind real Supabase Authentication
   (email/password) rather than a hidden URL or a hard-coded password.

   AUTHORIZATION: signing in proves *who* someone is; it doesn't by
   itself prove they're allowed to see restaurant orders. This module
   also checks the `admins` table (admins.user_id = the signed-in
   user's id) and only treats the session as "authorized admin" if a
   matching row exists with role = 'admin'. Row Level Security
   (supabase/schema.sql) enforces the same check server-side for every
   admin-only table/function, so this client-side check is a UX
   convenience, not the actual security boundary.

   Implements the exact same window.TCAuth interface the rest of this
   project already calls (signIn, signOutAdmin, onAuthChange).
=================================================================== */

import { supabase, SUPABASE_READY, notReadyMessage } from "./supabase-config.js";

async function isAllowlistedAdmin(userId) {
  if (!supabase || !userId) return false;
  try {
    const { data, error } = await supabase
      .from("admins")
      .select("user_id, role")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("admins allowlist check failed:", error);
      return false;
    }
    return !!data && data.role === "admin";
  } catch (e) {
    console.error("admins allowlist check failed:", e);
    return false;
  }
}

async function signIn(email, password) {
  if (!SUPABASE_READY) {
    throw new Error(notReadyMessage());
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message || "Sign-in failed. Please check your email and password.");
  }
  const isAdmin = await isAllowlistedAdmin(data.user.id);
  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error("This account is signed in but is not authorized as an admin. Ask an existing admin to add your account.");
  }
  return data.user;
}

async function signOutAdmin() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** onChange(user|null, isAdmin) fires on sign-in, sign-out, and page load. */
function onAuthChange(onChange) {
  if (!SUPABASE_READY) {
    onChange(null, false);
    return () => {};
  }

  // onAuthStateChange fires immediately with whatever session already
  // exists (e.g. a page reload while still signed in) as well as on
  // every subsequent sign-in/sign-out — one listener covers both cases.
  const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = session ? session.user : null;
    if (!user) return onChange(null, false);
    const isAdmin = await isAllowlistedAdmin(user.id);
    onChange(user, isAdmin);
  });

  return () => sub.subscription.unsubscribe();
}

const TCAuth = { signIn, signOutAdmin, onAuthChange };
window.TCAuth = TCAuth;
export default TCAuth;
