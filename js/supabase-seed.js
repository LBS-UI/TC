/* ===================================================================
   TAMBAYAN CAWAG — SUPABASE SEED SCRIPT
   -------------------------------------------------------------------
   Populates a freshly-created Supabase database with the restaurant's
   real menu, service hours, lead time, and contact info, using the
   same data that used to seed Firebase (js/menu-data.js).

   SAFE TO RUN MORE THAN ONCE: before writing anything, it checks
   whether the `categories` table already has rows. If it does,
   seeding is skipped so re-running this (e.g. accidentally clicking
   the admin "Seed Initial Data" button twice) never creates duplicate
   menu entries.

   Implements the exact same window.TCSeed interface the admin
   dashboard already calls (run()).
=================================================================== */

import { supabase, SUPABASE_READY, notReadyMessage } from "./supabase-config.js";

async function run() {
  if (!SUPABASE_READY) {
    return { ok: false, message: notReadyMessage() };
  }

  // Checked directly against Supabase (not window.TCMenu's cache) so
  // this works correctly regardless of module load order or whether
  // the live menu subscription has connected yet.
  const { data: existing, error: existingErr } = await supabase.from("categories").select("id").limit(1);
  if (existingErr) {
    return { ok: false, message: "Could not check existing menu data: " + existingErr.message };
  }
  if (existing && existing.length > 0) {
    return { ok: false, message: "Menu data already exists in Supabase — seeding skipped to avoid duplicates." };
  }

  const defaultMenu = window.DEFAULT_MENU || [];
  const categoryRows = [];
  const menuRows = [];

  defaultMenu.forEach((cat, catIndex) => {
    categoryRows.push({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      description: cat.description || "",
      service: cat.service,
      serving_note: cat.servingNote || null,
      add_ons: cat.addOns || [],
      sort_order: catIndex
    });

    cat.items.forEach((item, itemIndex) => {
      menuRows.push({
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: item.price,
        category: cat.id,
        image: item.image || "",
        available: item.available !== false,
        sort_order: itemIndex,
        bundle_contents: item.bundleContents || null,
        variants: item.variants || null
      });
    });
  });

  // categories first (menu.category has a foreign key to categories.id)
  const { error: catErr } = await supabase.from("categories").insert(categoryRows);
  if (catErr) {
    return { ok: false, message: "Failed to seed categories: " + catErr.message };
  }

  const { error: itemErr } = await supabase.from("menu").insert(menuRows);
  if (itemErr) {
    return { ok: false, message: "Failed to seed menu items: " + itemErr.message };
  }

  // Service hours
  const schedule = window.DEFAULT_SERVICE_SCHEDULE || {};
  const serviceRows = Object.keys(schedule).map((key) => ({
    id: key,
    label: schedule[key].label,
    open_time: schedule[key].open,
    close_time: schedule[key].close
  }));
  const { error: svcErr } = await supabase.from("services").upsert(serviceRows, { onConflict: "id" });
  if (svcErr) {
    return { ok: false, message: "Failed to seed service hours: " + svcErr.message };
  }

  // Pre-order lead time + restaurant contact info
  const { error: settingsErr } = await supabase.from("settings").upsert([
    { key: "preorder", value: { lead_minutes: window.DEFAULT_PREORDER_LEAD_MINUTES || 30 } },
    { key: "restaurant", value: window.DEFAULT_RESTAURANT_INFO || {} }
  ], { onConflict: "key" });
  if (settingsErr) {
    return { ok: false, message: "Failed to seed settings: " + settingsErr.message };
  }

  return {
    ok: true,
    message: `Seeded ${categoryRows.length} categories and ${menuRows.length} menu items, plus service hours, lead time, and restaurant info.`
  };
}

const TCSeed = { run };
window.TCSeed = TCSeed;
export default TCSeed;
