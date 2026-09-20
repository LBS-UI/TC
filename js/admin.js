/* ===================================================================
   TAMBAYAN CAWAG — ADMIN DASHBOARD LOGIC
   -------------------------------------------------------------------
   Everything here reads/writes real Supabase data via the supabase-*
   modules (loaded as <script type="module"> in admin.html, which
   attach window.TCAuth / TCMenu / TCOrders / TCSettings / TCSeed for
   this classic script to call). The dashboard is gated behind real
   Supabase Authentication — see bindAuthGate().
=================================================================== */

(function () {
  "use strict";

  const peso = (n) => "\u20B1" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  let editingItem = null; // { categoryId, itemId } or null for "new"
  let latestOrders = [];
  let ordersLoadedOnce = false;
  let currentMenu = [];

  document.addEventListener("DOMContentLoaded", () => {
    bindAuthGate();
    bindTabs();
    bindReservationDetailModal();
    bindMenuItemModal();
    bindSetupTab();
    document.getElementById("admin-footer-year").textContent = new Date().getFullYear();
  });

  /* ---------------- AUTH GATE ---------------- */
  function bindAuthGate() {
    const loginScreen = document.getElementById("admin-login-screen");
    const dashboard = document.getElementById("admin-dashboard");
    const loginForm = document.getElementById("admin-login-form");
    const loginError = document.getElementById("admin-login-error");
    const logoutBtn = document.getElementById("admin-logout-btn");
    const whoami = document.getElementById("admin-whoami");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      loginError.hidden = true;
      const email = document.getElementById("admin-email").value.trim();
      const password = document.getElementById("admin-password").value;
      const btn = document.getElementById("admin-login-btn");
      btn.disabled = true;
      btn.textContent = "Signing in\u2026";
      try {
        await window.TCAuth.signIn(email, password);
        // onAuthChange below will flip the UI once Supabase confirms.
      } catch (err) {
        loginError.textContent = err.message || "Sign-in failed. Please check your email and password.";
        loginError.hidden = false;
      } finally {
        btn.disabled = false;
        btn.textContent = "Sign In";
      }
    });

    logoutBtn.addEventListener("click", async () => {
      await window.TCAuth.signOutAdmin();
    });

    window.TCAuth.onAuthChange((user, isAdmin) => {
      if (user && isAdmin) {
        loginScreen.hidden = true;
        dashboard.hidden = false;
        whoami.textContent = user.email;
        startDashboardData();
      } else {
        dashboard.hidden = true;
        loginScreen.hidden = false;
        if (user && !isAdmin) {
          loginError.textContent = "This account isn't authorized as an admin. Ask an existing admin to add your account (see SUPABASE_SETUP.md).";
          loginError.hidden = false;
        }
      }
    });
  }

  let dashboardDataStarted = false;
  function startDashboardData() {
    if (dashboardDataStarted) return;
    dashboardDataStarted = true;

    window.TCOrders.subscribeOrders((orders, addedIds) => {
      const isFirstLoad = !ordersLoadedOnce;
      ordersLoadedOnce = true;
      latestOrders = orders;
      renderDashboard();
      renderReservationsTable(isFirstLoad ? [] : addedIds);
    }, (err) => {
      console.error("orders subscription error:", err);
      showAdminError("Unable to load orders from Firestore. Check your connection and Firestore rules.");
    });

    window.TCMenu.subscribeMenu((menu) => {
      currentMenu = menu;
      renderMenuAdmin();
    }, (err) => {
      console.error("menu subscription error:", err);
      showAdminError("Unable to load the menu from Firestore.");
    });

    window.TCSettings.subscribeSettings(() => {
      renderScheduleForm();
    }, (err) => {
      console.error("settings subscription error:", err);
      showAdminError("Unable to load restaurant settings from Firestore.");
    });
  }

  function showAdminError(message) {
    const el = document.getElementById("admin-error-banner");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  /* ---------------- TABS ---------------- */
  function bindTabs() {
    document.querySelectorAll(".admin-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("is-active"));
        document.querySelectorAll(".admin-panel").forEach((p) => (p.hidden = true));
        tab.classList.add("is-active");
        document.getElementById(tab.getAttribute("data-panel")).hidden = false;
      });
    });
  }

  /* ---------------- DASHBOARD ---------------- */
  function renderDashboard() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const today = latestOrders.filter((o) => o.date === todayStr);
    const pending = latestOrders.filter((o) => o.status === "pending");
    const confirmed = latestOrders.filter((o) => o.status === "confirmed");
    const completed = latestOrders.filter((o) => o.status === "completed");
    const estimatedSales = latestOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.subtotal || 0), 0);

    document.getElementById("stat-today").textContent = today.length;
    document.getElementById("stat-pending").textContent = pending.length;
    document.getElementById("stat-confirmed").textContent = confirmed.length;
    document.getElementById("stat-completed").textContent = completed.length;
    document.getElementById("stat-sales").textContent = peso(estimatedSales);
  }

  /* ---------------- RESERVATIONS / ORDERS TABLE ---------------- */
  function renderReservationsTable(newlyAddedIds) {
    fillReservationsTable(document.getElementById("reservations-tbody"), latestOrders.slice(0, 5), newlyAddedIds);
    fillReservationsTable(document.getElementById("reservations-tbody-2"), latestOrders, newlyAddedIds);
  }

  function fillReservationsTable(tbody, orders, newlyAddedIds) {
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="admin-empty">No reservations yet. They will appear here once customers submit a Dine-In Pre-Order.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders
      .map((o) => {
        const dateObj = new Date(`${o.date}T${o.time}:00`);
        const isNew = newlyAddedIds && newlyAddedIds.includes(o.id);
        const label = window.TCReservation.STATUS_LABELS[o.status] || o.status;
        return `<tr data-order-id="${o.id}" class="${isNew ? "row-new" : ""}">
          <td>${o.reservationNumber}${isNew ? ' <span class="new-badge">NEW</span>' : ""}</td>
          <td>${o.customerName}</td>
          <td>${dateObj.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
          <td>${dateObj.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</td>
          <td>${o.guests}</td>
          <td>${peso(o.subtotal)}</td>
          <td><span class="status-badge status-${o.status}">${label}</span></td>
          <td class="admin-actions">
            <button class="admin-action" data-action="view">View</button>
            <button class="admin-action" data-action="confirmed">Confirm</button>
            <button class="admin-action" data-action="preparing">Preparing</button>
            <button class="admin-action" data-action="completed">Complete</button>
            <button class="admin-action admin-action--danger" data-action="cancelled">Cancel</button>
          </td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("tr").forEach((row) => {
      const orderId = row.getAttribute("data-order-id");
      row.querySelectorAll(".admin-action").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const action = btn.getAttribute("data-action");
          if (action === "view") return openReservationDetail(orderId);
          const order = latestOrders.find((o) => o.id === orderId);
          if (!order) return;
          btn.disabled = true;
          try {
            await window.TCOrders.updateOrderStatus(orderId, order.reservationNumber, action);
          } catch (err) {
            console.error("Status update failed:", err);
            alert("Unable to update order status. Please check your connection and try again.");
          } finally {
            btn.disabled = false;
          }
        });
      });
    });
  }

  function bindReservationDetailModal() {
    const modal = document.getElementById("res-detail-modal");
    modal.querySelector(".modal-backdrop").addEventListener("click", () => modal.classList.remove("is-open"));
    modal.querySelector(".modal-close").addEventListener("click", () => modal.classList.remove("is-open"));
  }

  function openReservationDetail(orderId) {
    const o = latestOrders.find((x) => x.id === orderId);
    if (!o) return;
    const dateObj = new Date(`${o.date}T${o.time}:00`);
    const label = window.TCReservation.STATUS_LABELS[o.status] || o.status;
    document.getElementById("res-detail-body").innerHTML = `
      <h3>${o.reservationNumber}</h3>
      <p class="status-badge status-${o.status}">${label}</p>
      <div class="detail-grid">
        <div><span>Name</span><strong>${o.customerName}</strong></div>
        <div><span>Phone</span><strong>${o.phone}</strong></div>
        <div><span>Email</span><strong>${o.email || "\u2014"}</strong></div>
        <div><span>Date</span><strong>${dateObj.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</strong></div>
        <div><span>Time</span><strong>${dateObj.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</strong></div>
        <div><span>Guests</span><strong>${o.guests}</strong></div>
        <div><span>Seating</span><strong>${o.seating}</strong></div>
      </div>
      ${o.specialInstructions ? `<p><strong>Special request:</strong> ${o.specialInstructions}</p>` : ""}
      <h4>Order</h4>
      <ul class="detail-items">
        ${o.items
          .map((line) => {
            const extras = [];
            if (line.variant) extras.push(line.variant);
            if (line.addOns && line.addOns.length) extras.push(line.addOns.map((a) => a.name).join(", "));
            if (line.notes) extras.push(`Note: ${line.notes}`);
            return `<li><span>${line.qty} \u00D7 ${line.name}${extras.length ? ` (${extras.join(" \u2013 ")})` : ""}</span><span>${peso((line.unitPrice + (line.addOns || []).reduce((s, a) => s + a.price, 0)) * line.qty)}</span></li>`;
          })
          .join("")}
      </ul>
      <div class="detail-total">Total: <strong>${peso(o.subtotal)}</strong></div>
    `;
    document.getElementById("res-detail-modal").classList.add("is-open");
  }

  /* ---------------- MENU MANAGEMENT ---------------- */
  function renderMenuAdmin() {
    const container = document.getElementById("menu-admin-list");

    if (!currentMenu.length) {
      container.innerHTML = `<div class="admin-empty">No menu data yet. Use the Setup tab to seed the initial menu into Firestore.</div>`;
      document.getElementById("item-category-select").innerHTML = "";
      return;
    }

    container.innerHTML = currentMenu
      .map(
        (cat) => `<div class="admin-cat-block">
          <div class="admin-cat-block__head">
            <h3>${cat.icon} ${cat.name}</h3>
            <span class="muted">${cat.items.length} item(s)</span>
          </div>
          <table class="admin-table">
            <thead><tr><th>Item</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${cat.items
                .map(
                  (item) => `<tr>
                    <td>${item.name}</td>
                    <td>${peso(item.price)}</td>
                    <td>
                      <label class="switch">
                        <input type="checkbox" data-toggle-avail data-cat="${cat.id}" data-item="${item.id}" ${item.available !== false ? "checked" : ""}>
                        <span>${item.available !== false ? "Available" : "Hidden"}</span>
                      </label>
                    </td>
                    <td class="admin-actions">
                      <button class="admin-action" data-edit-item data-cat="${cat.id}" data-item="${item.id}">Edit</button>
                      <button class="admin-action admin-action--danger" data-delete-item data-cat="${cat.id}" data-item="${item.id}">Delete</button>
                    </td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`
      )
      .join("");

    container.querySelectorAll("[data-toggle-avail]").forEach((cb) => {
      cb.addEventListener("change", async () => {
        cb.disabled = true;
        try {
          await window.TCMenu.setItemAvailability(cb.getAttribute("data-item"), cb.checked);
        } catch (err) {
          console.error("Availability toggle failed:", err);
          alert("Unable to update availability. Please try again.");
          cb.checked = !cb.checked;
        } finally {
          cb.disabled = false;
        }
      });
    });

    container.querySelectorAll("[data-edit-item]").forEach((btn) => {
      btn.addEventListener("click", () => openMenuItemModal(btn.getAttribute("data-cat"), btn.getAttribute("data-item")));
    });

    container.querySelectorAll("[data-delete-item]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this menu item? This cannot be undone.")) return;
        btn.disabled = true;
        try {
          await window.TCMenu.deleteMenuItem(btn.getAttribute("data-item"));
        } catch (err) {
          console.error("Delete failed:", err);
          alert("Unable to delete this item. Please try again.");
        } finally {
          btn.disabled = false;
        }
      });
    });

    // populate category dropdown in modal
    const catSelect = document.getElementById("item-category-select");
    catSelect.innerHTML = currentMenu.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("add-item-btn").addEventListener("click", () => openMenuItemModal(null, null));
  });

  function bindMenuItemModal() {
    const modal = document.getElementById("item-modal");
    modal.querySelector(".modal-backdrop").addEventListener("click", closeMenuItemModal);
    modal.querySelector(".modal-close").addEventListener("click", closeMenuItemModal);
    document.getElementById("item-cancel-btn").addEventListener("click", closeMenuItemModal);
    document.getElementById("item-save-btn").addEventListener("click", saveMenuItem);
  }

  function openMenuItemModal(categoryId, itemId) {
    editingItem = categoryId && itemId ? { categoryId, itemId } : null;
    const modal = document.getElementById("item-modal");
    document.getElementById("item-modal-title").textContent = editingItem ? "Edit Menu Item" : "Add Menu Item";

    if (editingItem) {
      const cat = currentMenu.find((c) => c.id === categoryId);
      const item = cat.items.find((i) => i.id === itemId);
      document.getElementById("item-category-select").value = categoryId;
      document.getElementById("item-name-input").value = item.name;
      document.getElementById("item-desc-input").value = item.description || "";
      document.getElementById("item-price-input").value = item.price;
      document.getElementById("item-image-input").value = item.image || "";
    } else {
      document.getElementById("item-name-input").value = "";
      document.getElementById("item-desc-input").value = "";
      document.getElementById("item-price-input").value = "";
      document.getElementById("item-image-input").value = "";
    }
    modal.classList.add("is-open");
  }

  function closeMenuItemModal() {
    document.getElementById("item-modal").classList.remove("is-open");
    editingItem = null;
  }

  async function saveMenuItem() {
    const catId = document.getElementById("item-category-select").value;
    const name = document.getElementById("item-name-input").value.trim();
    const description = document.getElementById("item-desc-input").value.trim();
    const price = Number(document.getElementById("item-price-input").value);
    const image = document.getElementById("item-image-input").value.trim();

    if (!name || !price || price <= 0) {
      alert("Please enter a valid item name and price.");
      return;
    }

    const itemId = editingItem
      ? editingItem.itemId
      : catId + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) + "-" + Date.now().toString(36).slice(-4);

    const btn = document.getElementById("item-save-btn");
    btn.disabled = true;
    btn.textContent = "Saving\u2026";
    try {
      await window.TCMenu.saveMenuItem(catId, itemId, { name, description, price, image, available: true });
      closeMenuItemModal();
    } catch (err) {
      console.error("Save item failed:", err);
      alert("Unable to save this item. Please check your connection and try again.");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Item";
    }
  }

  /* ---------------- SERVICE SCHEDULE ---------------- */
  function renderScheduleForm() {
    const schedule = window.TCSettings.getCachedSchedule();
    const leadMinutes = window.TCSettings.getCachedLeadMinutes();

    document.getElementById("goto-open").value = schedule.goto.open;
    document.getElementById("goto-close").value = schedule.goto.close === "24:00" ? "23:59" : schedule.goto.close;
    document.getElementById("cafe-open").value = schedule.cafe.open;
    document.getElementById("cafe-close").value = schedule.cafe.close === "24:00" ? "23:59" : schedule.cafe.close;
    document.getElementById("lead-minutes-input").value = leadMinutes;
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("schedule-save-btn").addEventListener("click", async () => {
      const btn = document.getElementById("schedule-save-btn");

      // HTML <input type="time"> can't hold "24:00", so the form shows
      // "23:59" as a stand-in for midnight (see renderScheduleForm()
      // above). Convert it back on save — otherwise every schedule save
      // silently shifts closing time to 11:59 PM, one minute before
      // actual midnight. This is what the note below the form promises.
      const normalizeClose = (value) => (value === "23:59" ? "24:00" : value);

      const newSchedule = {
        goto: {
          label: "Go-To \u2022 Snacks \u2022 Silog",
          open: document.getElementById("goto-open").value,
          close: normalizeClose(document.getElementById("goto-close").value)
        },
        cafe: {
          label: "Cafe",
          open: document.getElementById("cafe-open").value,
          close: normalizeClose(document.getElementById("cafe-close").value)
        }
      };
      btn.disabled = true;
      btn.textContent = "Saving\u2026";
      try {
        await window.TCSettings.saveSchedule(newSchedule);
        await window.TCSettings.saveLeadMinutes(Number(document.getElementById("lead-minutes-input").value) || 30);
        alert("Schedule updated. Changes apply across the site immediately.");
      } catch (err) {
        console.error("Schedule save failed:", err);
        alert("Unable to save schedule. Please check your connection and try again.");
      } finally {
        btn.disabled = false;
        btn.textContent = "Save Schedule";
      }
    });
  });

  /* ---------------- SETUP / SEED ---------------- */
  function bindSetupTab() {
    const btn = document.getElementById("seed-data-btn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Seeding\u2026";
      const resultEl = document.getElementById("seed-result");
      try {
        const result = await window.TCSeed.run();
        resultEl.textContent = result.message;
        resultEl.className = result.ok ? "seed-result seed-result--ok" : "seed-result seed-result--warn";
        resultEl.hidden = false;
      } catch (err) {
        console.error("Seeding failed:", err);
        resultEl.textContent = "Seeding failed. Check your connection and Firestore rules, then try again.";
        resultEl.className = "seed-result seed-result--error";
        resultEl.hidden = false;
      } finally {
        btn.disabled = false;
        btn.textContent = "Seed Initial Menu Data";
      }
    });
  }
})();
