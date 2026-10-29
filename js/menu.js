import { DEFAULT_CATEGORIES } from "./config.js";
import { getSupabase, formatSupabaseError, getSupabaseError } from "./supabase.js";
import { addToCart, formatPeso } from "./cart.js";
import { escapeHtml, imageOrPlaceholder, setNotice } from "./app.js";

export async function fetchMenu(menuType) {
  const client = getSupabase();
  if (!client) {
    return {
      categories: DEFAULT_CATEGORIES.filter((c) => c.menu_type === menuType),
      items: [],
      error: getSupabaseError() || "Menu data is stored in Supabase. Connect the project to load items.",
      source: "local",
    };
  }

  const [{ data: categories, error: catError }, { data: items, error: itemError }] = await Promise.all([
    client.from("categories").select("*").eq("menu_type", menuType).order("sort_order"),
    client.from("menu_items").select("*").eq("menu_type", menuType).order("sort_order").order("name"),
  ]);

  if (catError || itemError) {
    return {
      categories: [],
      items: [],
      error: formatSupabaseError(catError || itemError, "Unable to load menu. Please try again."),
      source: "supabase",
    };
  }

  return {
    categories: categories || [],
    items: items || [],
    error: null,
    source: "supabase",
  };
}

function familyKey(item) {
  const name = String(item.name || "");
  if (name.includes(" — ")) return name.split(" — ")[0].trim();
  if (/nachos/i.test(name)) return "Nachos";
  if (/burger/i.test(name)) return "Burger";
  if (/sandwich/i.test(name)) return "Sandwich";
  if (/pancit/i.test(name)) return "Pancit";
  if (/bottled water/i.test(name)) return "Bottled Water";
  if (/iced tea/i.test(name)) return "Iced Tea";
  if (/^coke/i.test(name)) return "Coke";
  if (/^sprite/i.test(name)) return "Sprite";
  if (/^royal/i.test(name)) return "Royal";
  if (/mountain dew/i.test(name)) return "Mountain Dew";
  return null;
}

function flavorLabel(item, family) {
  const name = String(item.name || "");
  if (name.includes(" — ")) return name.split(" — ").slice(1).join(" — ").trim();
  return name.replace(new RegExp(family, "i"), "").replace(/^[\s\-–]+/, "").trim() || name;
}

function groupItems(items) {
  const groups = [];
  const index = new Map();
  items.forEach((item) => {
    const key = familyKey(item);
    if (!key) {
      groups.push({ type: "single", item });
      return;
    }
    const mapKey = `${item.category_id || "none"}:${key}`;
    if (!index.has(mapKey)) {
      const group = { type: "group", key, items: [] };
      index.set(mapKey, group);
      groups.push(group);
    }
    index.get(mapKey).items.push(item);
  });
  return groups.map((group) => (group.type === "group" && group.items.length === 1 ? { type: "single", item: group.items[0] } : group));
}

function priceLabel(items) {
  const prices = items.map((item) => Number(item.price)).filter((price) => !Number.isNaN(price));
  if (!prices.length) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatPeso(min) : `${formatPeso(min)} – ${formatPeso(max)}`;
}

