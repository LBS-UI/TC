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

export function renderMenuCard(item, options = {}) {
  const available = item.available !== false;
  const image = imageOrPlaceholder(item.image_url, item.name);
  return `
    <article class="menu-card ${available ? "" : "is-unavailable"}" data-category="${escapeHtml(item.category_id || "")}">
      <div class="menu-card-media">${image}</div>
      <div class="menu-card-body">
        <div class="menu-card-top">
          <h3>${escapeHtml(item.name)}</h3>
          <p class="price">${formatPeso(item.price)}</p>
        </div>
        <p class="muted">${escapeHtml(item.description || "")}</p>
        <div class="menu-card-actions">
          <span class="pill ${available ? "pill-ok" : "pill-off"}">${available ? "Available" : "Unavailable"}</span>
          <button
            class="btn btn-small"
            type="button"
            data-add-item="${escapeHtml(item.id)}"
            ${available ? "" : "disabled"}
          >${options.addLabel || "Add to order"}</button>
        </div>
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
    grid.innerHTML = visible.map((item) => renderMenuCard(item)).join("");
    bindAddButtons(visible);
  };

  paint("all");

  filters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    filters.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    paint(button.dataset.filter);
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
