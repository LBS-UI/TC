/* ===================================================================
   TAMBAYAN CAWAG — MAIN SITE LOGIC
=================================================================== */

(function () {
  "use strict";

  const peso = (n) => "\u20B1" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  let MENU = window.TCStorage.getMenu();
  let activeFilter = "all";
  let searchTerm = "";
  let currentModalItem = null; // { category, item }
  let wizardStep = 1;
  let wizardData = { date: "", time: "", guests: 2, seating: "Indoor", fullName: "", phone: "", email: "", specialRequest: "" };

  /* ---------------- INIT ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderRestaurantInfo();
    renderHoursEverywhere();
    renderMenuFilters();
    renderMenu();
    renderCart();
    bindNav();
    bindSearch();
    bindCartDrawer();
    bindProductModal();
    bindWizard();
    bindOrderLookup();
    bindLightbox();
    bindGlobalEscape();
    setInterval(() => { renderHoursEverywhere(); renderMenu(); }, 60000);
    document.getElementById("footer-year").textContent = new Date().getFullYear();
  });

  document.addEventListener("tc:cart-changed", renderCart);

  /* ---------------- RESTAURANT INFO ---------------- */
  function renderRestaurantInfo() {
    const info = window.TCStorage.getRestaurantInfo();
    document.querySelectorAll("[data-info='location']").forEach((el) => (el.textContent = info.location));
    document.querySelectorAll("[data-info='phone']").forEach((el) => (el.textContent = info.phone));
    document.querySelectorAll("[data-info='email']").forEach((el) => (el.textContent = info.email));
    document.querySelectorAll("[data-info='facebook']").forEach((el) => (el.textContent = info.facebook));
    document.querySelectorAll("[data-info='maps']").forEach((el) => (el.textContent = info.mapsLink));
  }

  /* ---------------- HOURS / LIVE STATUS ---------------- */
  function renderHoursEverywhere() {
    const schedule = window.TCStorage.getSchedule();
    document.querySelectorAll("[data-hours-block]").forEach((block) => {
      const key = block.getAttribute("data-hours-block");
      const hours = schedule[key];
      if (!hours) return;
      const isOpen = window.TCSchedule.isServiceOpenNow(key);
      const timeEl = block.querySelector(".hours-range");
      const statusEl = block.querySelector(".status-pill");
      if (timeEl) timeEl.textContent = window.TCSchedule.formatHours(key);
      if (statusEl) {
        statusEl.textContent = isOpen ? "\uD83D\uDFE2 OPEN NOW" : "\uD83D\uDD34 CLOSED NOW";
        statusEl.classList.toggle("is-open", isOpen);
        statusEl.classList.toggle("is-closed", !isOpen);
      }
    });
  }

  /* ---------------- NAV ---------------- */
  function bindNav() {
    const toggle = document.getElementById("nav-toggle");
    const menu = document.getElementById("nav-menu");

    function openMenu() {
      menu.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-lock-scroll");
    }
    function closeMenu() {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-lock-scroll");
    }

    toggle.addEventListener("click", () => {
      if (menu.classList.contains("is-open")) closeMenu();
      else openMenu();
    });

    document.querySelectorAll("#nav-menu a[href^='#'], #nav-menu button[data-open-wizard]").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    // Close when clicking outside the open mobile menu (but not the toggle itself)
    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("is-open")) return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      closeMenu();
    });

    // Close on Escape (also handled centrally, kept here for clarity/robustness)
    menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
        toggle.focus();
      }
    });

    // sticky shadow on scroll
    const nav = document.getElementById("site-nav");
    window.addEventListener("scroll", () => {
      nav.classList.toggle("scrolled", window.scrollY > 12);
    });
  }

  /* ---------------- GLOBAL ESCAPE HANDLING ----------------
     One listener closes whichever overlay (mobile nav, product modal,
     cart drawer, wizard, lightbox) is currently open, so Escape always
     does the right thing regardless of which surface has focus. */
  function bindGlobalEscape() {
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const nav = document.getElementById("nav-menu");
      const lightbox = document.getElementById("image-lightbox");
      if (lightbox && lightbox.classList.contains("is-open")) return closeLightbox();
      if (document.getElementById("product-modal").classList.contains("is-open")) return closeProductModal();
      if (document.getElementById("cart-drawer").classList.contains("is-open")) return closeCartDrawer();
      if (document.getElementById("wizard-modal").classList.contains("is-open")) return closeWizard();
      if (nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        document.getElementById("nav-toggle").setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-lock-scroll");
      }
    });
  }

  /* ---------------- IMAGE LOADING HELPERS ----------------
     Every menu image goes through this so a failed remote fetch (slow
     connection, image taken down, etc.) always degrades to a clean,
     on-brand placeholder instead of a broken-image icon. */
  function imgAttrs(url, alt) {
    const safeAlt = (alt || "Tambayan Cawag menu item").replace(/"/g, "&quot;");
    return `src="${url}" alt="${safeAlt}" loading="lazy" decoding="async" onerror="this.onerror=null;this.classList.add('img-fallback');this.closest('[data-img-wrap]') && (this.closest('[data-img-wrap]').innerHTML='<div class=&quot;card-img card-img--placeholder&quot;>\uD83C\uDF7D\uFE0F<span>Tambayan Cawag</span></div>')"`;
  }

  /* ---------------- LIGHTBOX ---------------- */
  function bindLightbox() {
    const modal = document.getElementById("image-lightbox");
    modal.querySelector(".modal-backdrop").addEventListener("click", closeLightbox);
    modal.querySelector(".modal-close").addEventListener("click", closeLightbox);
  }
  function openLightbox(url, name, price) {
    if (!url) return;
    document.getElementById("lightbox-img").src = url;
    document.getElementById("lightbox-img").alt = name;
    document.getElementById("lightbox-name").textContent = name;
    document.getElementById("lightbox-price").textContent = price;
    document.getElementById("image-lightbox").classList.add("is-open");
    document.body.classList.add("no-scroll");
  }
  function closeLightbox() {
    document.getElementById("image-lightbox").classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  /* ---------------- MENU FILTERS + SEARCH ---------------- */
  function renderMenuFilters() {
    const wrap = document.getElementById("menu-filters");
    const cats = [{ id: "all", name: "All", icon: "\u2728" }].concat(
      MENU.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))
    );
    wrap.innerHTML = cats
      .map(
        (c) =>
          `<button class="filter-chip${c.id === activeFilter ? " is-active" : ""}" data-filter="${c.id}">
            <span class="chip-icon">${c.icon}</span>${c.name}
          </button>`
      )
      .join("");
    wrap.querySelectorAll(".filter-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = btn.getAttribute("data-filter");
        renderMenuFilters();
        renderMenu();
      });
    });
  }

  function bindSearch() {
    const input = document.getElementById("menu-search");
    input.addEventListener("input", () => {
      searchTerm = input.value.trim().toLowerCase();
      renderMenu();
    });
  }

  function renderMenu() {
    MENU = window.TCStorage.getMenu();
    const container = document.getElementById("menu-categories");
    const schedule = window.TCStorage.getSchedule();
    let categories = activeFilter === "all" ? MENU : MENU.filter((c) => c.id === activeFilter);

    let html = "";
    categories.forEach((cat) => {
      const items = cat.items.filter((item) => {
        if (!searchTerm) return true;
        return item.name.toLowerCase().includes(searchTerm) || (item.description || "").toLowerCase().includes(searchTerm);
      });
      if (items.length === 0) return;

      const isOpen = window.TCSchedule.isServiceOpenNow(cat.service);
      const hoursLabel = window.TCSchedule.formatHours(cat.service);
      const serviceName = schedule[cat.service] ? schedule[cat.service].label : "";

      html += `<div class="menu-category" id="cat-${cat.id}">
        <div class="menu-category__head">
          <h3><span class="chip-icon">${cat.icon}</span> ${cat.name}</h3>
          <span class="availability-tag ${isOpen ? "is-open" : "is-closed"}">
            ${isOpen ? "\uD83D\uDFE2 Available now" : "\uD83D\uDD34 Currently Unavailable"} \u00B7 ${serviceName}: ${hoursLabel}
          </span>
        </div>
        ${cat.servingNote ? `<p class="menu-category__note">${cat.servingNote}</p>` : ""}
        <div class="menu-grid">
          ${items.map((item) => renderCard(cat, item, isOpen)).join("")}
        </div>
      </div>`;
    });

    if (!html) {
      html = `<div class="menu-empty">No menu items match your search. Try a different keyword.</div>`;
    }
    container.innerHTML = html;

    container.querySelectorAll("[data-add-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const catId = btn.getAttribute("data-cat");
        const itemId = btn.getAttribute("data-add-item");
        openProductModal(catId, itemId);
      });
    });

    container.querySelectorAll("[data-lightbox-img]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const catId = btn.getAttribute("data-cat");
        const itemId = btn.getAttribute("data-lightbox-img");
        const cat = MENU.find((c) => c.id === catId);
        const item = cat.items.find((i) => i.id === itemId);
        openLightbox(item.image, item.name, peso(item.price));
      });
    });
  }

  function renderCard(cat, item, serviceOpen) {
    const available = item.available !== false && serviceOpen;
    const placeholder = `<div class="card-img card-img--placeholder">${cat.icon}<span>Tambayan Cawag</span></div>`;
    const img = item.image
      ? `<button type="button" class="card-img-btn" data-lightbox-img="${item.id}" data-cat="${cat.id}" aria-label="View larger photo of ${item.name}">
           <img class="card-img" ${imgAttrs(item.image, item.name + " \u2014 Tambayan Cawag")}>
         </button>`
      : placeholder;
    return `<article class="menu-card${available ? "" : " is-unavailable"}">
      <div data-img-wrap>${img}</div>
      <div class="card-body">
        <div class="card-top">
          <h4>${item.name}</h4>
          <span class="card-price">${peso(item.price)}</span>
        </div>
        ${item.description ? `<p class="card-desc">${item.description}</p>` : ""}
        ${item.bundleContents ? `<ul class="card-bundle">${item.bundleContents.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
        ${
          available
            ? `<button class="btn btn--small btn--primary" data-add-item="${item.id}" data-cat="${cat.id}">Add to Order</button>`
            : `<div class="unavailable-note">
                <strong>Currently Unavailable</strong>
                <span>${cat.name} opens ${window.TCSchedule.formatHours(cat.service)}</span>
              </div>`
        }
      </div>
    </article>`;
  }

  /* ---------------- PRODUCT MODAL ---------------- */
  function bindProductModal() {
    const modal = document.getElementById("product-modal");
    modal.querySelector(".modal-backdrop").addEventListener("click", closeProductModal);
    modal.querySelector(".modal-close").addEventListener("click", closeProductModal);
    document.getElementById("product-add-btn").addEventListener("click", confirmAddToCart);
    document.getElementById("product-qty-minus").addEventListener("click", () => stepQty(-1));
    document.getElementById("product-qty-plus").addEventListener("click", () => stepQty(1));
  }

  function stepQty(delta) {
    const el = document.getElementById("product-qty-value");
    let v = Math.max(1, Number(el.textContent) + delta);
    el.textContent = v;
  }

  function openProductModal(catId, itemId) {
    const cat = MENU.find((c) => c.id === catId);
    const item = cat.items.find((i) => i.id === itemId);
    currentModalItem = { cat, item };

    document.getElementById("product-modal-title").textContent = item.name;
    document.getElementById("product-modal-desc").textContent = item.description || "";
    document.getElementById("product-modal-price").textContent = peso(item.price);
    document.getElementById("product-qty-value").textContent = "1";

    // Serving note (Pancit)
    const servingEl = document.getElementById("product-serving-note");
    if (cat.servingNote) {
      servingEl.textContent = cat.servingNote;
      servingEl.hidden = false;
    } else {
      servingEl.hidden = true;
    }

    // Bundle contents
    const bundleEl = document.getElementById("product-bundle");
    if (item.bundleContents) {
      bundleEl.innerHTML = `<h5>Included:</h5><ul>${item.bundleContents.map((b) => `<li>${b}</li>`).join("")}</ul>`;
      bundleEl.hidden = false;
    } else {
      bundleEl.innerHTML = "";
      bundleEl.hidden = true;
    }

    // Variant options (flavor)
    const variantWrap = document.getElementById("product-variants");
    if (item.variants) {
      variantWrap.innerHTML = `<h5>${item.variants.label}</h5>
        <div class="option-pills">
          ${item.variants.options
            .map((opt, i) => `<button type="button" class="option-pill${i === 0 ? " is-active" : ""}" data-variant="${opt}">${opt}</button>`)
            .join("")}
        </div>`;
      variantWrap.hidden = false;
      variantWrap.querySelectorAll(".option-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          variantWrap.querySelectorAll(".option-pill").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
        });
      });
    } else {
      variantWrap.innerHTML = "";
      variantWrap.hidden = true;
    }

    // Add-ons (category level)
    const addOnWrap = document.getElementById("product-addons");
    if (cat.addOns && cat.addOns.length) {
      addOnWrap.innerHTML = `<h5>Add-ons</h5>
        <div class="option-list">
          ${cat.addOns
            .map(
              (a) =>
                `<label class="option-check">
                  <input type="checkbox" data-addon-id="${a.id}" data-addon-name="${a.name}" data-addon-price="${a.price}">
                  <span>${a.name}</span><span class="option-check__price">+${peso(a.price)}</span>
                </label>`
            )
            .join("")}
        </div>`;
      addOnWrap.hidden = false;
    } else {
      addOnWrap.innerHTML = "";
      addOnWrap.hidden = true;
    }

    document.getElementById("product-notes").value = "";

    const modal = document.getElementById("product-modal");
    modal.classList.add("is-open");
    document.body.classList.add("no-scroll");
  }

  function closeProductModal() {
    document.getElementById("product-modal").classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    currentModalItem = null;
  }

  function confirmAddToCart() {
    if (!currentModalItem) return;
    const { cat, item } = currentModalItem;
    const qty = Number(document.getElementById("product-qty-value").textContent);

    let variant = null;
    const activePill = document.querySelector("#product-variants .option-pill.is-active");
    if (activePill) variant = activePill.getAttribute("data-variant");

    const addOns = Array.from(document.querySelectorAll("#product-addons input[type=checkbox]:checked")).map((cb) => ({
      id: cb.getAttribute("data-addon-id"),
      name: cb.getAttribute("data-addon-name"),
      price: Number(cb.getAttribute("data-addon-price"))
    }));

    const notes = document.getElementById("product-notes").value.trim();

    window.TCCart.addLine({
      categoryId: cat.id,
      categoryName: cat.name,
      itemId: item.id,
      name: item.name,
      unitPrice: item.price,
      qty,
      variant,
      addOns,
      notes,
      bundleContents: item.bundleContents || null,
      servingNote: cat.servingNote || null
    });

    closeProductModal();
    openCartDrawer();
    toast(`${item.name} added to your order.`);
  }

  /* ---------------- CART DRAWER ---------------- */
  function bindCartDrawer() {
    document.getElementById("cart-fab").addEventListener("click", openCartDrawer);
    document.getElementById("cart-open-nav").addEventListener("click", (e) => {
      e.preventDefault();
      openCartDrawer();
    });
    document.getElementById("cart-drawer").querySelector(".modal-backdrop").addEventListener("click", closeCartDrawer);
    document.getElementById("cart-close").addEventListener("click", closeCartDrawer);
    document.getElementById("cart-clear").addEventListener("click", () => {
      if (window.TCCart.getLines().length === 0) return;
      if (confirm("Clear your entire order?")) window.TCCart.clear();
    });
    document.getElementById("cart-checkout-btn").addEventListener("click", () => {
      if (window.TCCart.getLines().length === 0) {
        toast("Your cart is empty. Add something first!");
        return;
      }
      closeCartDrawer();
      openWizard();
    });
  }

  function openCartDrawer() {
    document.getElementById("cart-drawer").classList.add("is-open");
    document.body.classList.add("no-scroll");
  }
  function closeCartDrawer() {
    document.getElementById("cart-drawer").classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  function renderCart() {
    const lines = window.TCCart.getLines();
    const count = window.TCCart.itemCount();
    document.querySelectorAll(".cart-count").forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
    });

    const listEl = document.getElementById("cart-lines");
    if (lines.length === 0) {
      listEl.innerHTML = `<div class="cart-empty">Your cart is empty. Browse the menu and tap <strong>Add to Order</strong>.</div>`;
    } else {
      listEl.innerHTML = lines
        .map((line) => {
          const addOnsText = (line.addOns || []).map((a) => a.name).join(", ");
          return `<div class="cart-line" data-line-id="${line.lineId}">
            <div class="cart-line__info">
              <strong>${line.name}</strong>
              ${line.variant ? `<span class="cart-line__meta">Flavor: ${line.variant}</span>` : ""}
              ${addOnsText ? `<span class="cart-line__meta">Add-ons: ${addOnsText}</span>` : ""}
              ${line.servingNote ? `<span class="cart-line__meta">${line.servingNote}</span>` : ""}
              ${line.bundleContents ? `<span class="cart-line__meta">${line.bundleContents.join(", ")}</span>` : ""}
              ${line.notes ? `<span class="cart-line__meta">Note: ${line.notes}</span>` : ""}
              <span class="cart-line__price">${peso(window.TCCart.lineTotal(line))}</span>
            </div>
            <div class="cart-line__controls">
              <div class="qty-stepper">
                <button class="qty-btn" data-action="dec">\u2212</button>
                <span>${line.qty}</span>
                <button class="qty-btn" data-action="inc">+</button>
              </div>
              <button class="cart-line__remove" data-action="remove" aria-label="Remove item">\uD83D\uDDD1</button>
            </div>
          </div>`;
        })
        .join("");

      listEl.querySelectorAll(".cart-line").forEach((el) => {
        const lineId = el.getAttribute("data-line-id");
        const line = lines.find((l) => l.lineId === lineId);
        el.querySelector("[data-action='inc']").addEventListener("click", () => window.TCCart.updateQty(lineId, line.qty + 1));
        el.querySelector("[data-action='dec']").addEventListener("click", () => {
          if (line.qty <= 1) window.TCCart.removeLine(lineId);
          else window.TCCart.updateQty(lineId, line.qty - 1);
        });
        el.querySelector("[data-action='remove']").addEventListener("click", () => window.TCCart.removeLine(lineId));
      });
    }

    const subtotal = window.TCCart.subtotal();
    document.querySelectorAll(".cart-subtotal-value").forEach((el) => (el.textContent = peso(subtotal)));
  }

  /* ---------------- PRE-ORDER WIZARD ---------------- */
  function bindWizard() {
    document.querySelectorAll("[data-open-wizard]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openWizard();
      })
    );
    const modal = document.getElementById("wizard-modal");
    modal.querySelector(".modal-backdrop").addEventListener("click", closeWizard);
    modal.querySelector(".modal-close").addEventListener("click", closeWizard);

    document.getElementById("wizard-step1-next").addEventListener("click", handleStep1Next);
    document.getElementById("wizard-step2-back").addEventListener("click", () => goToStep(1));
    document.getElementById("wizard-step2-next").addEventListener("click", handleStep2Next);
    document.getElementById("wizard-step3-back").addEventListener("click", () => goToStep(2));
    document.getElementById("wizard-step3-confirm").addEventListener("click", handleConfirm);
    document.getElementById("wizard-done-btn").addEventListener("click", closeWizard);
    document.getElementById("wizard-print-btn").addEventListener("click", () => window.print());

    // set date min = today
    const dateInput = document.getElementById("wizard-date");
    const today = new Date();
    dateInput.min = today.toISOString().slice(0, 10);
  }

  function openWizard() {
    if (window.TCCart.getLines().length === 0) {
      toast("Add at least one item to your order first.");
      return;
    }
    wizardStep = 1;
    goToStep(1);
    document.getElementById("wizard-modal").classList.add("is-open");
    document.body.classList.add("no-scroll");
  }

  function closeWizard() {
    document.getElementById("wizard-modal").classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  }

  function goToStep(step) {
    wizardStep = step;
    document.querySelectorAll(".wizard-step").forEach((el) => {
      el.hidden = Number(el.getAttribute("data-step")) !== step;
    });
    document.querySelectorAll(".wizard-progress__dot").forEach((el) => {
      const dotStep = Number(el.getAttribute("data-step"));
      el.classList.toggle("is-active", dotStep === step);
      el.classList.toggle("is-done", dotStep < step);
    });
    if (step === 3) renderReview();
  }

  function clearErrors(scope) {
    scope.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  }

  function handleStep1Next() {
    const form = document.getElementById("wizard-step1");
    clearErrors(form);

    wizardData.date = document.getElementById("wizard-date").value;
    wizardData.time = document.getElementById("wizard-time").value;
    wizardData.guests = document.getElementById("wizard-guests").value;
    wizardData.seating = document.getElementById("wizard-seating").value;

    const errors = window.TCReservation.validateDineInDetails(wizardData);
    if (!wizardData.guests || Number(wizardData.guests) <= 0) errors.guests = "Guest count must be greater than zero.";

    if (Object.keys(errors).length) {
      showErrors(form, errors);
      return;
    }

    const hoursCheck = window.TCReservation.validateOperatingHours(wizardData.date, wizardData.time);
    if (!hoursCheck.ok) {
      showFormBanner(form, hoursCheck.reason);
      return;
    }

    const leadCheck = window.TCReservation.validateLeadTime(wizardData.date, wizardData.time);
    if (!leadCheck.ok) {
      showFormBanner(form, leadCheck.reason);
      return;
    }

    const cartCheck = window.TCReservation.validateCartAgainstTime(wizardData.date, wizardData.time, MENU);
    if (!cartCheck.ok) {
      const names = cartCheck.unavailableLines.map((u) => u.line.name).join(", ");
      showFormBanner(
        form,
        `These items in your cart aren't served at the selected time and must be removed or the time changed: ${names}`
      );
      return;
    }

    hideFormBanner(form);
    goToStep(2);
  }

  function handleStep2Next() {
    const form = document.getElementById("wizard-step2");
    clearErrors(form);

    wizardData.fullName = document.getElementById("wizard-name").value;
    wizardData.phone = document.getElementById("wizard-phone").value;
    wizardData.email = document.getElementById("wizard-email").value;
    wizardData.specialRequest = document.getElementById("wizard-request").value;

    const errors = window.TCReservation.validateContactInfo(wizardData);
    if (Object.keys(errors).length) {
      showErrors(form, errors);
      return;
    }
    goToStep(3);
  }

  function showErrors(form, errors) {
    Object.keys(errors).forEach((key) => {
      const el = form.querySelector(`[data-error-for='${key}']`);
      if (el) el.textContent = errors[key];
    });
  }

  function showFormBanner(form, message) {
    let banner = form.querySelector(".form-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.className = "form-banner";
      form.prepend(banner);
    }
    banner.textContent = message;
    banner.hidden = false;
  }
  function hideFormBanner(form) {
    const banner = form.querySelector(".form-banner");
    if (banner) banner.hidden = true;
  }

  function renderReview() {
    const lines = window.TCCart.getLines();
    const subtotal = window.TCCart.subtotal();
    const dateObj = new Date(`${wizardData.date}T${wizardData.time}:00`);
    const dateStr = dateObj.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    const timeStr = dateObj.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

    document.getElementById("review-name").textContent = wizardData.fullName;
    document.getElementById("review-date").textContent = dateStr;
    document.getElementById("review-time").textContent = timeStr;
    document.getElementById("review-guests").textContent = wizardData.guests;
    document.getElementById("review-seating").textContent = wizardData.seating;
    document.getElementById("review-subtotal").textContent = peso(subtotal);

    document.getElementById("review-items").innerHTML = lines
      .map((line) => {
        const extras = [];
        if (line.variant) extras.push(line.variant);
        if (line.addOns && line.addOns.length) extras.push(line.addOns.map((a) => a.name).join(", "));
        return `<li>
          <span>${line.qty} \u00D7 ${line.name}${extras.length ? ` (${extras.join(" \u2013 ")})` : ""}</span>
          <span>${peso(window.TCCart.lineTotal(line))}</span>
        </li>`;
      })
      .join("");
  }

  function handleConfirm() {
    const subtotal = window.TCCart.subtotal();
    const reservation = window.TCReservation.buildReservation({
      customer: wizardData,
      dineIn: wizardData,
      cartLines: window.TCCart.getLines(),
      subtotal
    });
    window.TCStorage.addReservation(reservation);
    window.TCCart.clear();

    showConfirmation(reservation);
  }

  function showConfirmation(reservation) {
    goToStep(4);
    const dateObj = new Date(`${reservation.dineIn.date}T${reservation.dineIn.time}:00`);
    const dateStr = dateObj.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    const timeStr = dateObj.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

    document.getElementById("confirm-number").textContent = reservation.reservationNumber;
    document.getElementById("confirm-name").textContent = reservation.customer.fullName;
    document.getElementById("confirm-date").textContent = dateStr;
    document.getElementById("confirm-time").textContent = timeStr;
    document.getElementById("confirm-guests").textContent = reservation.dineIn.guests;
    document.getElementById("confirm-seating").textContent = reservation.dineIn.seating;
    document.getElementById("confirm-total").textContent = peso(reservation.subtotal);
    document.getElementById("confirm-items").innerHTML = reservation.items
      .map((line) => `<li>${line.qty} \u00D7 ${line.name}</li>`)
      .join("");
  }

  /* ---------------- ORDER LOOKUP ---------------- */
  function bindOrderLookup() {
    const btn = document.getElementById("lookup-btn");
    const input = document.getElementById("lookup-input");
    const resultEl = document.getElementById("lookup-result");

    btn.addEventListener("click", doLookup);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doLookup();
    });

    function doLookup() {
      const value = input.value.trim().toUpperCase();
      if (!value) {
        resultEl.innerHTML = `<p class="lookup-error">Please enter a reservation number.</p>`;
        return;
      }
      const reservation = window.TCStorage.findReservation(value);
      if (!reservation) {
        resultEl.innerHTML = `<p class="lookup-error">No reservation found for "${value}". Please check the number and try again.</p>`;
        return;
      }
      const statusIcons = {
        "Pending Confirmation": "\uD83D\uDFE1",
        Confirmed: "\uD83D\uDFE2",
        Preparing: "\uD83D\uDD35",
        Completed: "\u26AA",
        Cancelled: "\uD83D\uDD34"
      };
      const dateObj = new Date(`${reservation.dineIn.date}T${reservation.dineIn.time}:00`);
      resultEl.innerHTML = `<div class="lookup-card">
        <div class="lookup-card__status">${statusIcons[reservation.status] || ""} ${reservation.status}</div>
        <div class="lookup-card__row"><span>Reservation</span><strong>${reservation.reservationNumber}</strong></div>
        <div class="lookup-card__row"><span>Name</span><strong>${reservation.customer.fullName}</strong></div>
        <div class="lookup-card__row"><span>Date & Time</span><strong>${dateObj.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}, ${dateObj.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}</strong></div>
        <div class="lookup-card__row"><span>Guests</span><strong>${reservation.dineIn.guests}</strong></div>
        <div class="lookup-card__row"><span>Total</span><strong>${peso(reservation.subtotal)}</strong></div>
      </div>`;
    }
  }

  /* ---------------- TOAST ---------------- */
  let toastTimer = null;
  function toast(message) {
    let el = document.getElementById("tc-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "tc-toast";
      el.className = "tc-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2400);
  }
})();
