/* ===================================================================
   TAMBAYAN CAWAG — SUPABASE MENU MODULE
   -------------------------------------------------------------------
   Tables: categories (icon/service/add-ons/serving-note metadata),
   menu (individual items, each referencing a category by id).

   Implements the exact same window.TCMenu interface the rest of this
   project already calls (subscribeMenu, isMenuReady, findCachedItem,
   saveMenuItem, deleteMenuItem, setItemAvailability) — the public site
   doesn't care that this is two Postgres tables under the hood; it
   gets back the same array-of-categories-with-items shape it always
   has, kept live via Supabase Realtime and cached for the synchronous
   reads the UI needs (search/filter, cart line lookups, hour
   validation against cart contents).
=================================================================== */

import { supabase, SUPABASE_READY, notReadyMessage } from "./supabase-config.js";

let cachedMenu = [];
let categoriesLoaded = false;
let itemsLoaded = false;
let channelBound = false;
let dataListeners = [];
let errorListeners = [];

let rawCategoryRows = [];
let rawItemRows = [];

function notify() {
  dataListeners.forEach((cb) => {
    try { cb(cachedMenu); } catch (e) { console.error("TCMenu listener error:", e); }
  });
}
function notifyError(err) {
  errorListeners.forEach((cb) => {
    try { cb(err); } catch (e) { console.error("TCMenu error-listener error:", e); }
  });
}

function rebuildCache() {
  const catMap = new Map();
  rawCategoryRows
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach((cat) => {
      catMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        service: cat.service,
        icon: cat.icon || "\uD83C\uDF7D\uFE0F",
        description: cat.description || "",
        servingNote: cat.serving_note || null,
        addOns: cat.add_ons || [],
        items: []
      });
    });

  rawItemRows
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach((item) => {
      const cat = catMap.get(item.category);
      if (!cat) return; // orphaned item (category deleted) — skip rather than crash the menu
      cat.items.push({
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: Number(item.price),
        image: item.image || "",
        available: item.available !== false,
        bundleContents: item.bundle_contents || null,
        variants: item.variants || null
      });
    });

  cachedMenu = Array.from(catMap.values());
}

async function refreshFromServer(onError) {
  if (!SUPABASE_READY) return;
  try {
    const [catRes, itemRes] = await Promise.all([
      supabase.from("categories").select("*"),
      supabase.from("menu").select("*")
    ]);
    if (catRes.error) throw catRes.error;
    if (itemRes.error) throw itemRes.error;

    rawCategoryRows = catRes.data || [];
    rawItemRows = itemRes.data || [];
    categoriesLoaded = true;
    itemsLoaded = true;
    rebuildCache();
    notify();
  } catch (err) {
    console.error("Failed to load menu from Supabase:", err);
    if (onError) onError(err);
    notifyError(err);
  }
}

function bindRealtime(onError) {
  if (channelBound || !supabase) return;
  channelBound = true;

  supabase
    .channel("tc-menu-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => refreshFromServer(onError))
    .on("postgres_changes", { event: "*", schema: "public", table: "menu" }, () => refreshFromServer(onError))
    .subscribe();
}

/**
 * Subscribe to live menu updates. `onChange(menu)` fires once with
 * whatever is cached (possibly empty, before the first fetch
 * completes) and again on every Supabase change.
 */
function subscribeMenu(onChange, onError) {
  if (onChange) dataListeners.push(onChange);
  if (onError) errorListeners.push(onError);
  if (SUPABASE_READY) {
    bindRealtime(onError);
    refreshFromServer(onError);
  } else if (onError) {
    onError(new Error(notReadyMessage()));
  }
  if (onChange) onChange(cachedMenu);
}

function getCachedMenu() { return cachedMenu; }
function isMenuReady() { return categoriesLoaded && itemsLoaded; }

/** Find a single item + its parent category from the live cache, by item id. */
function findCachedItem(itemId) {
  for (const cat of cachedMenu) {
    const item = cat.items.find((i) => i.id === itemId);
    if (item) return { category: cat, item };
  }
  return null;
}

// ---------- Admin: menu management (writes go straight to Supabase) ----------

async function saveMenuItem(categoryId, itemId, fields) {
  if (!SUPABASE_READY) throw new Error(notReadyMessage());
  const payload = {
    id: itemId,
    name: fields.name,
    description: fields.description || "",
    price: Number(fields.price),
    category: categoryId,
    image: fields.image || "",
    available: fields.available !== false,
    sort_order: typeof fields.sortOrder === "number" ? fields.sortOrder : Date.now(),
    bundle_contents: fields.bundleContents || null,
    variants: fields.variants || null,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from("menu").upsert(payload, { onConflict: "id" });
  if (error) throw error;
}

async function deleteMenuItem(itemId) {
  if (!SUPABASE_READY) throw new Error(notReadyMessage());
  const { error } = await supabase.from("menu").delete().eq("id", itemId);
  if (error) throw error;
}

async function setItemAvailability(itemId, available) {
  if (!SUPABASE_READY) throw new Error(notReadyMessage());
  const { error } = await supabase
    .from("menu")
    .update({ available: !!available, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw error;
}

async function getCategoriesOnce() {
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase.from("categories").select("*");
  if (error) return [];
  return data || [];
}

async function menuExists() {
  if (!SUPABASE_READY) return false;
  const { data, error } = await supabase.from("categories").select("id").limit(1);
  if (error) return false;
  return !!(data && data.length);
}

const TCMenu = {
  subscribeMenu,
  getCachedMenu,
  isMenuReady,
  findCachedItem,
  saveMenuItem,
  deleteMenuItem,
  setItemAvailability,
  getCategoriesOnce,
  menuExists
};

window.TCMenu = TCMenu;
export default TCMenu;
