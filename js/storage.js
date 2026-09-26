/* ===================================================================
   TAMBAYAN CAWAG — LOCAL STORAGE LAYER (CART ONLY)
   -------------------------------------------------------------------
   As of the Supabase migration, this file ONLY handles the shopping
   cart — genuinely temporary, single-device, client-side state that
   doesn't belong in a shared database. Everything that used to live
   here (menu, schedules, reservations, restaurant info) is now real
   Supabase data:
     - menu / categories        -> js/supabase-menu.js
     - service hours / settings -> js/supabase-settings.js
     - orders / reservations    -> js/supabase-orders.js
     - admin auth               -> js/supabase-auth.js
=================================================================== */

const STORAGE_KEYS = {
  CART: "tc_cart"
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
    if (localStorage.getItem(STORAGE_KEYS.CART) === null) {
      write(STORAGE_KEYS.CART, []);
    }
  }

  function getCart() {
    return read(STORAGE_KEYS.CART, []);
  }
  function saveCart(cart) {
    return write(STORAGE_KEYS.CART, cart);
  }

  return { init, getCart, saveCart };
})();

TCStorage.init();
window.TCStorage = TCStorage;
