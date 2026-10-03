import { DEFAULT_SETTINGS, isSupabaseConfigured } from "./config.js";
import { getSupabase, formatSupabaseError } from "./supabase.js";
import { initNavigation } from "./navigation.js";
import { bindCartBadge } from "./cart.js";
import { formatHoursLabel, getStatus } from "./schedule.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function settingsFromRows(rows) {
  const settings = { ...DEFAULT_SETTINGS };
  (rows || []).forEach((row) => {
    settings[row.key] = row.value;
  });
  return settings;
}

export async function loadSettings() {
  const client = getSupabase();
  if (!client) return { settings: { ...DEFAULT_SETTINGS }, source: "local", error: null };

  const { data, error } = await client.from("settings").select("key, value");
  if (error) {
    return {
      settings: { ...DEFAULT_SETTINGS },
      source: "local",
      error: formatSupabaseError(error, "Unable to load restaurant information."),
    };
  }
  return { settings: settingsFromRows(data), source: "supabase", error: null };
}

export function paintStatusChip(node, hours, timeZone) {
  if (!node || !hours) return;
  const status = getStatus(hours.open, hours.close, { timeZone });
  node.dataset.status = status.code;
  node.textContent = status.label;
}

export function bindStatusChips(settings) {
  const timeZone = settings.timezone || "Asia/Manila";
  document.querySelectorAll("[data-hours-label='restaurant']").forEach((node) => {
    node.textContent = formatHoursLabel(settings.restaurant_hours);
  });
  document.querySelectorAll("[data-hours-label='cafe']").forEach((node) => {
    node.textContent = formatHoursLabel(settings.cafe_hours);
  });
  document.querySelectorAll("[data-status='restaurant']").forEach((node) => {
    paintStatusChip(node, settings.restaurant_hours, timeZone);
  });
  document.querySelectorAll("[data-status='cafe']").forEach((node) => {
    paintStatusChip(node, settings.cafe_hours, timeZone);
  });
  document.querySelectorAll("[data-setting]").forEach((node) => {
    const key = node.dataset.setting;
    const value = settings[key];
    if (typeof value === "string") {
      if (node.dataset.settingHref === "true") {
        if (value) node.setAttribute("href", value);
        else node.hidden = true;
      } else if (node.tagName === "A" && (key === "phone" || key === "email")) {
        if (!value) {
          node.hidden = true;
        } else {
          node.hidden = false;
          node.textContent = value;
          node.href = key === "phone" ? `tel:${value}` : `mailto:${value}`;
        }
      } else {
        node.textContent = value;
      }
    }
  });
}

export function setNotice(container, type, message) {
  if (!container) return;
  if (!message) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }
  container.hidden = false;
  container.innerHTML = `<div class="notice notice-${type}">${escapeHtml(message)}</div>`;
}

function isAllowedImageUrl(url) {
  if (!url) return false;
  if (url.startsWith("assets/") || url.startsWith("./assets/") || url.startsWith("/assets/")) return true;
  if (!url.startsWith("https://")) return false;
  const blocked = ["google.com/imgres", "encrypted-tbn"];
  return !blocked.some((part) => url.includes(part));
}

export function imageOrPlaceholder(url, label) {
  const name = label || "Menu item";
  const safeLabel = escapeHtml(name);
  const fallback = `<div class="photo-fallback" role="img" aria-label="${safeLabel}">${escapeHtml(name.slice(0, 1))}</div>`;
  const src = String(url || "").trim();
  if (!isAllowedImageUrl(src)) return fallback;
  return `<img src="${escapeHtml(src)}" alt="${safeLabel}" width="640" height="480" loading="lazy" decoding="async" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'photo-fallback',role:'img',ariaLabel:this.alt,textContent:(this.alt||'T').slice(0,1)}))">`;
}

async function loadFeatured() {
  const wrap = document.querySelector("[data-featured-grid]");
  if (!wrap) return;
  const client = getSupabase();
  if (!client) return;
  wrap.innerHTML = `<div class="state">Loading featured items...</div>`;
  const { data, error } = await client
    .from("menu_items")
    .select("*")
    .eq("available", true)
    .eq("featured", true)
    .order("sort_order")
    .limit(6);
  if (error) {
    wrap.innerHTML = `<div class="state state-error">Unable to load featured items. Please try again.</div>`;
    return;
  }
  if (!data || data.length === 0) {
    return;
  }
  wrap.innerHTML = data
    .map(
      (item) => `
      <article class="feature-card panel">
        ${imageOrPlaceholder(item.image_url, item.name)}
        <div class="pad">
          <p class="kicker">${item.menu_type === "cafe" ? "Cafe" : "Restaurant"}</p>
          <h3>${escapeHtml(item.name)}</h3>
          <p class="muted">${escapeHtml(item.description || "")}</p>
        </div>
      </article>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  initNavigation();
  bindCartBadge();

  try {
    const { settings } = await loadSettings();
    bindStatusChips(settings);
    if (!isSupabaseConfigured()) {
      const banner = document.querySelector("[data-config-banner]");
      if (banner) {
        banner.hidden = false;
        banner.textContent = "Supabase is not connected yet. Hours and pages still work. Menu items will appear after you add the project keys and seed the database.";
      }
    }
  } catch (error) {
    console.warn("Settings failed to load", error);
    bindStatusChips(DEFAULT_SETTINGS);
  }

  try {
    await loadFeatured();
  } catch (error) {
    console.warn(error);
  }
});