function renderSingleCard(item) {
  const available = item.available !== false;
  return `
    <article class="menu-card ${available ? "" : "is-unavailable"}">
      <div class="single-card">
        <div class="menu-card-media">${imageOrPlaceholder(item.image_url, item.name)}</div>
        <div class="menu-card-body">
          <div class="menu-card-top">
            <h3>${escapeHtml(item.name)}</h3>
            <p class="price">${formatPeso(item.price)}</p>
          </div>
          <p class="muted">${escapeHtml(item.description || "")}</p>
          <div class="menu-card-actions">
            <span class="pill ${available ? "pill-ok" : "pill-off"}">${available ? "Available" : "Unavailable"}</span>
            <button class="btn btn-small" type="button" data-add-item="${escapeHtml(item.id)}" ${available ? "" : "disabled"}>Add</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderGroupCard(group) {
  const first = group.items[0];
  const available = group.items.some((item) => item.available !== false);
  const options = group.items
    .map((item) => {
      const canAdd = item.available !== false;
      return `
        <div class="flavor-row">
          <div>
            <strong>${escapeHtml(flavorLabel(item, group.key))}</strong>
            <span>${formatPeso(item.price)}</span>
          </div>
          <button class="btn btn-small" type="button" data-add-item="${escapeHtml(item.id)}" ${canAdd ? "" : "disabled"}>${canAdd ? "Add" : "Unavailable"}</button>
        </div>
      `;
    })
    .join("");
  return `
    <article class="menu-card menu-card-group ${available ? "" : "is-unavailable"}">
      <button class="flavor-toggle" type="button" data-flavor-toggle aria-expanded="false">
        <div class="menu-card-media">${imageOrPlaceholder(first.image_url, group.key)}</div>
        <div class="menu-card-body">
          <div class="menu-card-top">
            <h3>${escapeHtml(group.key)}</h3>
            <p class="price">${priceLabel(group.items)}</p>
          </div>
          <p class="muted">${group.items.length} options. Tap to choose.</p>
        </div>
      </button>
      <div class="flavor-panel" hidden>
        ${options}
      </div>
    </article>
  `;
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

export function bindAddButtons(items) {
  document.querySelectorAll("[data-add-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = items.find((row) => String(row.id) === String(button.dataset.addItem));
      if (!item || item.available === false) return;
      addToCart(item, 1);
      showToast(`${item.name} added to order`);
    });
  });
}

export async function initMenuPage(menuType) {
  const grid = document.querySelector("[data-menu-grid]");
  const filters = document.querySelector("[data-menu-filters]");
  const notice = document.querySelector("[data-menu-notice]");
  const count = document.querySelector("[data-menu-count]");

  if (grid) {
    grid.innerHTML = `<div class="state">Loading menu...</div>`;
  }

  const result = await fetchMenu(menuType);

  if (result.error && result.items.length === 0) {
    setNotice(notice, "error", result.error);
    if (grid) {
      grid.innerHTML = `<div class="state state-error">
        <strong>Unable to load menu.</strong>
        <p>${escapeHtml(result.error)}</p>
        <button class="btn btn-ghost" type="button" onclick="location.reload()">Try again</button>
      </div>`;
    }
    return result;
  }

  if (result.error) setNotice(notice, "warn", result.error);
  else setNotice(notice, "", "");

  const categories = result.categories;
  if (filters) {
    const buttons = [`<button class="chip is-active" type="button" data-filter="all">All</button>`]
      .concat(
        categories.map(
          (cat) =>
            `<button class="chip" type="button" data-filter="${escapeHtml(cat.id)}">${escapeHtml(cat.name)}</button>`
        )
      )
      .join("");
    filters.innerHTML = buttons;
  }

  const paint = (categoryId = "all") => {
    const categoriesToShow = categories.filter((cat) => categoryId === "all" || String(cat.id) === String(categoryId));
    const visible = result.items.filter((item) => categoryId === "all" || String(item.category_id) === String(categoryId));
    if (count) count.textContent = `${visible.length} item${visible.length === 1 ? "" : "s"}`;
    if (!grid) return;
    if (visible.length === 0) {
      grid.innerHTML = `<div class="state">
        <strong>No menu items available.</strong>
        <p>Items added in the admin dashboard will show up here.</p>
      </div>`;
      return;
    }
    grid.innerHTML = categoriesToShow
      .map((cat) => {
        const items = result.items.filter((item) => String(item.category_id) === String(cat.id));
        if (!items.length) return "";
        const cards = groupItems(items)
          .map((group) => (group.type === "group" ? renderGroupCard(group) : renderSingleCard(group.item)))
          .join("");
        return `
          <section class="menu-section" id="section-${escapeHtml(cat.slug || cat.id)}">
            <div class="menu-section-head">
              <h2>${escapeHtml(cat.name)}</h2>
              <span>${items.length} item${items.length === 1 ? "" : "s"}</span>
            </div>
            <div class="menu-grid">${cards}</div>
          </section>
        `;
      })
      .join("");
    bindAddButtons(visible);
  };

  paint("all");

  filters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    filters.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    paint(button.dataset.filter);
    const section = grid.querySelector(".menu-section");
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  grid?.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-flavor-toggle]");
    if (!toggle) return;
    const panel = toggle.parentElement.querySelector(".flavor-panel");
    if (!panel) return;
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  return result;
}

const page = document.body?.dataset.page;
if (page === "menu") {
  document.addEventListener("DOMContentLoaded", () => {
    initMenuPage("restaurant").catch((error) => {
      console.error(error);
      const grid = document.querySelector("[data-menu-grid]");
      if (grid) grid.innerHTML = `<div class="state state-error">Unable to load menu. Please try again.</div>`;
    });
  });
}
