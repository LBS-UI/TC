/* ===================================================================
   TAMBAYAN CAWAG — STORAGE LAYER
   -------------------------------------------------------------------
   All persistence goes through this module. Today it wraps
   localStorage; tomorrow it can be swapped for Firebase / Supabase /
   a REST API by rewriting the functions below without touching any
   UI code that calls them. Every UI-facing function returns a plain
   value or Promise-free result so this stays a drop-in swap point.
=================================================================== */

const STORAGE_KEYS = {
  MENU: "tc_menu",
  SCHEDULE: "tc_schedule",
  LEAD_MINUTES: "tc_lead_minutes",
  CART: "tc_cart",
  RESERVATIONS: "tc_reservations",
  RESERVATION_SEQ: "tc_reservation_seq",
  RESTAURANT_INFO: "tc_restaurant_info"
};

const DEFAULT_RESTAURANT_INFO = {
  name: "Tambayan Cawag",
  tagline: "Cafe \u2022 Grill \u2022 Resto \u2022 Bar",
  established: "2026",
  location: "Cawag, Subic, Zambales",
  phone: "[Restaurant Phone Number]",
  email: "[Restaurant Email]",
  facebook: "[Facebook Page]",
  mapsLink: "[Exact Location / Google Maps Link]"
};

const TCStorage = (function () {
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("TCStorage read error for", key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("TCStorage write error for", key, e);
      return false;
    }
  }

  function init() {
    if (localStorage.getItem(STORAGE_KEYS.MENU) === null) {
      write(STORAGE_KEYS.MENU, window.DEFAULT_MENU);
    }
    if (localStorage.getItem(STORAGE_KEYS.SCHEDULE) === null) {
      write(STORAGE_KEYS.SCHEDULE, window.DEFAULT_SERVICE_SCHEDULE);
    }
    if (localStorage.getItem(STORAGE_KEYS.LEAD_MINUTES) === null) {
      write(STORAGE_KEYS.LEAD_MINUTES, window.DEFAULT_PREORDER_LEAD_MINUTES);
    }
    if (localStorage.getItem(STORAGE_KEYS.CART) === null) {
      write(STORAGE_KEYS.CART, []);
    }
    if (localStorage.getItem(STORAGE_KEYS.RESERVATIONS) === null) {
      write(STORAGE_KEYS.RESERVATIONS, []);
    }
    if (localStorage.getItem(STORAGE_KEYS.RESERVATION_SEQ) === null) {
      write(STORAGE_KEYS.RESERVATION_SEQ, 0);
    }
    if (localStorage.getItem(STORAGE_KEYS.RESTAURANT_INFO) === null) {
      write(STORAGE_KEYS.RESTAURANT_INFO, DEFAULT_RESTAURANT_INFO);
    }
  }

  // ---------- Menu ----------
  function getMenu() {
    return read(STORAGE_KEYS.MENU, window.DEFAULT_MENU);
  }
  function saveMenu(menu) {
    return write(STORAGE_KEYS.MENU, menu);
  }
  function resetMenu() {
    return write(STORAGE_KEYS.MENU, window.DEFAULT_MENU);
  }

  // ---------- Schedule ----------
  function getSchedule() {
    return read(STORAGE_KEYS.SCHEDULE, window.DEFAULT_SERVICE_SCHEDULE);
  }
  function saveSchedule(schedule) {
    return write(STORAGE_KEYS.SCHEDULE, schedule);
  }

  // ---------- Lead time ----------
  function getLeadMinutes() {
    return read(STORAGE_KEYS.LEAD_MINUTES, window.DEFAULT_PREORDER_LEAD_MINUTES);
  }
  function saveLeadMinutes(mins) {
    return write(STORAGE_KEYS.LEAD_MINUTES, mins);
  }

  // ---------- Cart ----------
  function getCart() {
    return read(STORAGE_KEYS.CART, []);
  }
  function saveCart(cart) {
    return write(STORAGE_KEYS.CART, cart);
  }

  // ---------- Reservations ----------
  function getReservations() {
    return read(STORAGE_KEYS.RESERVATIONS, []);
  }
  function saveReservations(list) {
    return write(STORAGE_KEYS.RESERVATIONS, list);
  }
  function addReservation(reservation) {
    const list = getReservations();
    list.unshift(reservation);
    saveReservations(list);
    return reservation;
  }
  function updateReservationStatus(reservationNumber, status) {
    const list = getReservations();
    const idx = list.findIndex((r) => r.reservationNumber === reservationNumber);
    if (idx === -1) return false;
    list[idx].status = status;
    list[idx].updatedAt = new Date().toISOString();
    saveReservations(list);
    return true;
  }
  function findReservation(reservationNumber) {
    const list = getReservations();
    return list.find((r) => r.reservationNumber === reservationNumber) || null;
  }
  function nextReservationNumber() {
    let seq = read(STORAGE_KEYS.RESERVATION_SEQ, 0);
    seq += 1;
    write(STORAGE_KEYS.RESERVATION_SEQ, seq);
    const year = new Date().getFullYear();
    const padded = String(seq).padStart(5, "0");
    return `TC-${year}-${padded}`;
  }

  // ---------- Restaurant info ----------
  function getRestaurantInfo() {
    return read(STORAGE_KEYS.RESTAURANT_INFO, DEFAULT_RESTAURANT_INFO);
  }
  function saveRestaurantInfo(info) {
    return write(STORAGE_KEYS.RESTAURANT_INFO, info);
  }

  return {
    init,
    getMenu, saveMenu, resetMenu,
    getSchedule, saveSchedule,
    getLeadMinutes, saveLeadMinutes,
    getCart, saveCart,
    getReservations, saveReservations, addReservation,
    updateReservationStatus, findReservation, nextReservationNumber,
    getRestaurantInfo, saveRestaurantInfo
  };
})();

TCStorage.init();
window.TCStorage = TCStorage;
