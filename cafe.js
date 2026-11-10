import { initMenuPage, fetchMenu } from "./menu.js";
import { escapeHtml, imageOrPlaceholder } from "./app.js";
import { addToCart, formatPeso } from "./cart.js";

const FALLBACK = [
  ["Iced Coffee", [["Iced Americano", [["Grande", 100], ["Venti", 130]]], ["Iced Cappuccino", [["Grande", 100], ["Venti", 130]]], ["Iced Spanish Latte", [["Grande", 100], ["Venti", 130]]], ["Iced Vanilla Latte", [["Grande", 100], ["Venti", 130]]], ["Iced Mocha Latte", [["Grande", 110], ["Venti", 140]]], ["Iced White Chocolate", [["Grande", 110], ["Venti", 140]]], ["Iced Dark Chocolate", [["Grande", 110], ["Venti", 140]]], ["Iced Caramel Macchiato", [["Grande", 110], ["Venti", 140]]], ["Iced Salted Caramel", [["Grande", 110], ["Venti", 140]]], ["Iced Strawberry Latte", [["Grande", 110], ["Venti", 140]]]]],
  ["Matcha Series", [["Iced Matcha Milk", [["Grande", 120], ["Venti", 150]]], ["Iced Dirty Matcha", [["Grande", 120], ["Venti", 150]]], ["Iced Oreo Matcha", [["Grande", 120], ["Venti", 150]]], ["Iced Choco Matcha", [["Grande", 120], ["Venti", 150]]], ["Iced Strawberry Matcha", [["Grande", 120], ["Venti", 150]]]]],
  ["Non-Coffee", [["Iced Dark Choco Milk", [["Grande", 100], ["Venti", 130]]], ["Iced White Choco Milk", [["Grande", 100], ["Venti", 130]]], ["Iced Cookies & Cream Milk", [["Grande", 110], ["Venti", 140]]], ["Iced Strawberry Milk", [["Grande", 110], ["Venti", 140]]], ["Iced Nutella Cookie Milk", [["Grande", 110], ["Venti", 140]]]]],
  ["Hot Coffee", [["Hot Americano", [["Short", 69], ["Tall", 89], ["Grande", 109]]], ["Hot Cappuccino", [["Short", 69], ["Tall", 89], ["Grande", 109]]], ["Hot Spanish Latte", [["Short", 69], ["Tall", 89], ["Grande", 109]]], ["Hot Cafe Latte", [["Short", 69], ["Tall", 89], ["Grande", 109]]]]],
  ["Hot Choco", [["Hot Choco", [["Short", 69], ["Tall", 89], ["Grande", 109]]], ["Hot Choco Milk", [["Short", 69], ["Tall", 89], ["Grande", 109]]]]],
  ["Frappuccino", [["Salted Caramel Frappe", [["Regular", 139]]], ["Oreo and Cream Frappe", [["Regular", 139]]], ["Java Chips Frappe", [["Regular", 139]]], ["Oreo Matcha Frappe", [["Regular", 139]]], ["Strawberry Frappe", [["Regular", 139]]], ["Matcha Frappe", [["Regular", 139]]]]],
  ["Shakes", [["Chocolate Shake", [["Grande", 55], ["Venti", 65]]], ["Cookies and Cream Shake", [["Grande", 55], ["Venti", 65]]], ["Strawberry Shake", [["Grande", 55], ["Venti", 65]]], ["Avocado Shake", [["Grande", 55], ["Venti", 65]]]]],
  ["Milk Tea", [["Pearl Black Milk Tea", [["Grande", 69], ["Venti", 79]]], ["Chocolate Milk Tea", [["Grande", 69], ["Venti", 79]]], ["Dark Chocolate Milk Tea", [["Grande", 69], ["Venti", 79]]], ["Cookies and Cream Milk Tea", [["Grande", 69], ["Venti", 79]]], ["Wintermelon Milk Tea", [["Grande", 69], ["Venti", 79]]], ["Strawberry Milk Tea", [["Grande", 69], ["Venti", 79]]], ["Salted Caramel Milk Tea", [["Grande", 69], ["Venti", 79]]], ["Matcha Milk Tea", [["Grande", 69], ["Venti", 79]]], ["Okinawa Milk Tea", [["Grande", 69], ["Venti", 79]]]]],
  ["Fruit Series", [["Lemon Fruit Drink", [["Regular", 99]]], ["Kiwi Fruit Drink", [["Regular", 99]]], ["Passion Fruit Drink", [["Regular", 99]]], ["Green Apple Fruit Drink", [["Regular", 99]]], ["Strawberry Fruit Drink", [["Regular", 99]]], ["Blueberry Fruit Drink", [["Regular", 99]]]]],
  ["Add-ons", [["Pearls", [["Add-on", 10]]], ["Crushed Oreo", [["Add-on", 15]]], ["Nata", [["Add-on", 15]]], ["Rainbow Jelly", [["Add-on", 15]]], ["Extra Shots", [["Add-on", 25]]], ["Choco Chips", [["Add-on", 15]]], ["Yakult", [["Add-on", 15]]], ["Milk", [["Add-on", 20]]], ["Whip Cream", [["Add-on", 20]]]]]
];

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function renderFallback(grid, filters, count) {
  const items = [];
  grid.innerHTML = FALLBACK.map(([section, drinks]) => {
    const cards = drinks.map(([name, sizes]) => {
      const idBase = `local-cafe-${slug(name)}`;
      const min = Math.min(...sizes.map((size) => size[1]));
      const max = Math.max(...sizes.map((size) => size[1]));
      const price = min === max ? formatPeso(min) : `${formatPeso(min)} – ${formatPeso(max)}`;
      const rows = sizes.map(([label, amount]) => {
        const id = `${idBase}-${slug(label)}`;
        items.push({ id, name: sizes.length > 1 ? `${name} — ${label}` : name, price: amount, menu_type: "cafe", image_url: "", available: true });
        return `<div class="flavor-row"><div><strong>${escapeHtml(label)}</strong><span>${formatPeso(amount)}</span></div><button class="btn btn-small" type="button" data-add-item="${escapeHtml(id)}">Add</button></div>`;
      }).join("");
      if (sizes.length === 1) {
        return `<article class="menu-card"><div class="single-card"><div class="menu-card-media">${imageOrPlaceholder("", name)}</div><div class="menu-card-body"><div class="menu-card-top"><h3>${escapeHtml(name)}</h3><p class="price">${formatPeso(sizes[0][1])}</p></div><div class="menu-card-actions"><button class="btn btn-small" type="button" data-add-item="${escapeHtml(idBase + "-" + slug(sizes[0][0]))}">Add</button></div></div></div></article>`;
      }
      return `<article class="menu-card menu-card-group"><button class="flavor-toggle" type="button" data-flavor-toggle aria-expanded="false"><div class="menu-card-media">${imageOrPlaceholder("", name)}</div><div class="menu-card-body"><div class="menu-card-top"><h3>${escapeHtml(name)}</h3><p class="price">${price}</p></div><p class="muted">${sizes.length} sizes. Tap to choose.</p></div></button><div class="flavor-panel" hidden>${rows}</div></article>`;
    }).join("");
    return `<section class="menu-section"><div class="menu-section-head"><h2>${escapeHtml(section)}</h2></div><div class="menu-grid">${cards}</div></section>`;
  }).join("");
  if (filters) filters.innerHTML = "";
  if (count) count.textContent = `${items.length} options`;
  grid.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-item]");
    if (add) {
      const item = items.find((row) => row.id === add.dataset.addItem);
      if (item) addToCart(item, 1);
      return;
    }
    const toggle = event.target.closest("[data-flavor-toggle]");
    if (!toggle) return;
    const panel = toggle.parentElement.querySelector(".flavor-panel");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
  });
}

if (document.body?.dataset.page === "cafe") {
  document.addEventListener("DOMContentLoaded", async () => {
    const result = await fetchMenu("cafe").catch(() => ({ items: [] }));
    if (result.items && result.items.length) {
      initMenuPage("cafe");
      return;
    }
    const grid = document.querySelector("[data-menu-grid]");
    if (grid) renderFallback(grid, document.querySelector("[data-menu-filters]"), document.querySelector("[data-menu-count]"));
  });
}
