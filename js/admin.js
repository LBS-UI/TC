/* ===================================================================
   TAMBAYAN CAWAG — ADMIN DASHBOARD LOGIC
=================================================================== */

(function () {
  "use strict";

  const peso = (n) => "\u20B1" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  let editingItem = null; // { categoryId, itemId } or null for "new"

  document.addEventListener("DOMContentLoaded", () => {
    bindTabs();
    renderDashboard();
    renderReservationsTable();
    renderMenuAdmin();
    renderScheduleForm();
    bindMenuItemModal();
    bindReservationDetailModal();
    document.getElementById("admin-footer-year").textContent = new Date().getFullYear();
  });

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
    const reservations = window.TCStorage.getReservations();
    const todayStr = new Date().toISOString().slice(0, 10);

    const today = reservations.filter((r) => r.dineIn.date === todayStr);
    const pending = reservations.filter((r) => r.status === "Pending Confirmation");
    const confirmed = reservations.filter((r) => r.status === "Confirmed");
    const completed = reservations.filter((r) => r.status === "Completed");
    const estimatedSales = reservations
      .filter((r) => r.status !== "Cancelled")
      .reduce((sum, r) => sum + r.subtotal, 0);

    document.getElementById("stat-today").textContent = today.length;
    document.getElementById("stat-pending").textContent = pending.length;
    document.getElementById("stat-confirmed").textContent = confirmed.length;
    document.getElementById("stat-completed").textContent = completed.length;
    document.getElementById("stat-sales").textContent = peso(estimatedSales);
  }

  /* ---------------- RESERVATIONS TABLE ---------------- */
  function renderReservationsTable() {
    const reservations = window.TCStorage.getReservations();
    // Dashboard preview shows the 5 most recent; Reservations tab shows all.
    fillReservationsTable(document.getElementById("reservations-tbody"), reservations.slice(0, 5));
    fillReservationsTable(document.getElementById("reservations-tbody-2"), reservations);
  }

  function fillReservationsTable(tbody, reservations) {
    if (!tbody) return;

    if (reservations.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="admin-empty">No reservations yet. They will appear here once customers submit a Dine-In Pre-Order.</td></tr>`;
      return;
    }

    tbody.innerHTML = reservations
      .map((r) => {
        const dateObj = new Date(`${r.dineIn.date}T${r.dineIn.time}:00`);
        return `<tr data-res="${r.reservationNumber}">
          <td>${r.reservationNumber}</td>
          <td>${r.customer.fullName}</td>
          <td>${dateObj.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
          <td>${dateObj.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</td>
          <td>${r.dineIn.guests}</td>
          <td>${peso(r.subtotal)}</td>
          <td><span class="status-badge status-${slug(r.status)}">${r.status}</span></td>
          <td class="admin-actions">
            <button class="admin-action" data-action="view">View</button>
            <button class="admin-action" data-action="confirm">Confirm</button>
            <button class="admin-action" data-action="preparing">Preparing</button>
            <button class="admin-action" data-action="complete">Complete</button>
            <button class="admin-action admin-action--danger" data-action="cancel">Cancel</button>
          </td>
        </tr>`;
      })
      .join("");

    tbody.querySelectorAll("tr").forEach((row) => {
      const resNumber = row.getAttribute("data-res");
      row.querySelectorAll(".admin-action").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.getAttribute("data-action");
          if (action === "view") return openReservationDetail(resNumber);
          const statusMap = { confirm: "Confirmed", preparing: "Preparing", complete: "Completed", cancel: "Cancelled" };
          window.TCStorage.updateReservationStatus(resNumber, statusMap[action]);
          renderReservationsTable();
          renderDashboard();
        });
      });
    });
  }

  function slug(status) {
    return status.toLowerCase().replace(/\s+/g, "-");
  }

  function bindReservationDetailModal() {
    const modal = document.getElementById("res-detail-modal");
    modal.querySelector(".modal-backdrop").addEventListener("click", () => modal.classList.remove("is-open"));
    modal.querySelector(".modal-close").addEventListener("click", () => modal.classList.remove("is-open"));
  }

  function openReservationDetail(resNumber) {
    const r = window.TCStorage.findReservation(resNumber);
    if (!r) return;
    const dateObj = new Date(`${r.dineIn.date}T${r.dineIn.time}:00`);
    document.getElementById("res-detail-body").innerHTML = `
      <h3>${r.reservationNumber}</h3>
      <p class="status-badge status-${slug(r.status)}">${r.status}</p>
      <div class="detail-grid">
        <div><span>Name</span><strong>${r.customer.fullName}</strong></div>
        <div><span>Phone</span><strong>${r.customer.phone}</strong></div>
        <div><span>Email</span><strong>${r.customer.email || "\u2014"}</strong></div>
        <div><span>Date</span><strong>${dateObj.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</strong></div>
        <div><span>Time</span><strong>${dateObj.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</strong></div>
        <div><span>Guests</span><strong>${r.dineIn.guests}</strong></div>
        <div><span>Seating</span><strong>${r.dineIn.seating}</strong></div>
      </div>
      ${r.customer.specialRequest ? `<p><strong>Special request:</strong> ${r.customer.specialRequest}</p>` : ""}
      <h4>Order</h4>
      <ul class="detail-items">
        ${r.items
          .map((line) => {
            const extras = [];
            if (line.variant) extras.push(line.variant);
            if (line.addOns && line.addOns.length) extras.push(line.addOns.map((a) => a.name).join(", "));
            if (line.notes) extras.push(`Note: ${line.notes}`);
            return `<li><span>${line.qty} \u00D7 ${line.name}${extras.length ? ` (${extras.join(" \u2013 ")})` : ""}</span><span>${peso((line.unitPrice + (line.addOns || []).reduce((s, a) => s + a.price, 0)) * line.qty)}</span></li>`;
          })
          .join("")}
      </ul>
      <div class="detail-total">Total: <strong>${peso(r.subtotal)}</strong></div>
    `;
    document.getElementById("res-detail-modal").classList.add("is-open");
  }

  /* ---------------- MENU MANAGEMENT ---------------- */
  function renderMenuAdmin() {
    const menu = window.TCStorage.getMenu();
    const container = document.getElementById("menu-admin-list");

    container.innerHTML = menu
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
      cb.addEventListener("change", () => {
        const menu = window.TCStorage.getMenu();
        const cat = menu.find((c) => c.id === cb.getAttribute("data-cat"));
        const item = cat.items.find((i) => i.id === cb.getAttribute("data-item"));
        item.available = cb.checked;
        window.TCStorage.saveMenu(menu);
        renderMenuAdmin();
      });
    });

    container.querySelectorAll("[data-edit-item]").forEach((btn) => {
      btn.addEventListener("click", () => openMenuItemModal(btn.getAttribute("data-cat"), btn.getAttribute("data-item")));
    });

    container.querySelectorAll("[data-delete-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!confirm("Delete this menu item? This cannot be undone.")) return;
        const menu = window.TCStorage.getMenu();
        const cat = menu.find((c) => c.id === btn.getAttribute("data-cat"));
        cat.items = cat.items.filter((i) => i.id !== btn.getAttribute("data-item"));
        window.TCStorage.saveMenu(menu);
        renderMenuAdmin();
      });
    });

    // populate category dropdown in modal
    const catSelect = document.getElementById("item-category-select");
    catSelect.innerHTML = menu.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("add-item-btn").addEventListener("click", () => openMenuItemModal(null, null));
    document.getElementById("reset-menu-btn").addEventListener("click", () => {
      if (!confirm("Reset the entire menu back to the original defaults? Any edits will be lost.")) return;
      window.TCStorage.resetMenu();
      renderMenuAdmin();
    });
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
      const menu = window.TCStorage.getMenu();
      const cat = menu.find((c) => c.id === categoryId);
      const item = cat.items.find((i) => i.id === itemId);
      document.getElementById("item-category-select").value = categoryId;
      document.getElementById("item-name-input").value = item.name;
      document.getElementById("item-desc-input").value = item.description || "";
      document.getElementById("item-price-input").value = item.price;
    } else {
      document.getElementById("item-name-input").value = "";
      document.getElementById("item-desc-input").value = "";
      document.getElementById("item-price-input").value = "";
    }
    modal.classList.add("is-open");
  }

  function closeMenuItemModal() {
    document.getElementById("item-modal").classList.remove("is-open");
    editingItem = null;
  }

  function saveMenuItem() {
    const catId = document.getElementById("item-category-select").value;
    const name = document.getElementById("item-name-input").value.trim();
    const description = document.getElementById("item-desc-input").value.trim();
    const price = Number(document.getElementById("item-price-input").value);

    if (!name || !price || price <= 0) {
      alert("Please enter a valid item name and price.");
      return;
    }

    const menu = window.TCStorage.getMenu();
    const cat = menu.find((c) => c.id === catId);

    if (editingItem) {
      const oldCat = menu.find((c) => c.id === editingItem.categoryId);
      const item = oldCat.items.find((i) => i.id === editingItem.itemId);
      item.name = name;
      item.description = description;
      item.price = price;
      if (editingItem.categoryId !== catId) {
        oldCat.items = oldCat.items.filter((i) => i.id !== editingItem.itemId);
        cat.items.push(item);
      }
    } else {
      const id = catId + "-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) + "-" + Date.now().toString(36).slice(-4);
      cat.items.push({ id, name, description, price, image: "", available: true });
    }

    window.TCStorage.saveMenu(menu);
    closeMenuItemModal();
    renderMenuAdmin();
  }

  /* ---------------- SERVICE SCHEDULE ---------------- */
  function renderScheduleForm() {
    const schedule = window.TCStorage.getSchedule();
    const leadMinutes = window.TCStorage.getLeadMinutes();

    document.getElementById("goto-open").value = schedule.goto.open;
    document.getElementById("goto-close").value = schedule.goto.close === "24:00" ? "23:59" : schedule.goto.close;
    document.getElementById("cafe-open").value = schedule.cafe.open;
    document.getElementById("cafe-close").value = schedule.cafe.close === "24:00" ? "23:59" : schedule.cafe.close;
    document.getElementById("lead-minutes-input").value = leadMinutes;

    document.getElementById("schedule-save-btn").addEventListener("click", () => {
      const newSchedule = {
        goto: {
          label: "Go-To \u2022 Snacks \u2022 Silog",
          open: document.getElementById("goto-open").value,
          close: document.getElementById("goto-close").value
        },
        cafe: {
          label: "Cafe",
          open: document.getElementById("cafe-open").value,
          close: document.getElementById("cafe-close").value
        }
      };
      window.TCStorage.saveSchedule(newSchedule);
      window.TCStorage.saveLeadMinutes(Number(document.getElementById("lead-minutes-input").value) || 30);
      alert("Schedule updated. Changes apply across the site immediately.");
    });
  }
})();
