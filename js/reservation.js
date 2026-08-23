/* ===================================================================
   TAMBAYAN CAWAG — RESERVATION LOGIC
   -------------------------------------------------------------------
   Validation and object-building for the Dine-In Pre-Order flow.
   Kept separate from DOM code in main.js so the rules here can be
   unit-tested or reused (e.g. by a future backend) on their own.
=================================================================== */

const TCReservation = (function () {
  const PH_PHONE_RE = /^(09\d{9}|\+639\d{9})$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

    const schedule = window.TCStorage.getSchedule();
    const anyOpen = Object.keys(schedule).some((key) =>
      window.TCSchedule.isServiceOpenAt(key, chosen)
    );
    if (!anyOpen) {
      return {
        ok: false,
        reason: "Sorry, this service is unavailable at this time. Please choose another time."
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
    const leadMinutes = window.TCStorage.getLeadMinutes();
    const diffMinutes = (chosen.getTime() - now.getTime()) / 60000;
    if (diffMinutes < leadMinutes) {
      return {
        ok: false,
        reason: `Pre-orders need at least ${leadMinutes} minutes' notice. Please choose a later time.`
      };
    }
    return { ok: true };
  }

  function buildReservation({ customer, dineIn, cartLines, subtotal }) {
    return {
      reservationNumber: window.TCStorage.nextReservationNumber(),
      status: "Pending Confirmation",
      createdAt: new Date().toISOString(),
      customer: {
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        email: (customer.email || "").trim(),
        specialRequest: (customer.specialRequest || "").trim()
      },
      dineIn: {
        date: dineIn.date,
        time: dineIn.time,
        guests: Number(dineIn.guests),
        seating: dineIn.seating
      },
      items: cartLines,
      subtotal
    };
  }

  return {
    validateContactInfo,
    validateDineInDetails,
    validateOperatingHours,
    validateCartAgainstTime,
    validateLeadTime,
    buildReservation
  };
})();

window.TCReservation = TCReservation;
