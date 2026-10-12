/**
 * Tambayan Cawag V2 — public configuration
 *
 * Paste your Supabase project URL and anon (public) key below.
 * Never put the service-role key in this file.
 */
export const CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  timezone: "Asia/Manila",
  currency: "PHP",
  restaurantName: "Tambayan Cawag",
};

export function isSupabaseConfigured() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
}

export const DEFAULT_SETTINGS = {
  restaurant_name: "Tambayan Cawag",
  tagline: "A place to hang out in Cawag.",
  short_description:
    "Tambayan Cawag is a neighborhood restaurant and cafe in Cawag, Subic, Zambales. Come for silog, snacks, and a seat that feels like home.",
  about:
    "Tambayan means hangout. Tambayan Cawag is a local spot in Cawag, Subic where you can eat, drink coffee, and stay a while. The kitchen serves go-to plates, snacks, and silog. In the afternoon the cafe opens for coffee and a quieter table.",
  address: "Cawag, Subic, Zambales",
  phone: "",
  email: "",
  facebook: "",
  restaurant_hours: { open: "10:00", close: "24:00", label: "10:00 AM – 12:00 AM" },
  cafe_hours: { open: "13:00", close: "24:00", label: "1:00 PM – 12:00 AM" },
  timezone: "Asia/Manila",
};

export const DEFAULT_CATEGORIES = [
  { id: "local-go-to", name: "Go-To", slug: "go-to", menu_type: "restaurant", sort_order: 10 },
  { id: "local-snacks", name: "Snacks", slug: "snacks", menu_type: "restaurant", sort_order: 20 },
  { id: "local-silog", name: "Silog", slug: "silog", menu_type: "restaurant", sort_order: 30 },
  { id: "local-coffee", name: "Coffee", slug: "coffee", menu_type: "cafe", sort_order: 10 },
  { id: "local-non-coffee", name: "Non-Coffee", slug: "non-coffee", menu_type: "cafe", sort_order: 20 },
  { id: "local-refreshers", name: "Refreshers", slug: "refreshers", menu_type: "cafe", sort_order: 30 },
  { id: "local-pastries", name: "Pastries", slug: "pastries", menu_type: "cafe", sort_order: 40 },
  { id: "local-desserts", name: "Desserts", slug: "desserts", menu_type: "cafe", sort_order: 50 },
  { id: "local-other", name: "Other", slug: "other", menu_type: "cafe", sort_order: 60 },
];
