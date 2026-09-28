import { DEFAULT_SETTINGS } from "./config.js";
import { getSupabase, formatSupabaseError, getSupabaseError } from "./supabase.js";
import { settingsFromRows, escapeHtml, setNotice } from "./app.js";
import { formatPeso } from "./cart.js";

const state = {
  session: null,
  admin: null,
  settings: { ...DEFAULT_SETTINGS },
  restaurantItems: [],
  cafeItems: [],
  categories: [],
  orders: [],
};

function qs(sel) {
  return document.querySelector(sel);
}

function show(id) {
  document.querySelectorAll("[data-admin-screen]").forEach((el) => {
    el.hidden = el.dataset.adminScreen !== id;
  });
}

function showPanel(name) {
  document.querySelectorAll("[data-panel]").forEach((el) => {
    el.hidden = el.dataset.panel !== name;
  });
  document.querySelectorAll("[data-nav-panel-btn]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.navPanelBtn === name);
  });
}

function notice(type, message) {
  setNotice(qs("[data-admin-notice]"), type, message);
}

async function requireClient() {
  const client = getSupabase();
  if (!client) throw new Error(getSupabaseError() || "Supabase is not configured.");
  return client;
}

async function checkAuthorization(client, user) {
  const { data, error } = await client.from("admins").select("*").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(formatSupabaseError(error, "Could not check admin access."));
  return data;
}

function renderDashboard() {
  qs("[data-stat-restaurant]").textContent = String(state.restaurantItems.length);
  qs("[data-stat-cafe]").textContent = String(state.cafeItems.length);
  qs("[data-stat-orders]").textContent = String(state.orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length);
  qs("[data-admin-email]").textContent = state.admin?.email || state.session?.user?.email || "";
}

function itemRows(items) {
  if (!items.length) {
    return `<tr><td colspan="6"><div class="state">No items yet. Add the first one.</div></td></tr>`;
  }
  return items
    .map(
      (item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.name)}</strong>
          <div class="muted small">${escapeHtml(item.description || "")}</div>
        </td>
        <td>${escapeHtml(categoryName(item.category_id))}</td>
        <td>${formatPeso(item.price)}</td>
        <td>${item.available ? "Available" : "Hidden"}</td>
        <td>${item.featured ? "Yes" : "No"}</td>
        <td class="row-actions">
          <button class="text-btn" data-edit-item="${escapeHtml(item.id)}">Edit</button>
          <button class="text-btn danger" data-delete-item="${escapeHtml(item.id)}">Delete</button>
        </td>
      </tr>`
    )
    .join("");
}

function categoryName(id) {
  return state.categories.find((c) => c.id === id)?.name || "—";
}

function fillCategorySelect(select, menuType, selected) {
  if (!select) return;
  const options = state.categories
    .filter((c) => c.menu_type === menuType)
    .map((c) => `<option value="${escapeHtml(c.id)}" ${c.id === selected ? "selected" : ""}>${escapeHtml(c.name)}</option>`)
    .join("");
  select.innerHTML = `<option value="">No category</option>${options}`;
}

function renderMenus() {
  qs("[data-restaurant-table]").innerHTML = itemRows(state.restaurantItems);
  qs("[data-cafe-table]").innerHTML = itemRows(state.cafeItems);
  qs("[data-category-table]").innerHTML = state.categories.length
    ? state.categories
        .map(
          (c) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.menu_type)}</td>
          <td>${c.sort_order}</td>
          <td class="row-actions">
            <button class="text-btn danger" data-delete-category="${escapeHtml(c.id)}">Delete</button>
          </td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="4"><div class="state">No categories yet.</div></td></tr>`;
  fillCategorySelect(qs("#item_category"), qs("#item_menu_type").value, qs("#item_category").value);
}

