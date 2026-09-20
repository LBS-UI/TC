/* ===================================================================
   TAMBAYAN CAWAG — RESERVATION LOGIC
   -------------------------------------------------------------------
   Validation and object-building for the Dine-In Pre-Order flow.
   Kept separate from DOM code in main.js so the rules here can be
   reused independently of the UI. Reads schedule/lead-time from the
   live Supabase cache (js/supabase-settings.js) and re-verifies cart
   prices against the live Supabase menu cache (js/supabase-menu.js)
   before an order is ever submitted — see reverifyCartAgainstMenu().
=================================================================== */

const TCReservation = (function () {
  const PH_PHONE_RE = /^(09\d{9}|\+639\d{9})$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Firestore stores machine-readable lowercase statuses; the UI shows
  // friendlier labels. This is the single place that mapping lives.
  const STATUS_LABELS = {
    pending: "Pending Confirmation",
    confirmed: "Confirmed",
    preparing: "Preparing",
    completed: "Completed",
    cancelled: "Cancelled"
  };
  const STATUS_ICONS = {
    pending: "\uD83D\uDFE1",
    confirmed: "\uD83D\uDFE2",
    preparing: "\uD83D\uDD35",
    completed: "\u26AA",
    cancelled: "\uD83D\uDD34"
  };

  function validateContactInfo({ fullName, phone, email, guests }) {
    const errors = {};
    if (!fullName || !fullName.trim()) errors.fullName = "Full name is required.";
    if (!phone || !phone.trim()) {
      errors.phone = "Contact number is required.";
    } else if (!PH_PHONE_RE.test(phone.trim().replace(/[\s-]/g, ""))) {
      errors.phone = "Enter a valid PH mobile number (e.g. 09171234567).";
    }
    if (email && email.trim() && !EMAIL_RE.test(email.trim())) {
      errors.email = "Enter a valid email address.";
    }
    if (!guests || Number(guests) <= 0) {
      errors.guests = "Guest count must be greater than zero.";
    }
    return errors;
  }

  function validateDineInDetails({ date, time }) {
    const errors = {};
    if (!date) errors.date = "Please choose a date.";
    if (!time) errors.time = "Please choose a time.";
    if (date && time) {
      const chosen = new Date(`${date}T${time}:00`);
      if (isNaN(chosen.getTime())) {
        errors.date = "That date/time is not valid.";
      }
    }
    return errors;
  }

  // Returns { ok, reason } — reason is a user-facing message when !ok
  function validateOperatingHours(date, time) {
    const chosen = new Date(`${date}T${time}:00`);
    if (isNaN(chosen.getTime())) return { ok: false, reason: "Please choose a valid date and time." };

    const schedule = window.TCSettings.getCachedSchedule();
    const anyOpen = Object.keys(schedule).some((key) =>
      window.TCSchedule.isServiceOpenAt(key, chosen)
    );
    if (!anyOpen) {
      return {
        ok: false,
        reason: "Sorry, this service is currently unavailable at your selected time. Please choose another time."
      };
    }
    return { ok: true };
  }

  // Checks each cart line's category service against the chosen dine-in time.
  // Returns { ok, unavailableLines: [...] }
  function validateCartAgainstTime(date, time, menu) {
    const chosen = new Date(`${date}T${time}:00`);
    const lines = window.TCCart.getLines();
    const unavailable = [];
    lines.forEach((line) => {
      const category = menu.find((c) => c.id === line.categoryId);
      if (!category) return;
      if (!window.TCSchedule.isServiceOpenAt(category.service, chosen)) {
        unavailable.push({ line, category });
      }
    });
    return { ok: unavailable.length === 0, unavailableLines: unavailable };
  }

  function validateLeadTime(date, time) {
    const chosen = new Date(`${date}T${time}:00`);
    const now = new Date();
    const leadMinutes = window.TCSettings.getCachedLeadMinutes();
    const diffMinutes = (chosen.getTime() - now.getTime()) / 60000;
    if (diffMinutes < leadMinutes) {
      return {
        ok: false,
        reason: `Pre-orders need at least ${leadMinutes} minutes' notice. Please choose a later time.`
      };
    }
    return { ok: true };
  }

  /**
   * PRICE SECURITY: never trust the price/qty math already sitting in
   * the client-side cart. Re-derive every line's unit price and
   * add-on prices from the live Firestore-backed menu cache right
   * before submission. Items that no longer exist or are no longer
   * available are dropped and reported back so the UI can warn the
   * customer instead of silently submitting a wrong total.
   */
  function reverifyCartAgainstMenu(cartLines, menu) {
    const verifiedLines = [];
    const removed = [];

    cartLines.forEach((line) => {
      const category = menu.find((c) => c.id === line.categoryId);
      const trustedItem = category ? category.items.find((i) => i.id === line.itemId) : null;

      if (!category || !trustedItem || trustedItem.available === false) {
        removed.push(line);
        return;
      }

      // Re-price any selected add-ons against the category's current
      // trusted add-on list (by id), rather than trusting the price
      // the client cart line already carries.
      const trustedAddOns = (line.addOns || [])
        .map((a) => {
          const match = (category.addOns || []).find((ca) => ca.id === a.id);
          return match ? { id: match.id, name: match.name, price: match.price } : null;
        })
        .filter(Boolean);

      verifiedLines.push(Object.assign({}, line, {
        name: trustedItem.name,
        unitPrice: trustedItem.price,
        addOns: trustedAddOns
      }));
    });

    const subtotal = verifiedLines.reduce((sum, l) => {
      const addOnsTotal = (l.addOns || []).reduce((s, a) => s + a.price, 0);
      return sum + (l.unitPrice + addOnsTotal) * l.qty;
    }, 0);

    return { ok: removed.length === 0, verifiedLines, removed, subtotal };
  }

  /** Shapes wizard state + verified cart lines into the Firestore order payload. */
  function buildOrderPayload({ customer, dineIn, verifiedLines, subtotal }) {
    return {
      customerName: customer.fullName.trim(),
      phone: customer.phone.trim(),
      email: (customer.email || "").trim(),
      specialInstructions: (customer.specialRequest || "").trim(),
      date: dineIn.date,
      time: dineIn.time,
      guests: Number(dineIn.guests),
      seating: dineIn.seating,
      items: verifiedLines,
      subtotal
    };
  }

  return {
    STATUS_LABELS,
    STATUS_ICONS,
    validateContactInfo,
    validateDineInDetails,
    validateOperatingHours,
    validateCartAgainstTime,
    validateLeadTime,
    reverifyCartAgainstMenu,
    buildOrderPayload
  };
})();

window.TCReservation = TCReservation;
