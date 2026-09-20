/* ===================================================================
   TAMBAYAN CAWAG — SUPABASE SETTINGS MODULE
   -------------------------------------------------------------------
   Tables: services (goto/cafe hours), settings (key/value: 'preorder'
   -> {lead_minutes}, 'restaurant' -> contact info).

   Implements the exact same window.TCSettings interface the rest of
   this project already calls (subscribeSettings, getCachedSchedule,
   getCachedLeadMinutes, getCachedRestaurantInfo, saveSchedule,
   saveLeadMinutes) — this is what let main.js, admin.js, schedule.js
   and reservation.js move from Firebase to Supabase with zero changes.

   DESIGN NOTE: existing site code reads hours/lead-time SYNCHRONOUSLY
   (operating-hour validation runs inline while the customer fills out
   the pre-order wizard). Supabase reads are asynchronous, so this
   module keeps a live in-memory cache, refreshed on load and again on
   every Realtime change, and exposes synchronous getCached...()
   functions for that existing code to read.
=================================================================== */

import { supabase, SUPABASE_READY, notReadyMessage } from "./supabase-config.js";

let cachedSchedule = window.DEFAULT_SERVICE_SCHEDULE;
let cachedLeadMinutes = window.DEFAULT_PREORDER_LEAD_MINUTES;
let cachedRestaurantInfo = window.DEFAULT_RESTAURANT_INFO;
let channelBound = false;
let dataListeners = [];

function notify() {
  dataListeners.forEach((cb) => {
    try { cb(); } catch (e) { console.error("TCSettings listener error:", e); }
  });
}

async function refreshFromServer(onError) {
  if (!SUPABASE_READY) return;
  try {
    const [servicesRes, settingsRes] = await Promise.all([
      supabase.from("services").select("*"),
      supabase.from("settings").select("*")
    ]);
    if (servicesRes.error) throw servicesRes.error;
    if (settingsRes.error) throw settingsRes.error;

    const nextSchedule = Object.assign({}, cachedSchedule);
    (servicesRes.data || []).forEach((row) => {
      nextSchedule[row.id] = { label: row.label, open: row.open_time, close: row.close_time };
    });
    cachedSchedule = nextSchedule;

    (settingsRes.data || []).forEach((row) => {
      if (row.key === "preorder" && row.value && typeof row.value.lead_minutes === "number") {
        cachedLeadMinutes = row.value.lead_minutes;
      }
      if (row.key === "restaurant" && row.value) {
        cachedRestaurantInfo = Object.assign({}, cachedRestaurantInfo, row.value);
      }
    });

    notify();
  } catch (err) {
    console.error("Failed to load settings from Supabase:", err);
    if (onError) onError(err);
  }
}

function bindRealtime(onError) {
  if (channelBound || !supabase) return;
  channelBound = true;

  supabase
    .channel("tc-settings-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "services" }, () => refreshFromServer(onError))
    .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => refreshFromServer(onError))
    .subscribe();
}

/**
 * Subscribe to live settings updates. Calls `onChange` once immediately
 * with whatever is cached, fetches the current values from Supabase,
 * then again every time a Realtime change comes in.
 */
function subscribeSettings(onChange, onError) {
  if (onChange) dataListeners.push(onChange);
  if (SUPABASE_READY) {
    bindRealtime(onError);
    refreshFromServer(onError);
  } else if (onError) {
    onError(new Error(notReadyMessage()));
  }
  if (onChange) onChange(); // fire once with current (possibly default) cache
}

function getCachedSchedule() { return cachedSchedule; }
function getCachedLeadMinutes() { return cachedLeadMinutes; }
function getCachedRestaurantInfo() { return cachedRestaurantInfo; }

async function saveSchedule(schedule) {
  if (!SUPABASE_READY) throw new Error(notReadyMessage());
  const rows = Object.keys(schedule).map((key) => ({
    id: key,
    label: schedule[key].label,
    open_time: schedule[key].open,
    close_time: schedule[key].close
  }));
  const { error } = await supabase.from("services").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

async function saveLeadMinutes(minutes) {
  if (!SUPABASE_READY) throw new Error(notReadyMessage());
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "preorder", value: { lead_minutes: Number(minutes) } }, { onConflict: "key" });
  if (error) throw error;
}

async function saveRestaurantInfo(info) {
  if (!SUPABASE_READY) throw new Error(notReadyMessage());
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "restaurant", value: info }, { onConflict: "key" });
  if (error) throw error;
}

/** One-off check used by the seed script to see whether settings already exist. */
async function settingsExist() {
  if (!SUPABASE_READY) return false;
  const { data, error } = await supabase.from("settings").select("key").eq("key", "restaurant").limit(1);
  if (error) return false;
  return !!(data && data.length);
}

const TCSettings = {
  subscribeSettings,
  getCachedSchedule,
  getCachedLeadMinutes,
  getCachedRestaurantInfo,
  saveSchedule,
  saveLeadMinutes,
  saveRestaurantInfo,
  settingsExist
};

window.TCSettings = TCSettings;
export default TCSettings;