function renderOrders() {
  const table = qs("[data-orders-table]");
  if (!state.orders.length) {
    table.innerHTML = `<tr><td colspan="6"><div class="state">No orders yet.</div></td></tr>`;
    return;
  }
  table.innerHTML = state.orders
    .map((order) => {
      const lines = (order.order_items || [])
        .map((line) => `${escapeHtml(line.quantity)} × ${escapeHtml(line.name)}`)
        .join("<br>");
      return `
        <tr>
          <td>
            <strong>${escapeHtml(order.customer_name)}</strong>
            <div class="muted small">${escapeHtml(order.customer_phone)}</div>
          </td>
          <td>${lines || "—"}</td>
          <td>${formatPeso(order.subtotal)}</td>
          <td>${escapeHtml(order.fulfillment)}</td>
          <td>
            <select data-order-status="${escapeHtml(order.id)}">
              ${["received", "preparing", "ready", "completed", "cancelled"]
                .map((status) => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`)
                .join("")}
            </select>
          </td>
          <td class="muted small">${new Date(order.created_at).toLocaleString()}</td>
        </tr>`;
    })
    .join("");
}

function fillSettingsForm() {
  const s = state.settings;
  qs("#set_name").value = s.restaurant_name || "";
  qs("#set_tagline").value = s.tagline || "";
  qs("#set_short").value = s.short_description || "";
  qs("#set_about").value = s.about || "";
  qs("#set_address").value = s.address || "";
  qs("#set_phone").value = s.phone || "";
  qs("#set_email").value = s.email || "";
  qs("#rest_open").value = s.restaurant_hours?.open || "10:00";
  qs("#rest_close").value = s.restaurant_hours?.close || "24:00";
  qs("#cafe_open").value = s.cafe_hours?.open || "13:00";
  qs("#cafe_close").value = s.cafe_hours?.close || "24:00";
}

async function refreshAll() {
  const client = await requireClient();
  const [settingsRes, catRes, itemRes, orderRes] = await Promise.all([
    client.from("settings").select("key, value"),
    client.from("categories").select("*").order("menu_type").order("sort_order"),
    client.from("menu_items").select("*").order("name"),
    client.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(100),
  ]);

  if (settingsRes.error) throw new Error(formatSupabaseError(settingsRes.error));
  if (catRes.error) throw new Error(formatSupabaseError(catRes.error));
  if (itemRes.error) throw new Error(formatSupabaseError(itemRes.error));
  if (orderRes.error) throw new Error(formatSupabaseError(orderRes.error));

  state.settings = settingsFromRows(settingsRes.data);
  state.categories = catRes.data || [];
  state.restaurantItems = (itemRes.data || []).filter((i) => i.menu_type === "restaurant");
  state.cafeItems = (itemRes.data || []).filter((i) => i.menu_type === "cafe");
  state.orders = orderRes.data || [];
  renderDashboard();
  renderMenus();
  renderOrders();
  fillSettingsForm();
}

function openItemModal(item) {
  const dialog = qs("#item-dialog");
  qs("#item_id").value = item?.id || "";
  qs("#item_name").value = item?.name || "";
  qs("#item_description").value = item?.description || "";
  qs("#item_price").value = item?.price ?? "";
  qs("#item_image").value = item?.image_url || "";
  qs("#item_menu_type").value = item?.menu_type || dialog.dataset.defaultType || "restaurant";
  qs("#item_available").checked = item ? item.available !== false : true;
  qs("#item_featured").checked = Boolean(item?.featured);
  fillCategorySelect(qs("#item_category"), qs("#item_menu_type").value, item?.category_id || "");
  dialog.querySelector("h2").textContent = item ? "Edit item" : "Add item";
  dialog.showModal();
}

async function saveItem(event) {
  event.preventDefault();
  const client = await requireClient();
  const id = qs("#item_id").value;
  const payload = {
    name: qs("#item_name").value.trim(),
    description: qs("#item_description").value.trim(),
    price: Number(qs("#item_price").value),
    image_url: qs("#item_image").value.trim(),
    menu_type: qs("#item_menu_type").value,
    category_id: qs("#item_category").value || null,
    available: qs("#item_available").checked,
    featured: qs("#item_featured").checked,
  };
  if (!payload.name || Number.isNaN(payload.price)) {
    notice("error", "Name and a valid price are required.");
    return;
  }
  const query = id
    ? client.from("menu_items").update(payload).eq("id", id)
    : client.from("menu_items").insert(payload);
  const { error } = await query;
  if (error) {
    notice("error", formatSupabaseError(error, "Could not save item."));
    return;
  }
  qs("#item-dialog").close();
  notice("success", "Menu item saved.");
  await refreshAll();
}

async function boot() {
  const loginNotice = qs("[data-login-notice]");
  try {
    const client = await requireClient();
    const { data } = await client.auth.getSession();
    if (data.session) {
      await enterSession(data.session);
    } else {
      show("login");
    }

    client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        state.session = null;
        state.admin = null;
        show("login");
      }
    });
  } catch (error) {
    show("login");
    setNotice(loginNotice, "error", error.message);
  }
}

async function enterSession(session) {
  const client = await requireClient();
  state.session = session;
  try {
    const admin = await checkAuthorization(client, session.user);
    if (!admin) {
      show("unauthorized");
      qs("[data-unauth-email]").textContent = session.user.email || session.user.id;
      qs("[data-unauth-uid]").textContent = session.user.id;
      return;
    }
    state.admin = admin;
    show("app");
    showPanel("dashboard");
    await refreshAll();
  } catch (error) {
    show("unauthorized");
    qs("[data-unauth-extra]").textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  boot().catch((error) => {
    show("login");
    setNotice(qs("[data-login-notice]"), "error", error.message);
  });

  qs("[data-login-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("[type='submit']");
    button.disabled = true;
    try {
      const client = await requireClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: form.email.value.trim(),
        password: form.password.value,
      });
      if (error) throw new Error(formatSupabaseError(error, "Login failed."));
      await enterSession(data.session);
    } catch (error) {
      setNotice(qs("[data-login-notice]"), "error", error.message);
    } finally {
      button.disabled = false;
    }
  });

  qs("[data-logout]")?.addEventListener("click", async () => {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    state.session = null;
    state.admin = null;
    show("login");
  });

  qs("[data-unauth-logout]")?.addEventListener("click", async () => {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    show("login");
  });

  document.querySelectorAll("[data-nav-panel-btn]").forEach((btn) => {
    btn.addEventListener("click", () => showPanel(btn.dataset.navPanelBtn));
  });

  qs("[data-add-restaurant]")?.addEventListener("click", () => {
    qs("#item-dialog").dataset.defaultType = "restaurant";
    openItemModal(null);
  });
  qs("[data-add-cafe]")?.addEventListener("click", () => {
    qs("#item-dialog").dataset.defaultType = "cafe";
    openItemModal(null);
  });

  qs("#item_menu_type")?.addEventListener("change", (event) => {
    fillCategorySelect(qs("#item_category"), event.target.value, "");
  });

  qs("[data-item-form]")?.addEventListener("submit", (event) => {
    saveItem(event).catch((error) => notice("error", error.message));
  });

  qs("[data-item-cancel]")?.addEventListener("click", () => qs("#item-dialog").close());

  document.body.addEventListener("click", async (event) => {
    const edit = event.target.closest("[data-edit-item]");
    const del = event.target.closest("[data-delete-item]");
    const delCat = event.target.closest("[data-delete-category]");
    try {
      if (edit) {
        const item = [...state.restaurantItems, ...state.cafeItems].find((row) => row.id === edit.dataset.editItem);
        if (item) openItemModal(item);
      }
      if (del) {
        if (!confirm("Delete this item?")) return;
        const client = await requireClient();
        const { error } = await client.from("menu_items").delete().eq("id", del.dataset.deleteItem);
        if (error) throw new Error(formatSupabaseError(error));
        notice("success", "Item deleted.");
        await refreshAll();
      }
      if (delCat) {
        if (!confirm("Delete this category?")) return;
        const client = await requireClient();
        const { error } = await client.from("categories").delete().eq("id", delCat.dataset.deleteCategory);
        if (error) throw new Error(formatSupabaseError(error));
        notice("success", "Category deleted.");
        await refreshAll();
      }
    } catch (error) {
      notice("error", error.message);
    }
  });

  qs("[data-orders-table]")?.addEventListener("change", async (event) => {
    const select = event.target.closest("[data-order-status]");
    if (!select) return;
    try {
      const client = await requireClient();
      const { error } = await client.from("orders").update({ status: select.value }).eq("id", select.dataset.orderStatus);
      if (error) throw new Error(formatSupabaseError(error));
      notice("success", "Order status updated.");
    } catch (error) {
      notice("error", error.message);
    }
  });

  qs("[data-category-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const client = await requireClient();
      const { error } = await client.from("categories").insert({
        name: form.cat_name.value.trim(),
        slug: form.cat_name.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        menu_type: form.cat_type.value,
        sort_order: Number(form.cat_sort.value) || 0,
      });
      if (error) throw new Error(formatSupabaseError(error));
      form.reset();
      notice("success", "Category added.");
      await refreshAll();
    } catch (error) {
      notice("error", error.message);
    }
  });

  async function upsertSettings(rows, successMessage) {
    const client = await requireClient();
    const { error } = await client.from("settings").upsert(rows);
    if (error) throw new Error(formatSupabaseError(error));
    notice("success", successMessage);
    await refreshAll();
  }

  qs("[data-hours-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await upsertSettings(
        [
          {
            key: "restaurant_hours",
            value: {
              open: qs("#rest_open").value,
              close: qs("#rest_close").value,
              label: `${qs("#rest_open").value} – ${qs("#rest_close").value}`,
            },
          },
          {
            key: "cafe_hours",
            value: {
              open: qs("#cafe_open").value,
              close: qs("#cafe_close").value,
              label: `${qs("#cafe_open").value} – ${qs("#cafe_close").value}`,
            },
          },
        ],
        "Hours saved."
      );
    } catch (error) {
      notice("error", error.message);
    }
  });

  qs("[data-settings-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await upsertSettings(
        [
          { key: "restaurant_name", value: qs("#set_name").value.trim() },
          { key: "tagline", value: qs("#set_tagline").value.trim() },
          { key: "short_description", value: qs("#set_short").value.trim() },
          { key: "about", value: qs("#set_about").value.trim() },
          { key: "address", value: qs("#set_address").value.trim() },
          { key: "phone", value: qs("#set_phone").value.trim() },
          { key: "email", value: qs("#set_email").value.trim() },
        ],
        "Settings saved."
      );
    } catch (error) {
      notice("error", error.message);
    }
  });
});
