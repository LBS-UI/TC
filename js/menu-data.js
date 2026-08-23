/* ===================================================================
   TAMBAYAN CAWAG — MENU DATA
   -------------------------------------------------------------------
   This file is the single source of truth for every menu item, price,
   category, and option shown on the site. It was transcribed directly
   from the restaurant's printed menu.

   HOW TO EDIT (for the restaurant owner / staff):
   - To change a PRICE: edit the `price` number for that item.
   - To ADD an item: copy an existing item object inside the right
     category's `items` array and change its fields. Give it a unique
     `id`.
   - To REMOVE an item: delete its object from the `items` array
     (or set `available: false` to just hide it from ordering while
     keeping it listed).
   - To change SERVICE HOURS, see SERVICE_SCHEDULE below — this
     controls the "Currently Unavailable" logic sitewide.
   - Anything wrapped in [ ] is a placeholder meant to be replaced.

   Everything here is also mirrored into localStorage on first load
   (see storage.js) so admin edits persist across sessions without
   touching this file. This file only supplies the ORIGINAL DEFAULTS.
=================================================================== */

/* ---------- 1. SERVICE SCHEDULE ----------
   Two independent services. A menu category belongs to one service.
   Hours are in 24-hour "HH:MM" format. Closing "24:00" means midnight
   (12:00 MN). These defaults can be edited later from the Admin
   dashboard (Service Schedule tab) without touching this file. */
const DEFAULT_SERVICE_SCHEDULE = {
  goto: {
    label: "Go-To \u2022 Snacks \u2022 Silog",
    open: "10:00",
    close: "24:00"
  },
  cafe: {
    label: "Cafe",
    open: "13:00",
    close: "24:00"
  }
};

/* ---------- 2. PRE-ORDER LEAD TIME ----------
   Minimum number of minutes required between "now" and the earliest
   dine-in time a customer may select. Editable in Admin later. */
const DEFAULT_PREORDER_LEAD_MINUTES = 30;

/* ---------- 3. MENU IMAGES ----------
   Centralized image configuration. Every menu item's `image` field
   points here instead of a URL scattered inline — no image path is
   ever written inline in an item or in the HTML.

   These are LOCAL asset paths only (no internet/CDN URLs). Place the
   restaurant's real food photos at the paths below and they will
   appear automatically everywhere that item is shown (menu cards,
   lightbox, cart, product modal) — nothing else in the code needs to
   change. Until a real photo is placed at a given path, the image
   fallback system (see main.js) automatically shows
   assets/menu/placeholder.png instead of a broken image. */
const MENU_IMAGES = {
  bangsilog: "assets/menu/bangsilog.png",
  chicksilog: "assets/menu/chicksilog.png",
  tapsilog: "assets/menu/tapsilog.png",
  tosilog: "assets/menu/tosilog.png",
  hotsilog: "assets/menu/hotsilog.png",
  cornsilog: "assets/menu/cornsilog.png",
  longsilog: "assets/menu/longsilog.png",
  hamsilog: "assets/menu/hamsilog.png",

  friedChicken: "assets/menu/fried-chicken.png",
  familyBundle: "assets/menu/family-bundle.png",

  plainLugaw: "assets/menu/plain-lugaw.png",
  eggCaldo: "assets/menu/egg-caldo.png",
  arrozcaldo: "assets/menu/arrozcaldo.png",
  goto: "assets/menu/goto.png",
  overload: "assets/menu/overload.png",

  beefMami: "assets/menu/beef-mami.png",

  fries: "assets/menu/fries.png",
  nachos: "assets/menu/nachos.png",
  burger: "assets/menu/burger.png",
  sandwich: "assets/menu/sandwich.png",

  shanghaiRolls: "assets/menu/shanghai-rolls.png",
  tokwaBaboy: "assets/menu/tokwa-baboy.png",
  chicharonBulaklak: "assets/menu/chicharon-bulaklak.png",
  sisig: "assets/menu/sisig.png",
  beefPapaitan: "assets/menu/beef-papaitan.png",

  bihon: "assets/menu/bihon.png",
  canton: "assets/menu/canton.png",
  mixCantonBihon: "assets/menu/mix-canton-bihon.png",

  bottledWater: "assets/menu/bottled-water.png",
  c2: "assets/menu/c2.png",
  pineappleJuice: "assets/menu/pineapple-juice.png",
  icedTea: "assets/menu/iced-tea.png",
  softdrinks: "assets/menu/softdrinks.png"
};

/* Fallback shown whenever a local menu image above doesn't exist yet
   or fails to load. See imgAttrs()'s onerror handler in main.js. */
const MENU_IMAGE_PLACEHOLDER = "assets/menu/placeholder.png";

/* ---------- 4. MENU CATEGORIES & ITEMS ---------- */
const DEFAULT_MENU = [
  {
    id: "silog",
    name: "Silog",
    service: "goto",
    icon: "\uD83C\uDF73",
    description: "Filipino breakfast-style rice meals, served all day.",
    items: [
      { id: "silog-bang", name: "Bangsilog", description: "Marinated milkfish, garlic fried rice & egg.", price: 125, image: MENU_IMAGES.bangsilog, available: true },
      { id: "silog-chick", name: "Chicksilog", description: "Fried chicken, garlic fried rice & egg.", price: 125, image: MENU_IMAGES.chicksilog, available: true },
      { id: "silog-tap", name: "Tapsilog", description: "Beef tapa, garlic fried rice & egg.", price: 110, image: MENU_IMAGES.tapsilog, available: true },
      { id: "silog-tosi", name: "Tosilog", description: "Sweet cured pork tocino, garlic fried rice & egg.", price: 100, image: MENU_IMAGES.tosilog, available: true },
      { id: "silog-hot", name: "Hotsilog", description: "Hotdog, garlic fried rice & egg.", price: 90, image: MENU_IMAGES.hotsilog, available: true },
      { id: "silog-corn", name: "Cornsilog", description: "Corned beef, garlic fried rice & egg.", price: 90, image: MENU_IMAGES.cornsilog, available: true },
      { id: "silog-long", name: "Longsilog", description: "Filipino sweet longganisa, garlic fried rice & egg.", price: 90, image: MENU_IMAGES.longsilog, available: true },
      { id: "silog-ham", name: "Hamsilog", description: "Ham, garlic fried rice & egg.", price: 90, image: MENU_IMAGES.hamsilog, available: true }
    ]
  },
  {
    id: "friedchicken",
    name: "Fried Chicken",
    service: "goto",
    icon: "\uD83C\uDF57",
    description: "Crispy fried chicken, solo or in barkada-sized bundles.",
    items: [
      { id: "fc-solo", name: "Solo Fried Chicken", description: "One crispy fried chicken piece.", price: 70, image: MENU_IMAGES.friedChicken, available: true },
      { id: "fc-solo-rice", name: "Solo Fried Chicken w/ Plain Rice", description: "One crispy fried chicken piece with plain rice.", price: 90, image: MENU_IMAGES.friedChicken, available: true },
      {
        id: "fc-barkada", name: "Barkada Treats", description: "Good for sharing with your barkada.", price: 299, image: MENU_IMAGES.friedChicken, available: true,
        bundleContents: ["5 pcs Fried Chicken"]
      },
      {
        id: "fc-family", name: "Family Bundle", description: "Good for 4\u20136 people.", price: 599, image: MENU_IMAGES.familyBundle, available: true,
        bundleContents: ["6 pcs Fried Chicken", "6 Plain Rice", "15 pcs Shanghai Rolls", "1 Softdrinks 1.5L", "Soup"]
      }
    ]
  },
  {
    id: "lugaw",
    name: "Lugaw",
    service: "goto",
    icon: "\uD83C\uDF5A",
    description: "Warm Filipino rice porridge, from plain to fully loaded.",
    items: [
      { id: "lugaw-plain", name: "Plain Lugaw", description: "", price: 35, image: MENU_IMAGES.plainLugaw, available: true },
      { id: "lugaw-egg", name: "Egg Caldo", description: "", price: 50, image: MENU_IMAGES.eggCaldo, available: true },
      { id: "lugaw-arroz", name: "Arrozcaldo", description: "", price: 60, image: MENU_IMAGES.arrozcaldo, available: true },
      { id: "lugaw-goto", name: "Goto", description: "", price: 65, image: MENU_IMAGES.goto, available: true },
      { id: "lugaw-overload", name: "Overload", description: "Chicken, beef & egg toppings.", price: 95, image: MENU_IMAGES.overload, available: true }
    ],
    addOns: [
      { id: "addon-boiledegg", name: "Boiled Egg", price: 20 },
      { id: "addon-chicharon-lugaw", name: "Chicharon Bulaklak", price: 30 },
      { id: "addon-plainrice", name: "Plain Rice", price: 20 },
      { id: "addon-garlicrice", name: "Garlic Rice", price: 25 }
    ]
  },
  {
    id: "mami",
    name: "Mami",
    service: "goto",
    icon: "\uD83C\uDF5C",
    description: "Beef noodle soup, with or without egg.",
    items: [
      { id: "mami-noegg", name: "Beef Mami without Egg", description: "", price: 60, image: MENU_IMAGES.beefMami, available: true },
      { id: "mami-egg", name: "Beef Mami with Egg", description: "", price: 75, image: MENU_IMAGES.beefMami, available: true }
    ],
    addOns: [
      { id: "addon-chicharon-mami", name: "Chicharon Bulaklak", price: 30 },
      { id: "addon-plainrice-mami", name: "Plain Rice", price: 20 },
      { id: "addon-garlicrice-mami", name: "Garlic Rice", price: 25 }
    ]
  },
  {
    id: "snacks",
    name: "Snacks",
    service: "goto",
    icon: "\uD83C\uDF54",
    description: "Fries, nachos, burgers & sandwiches for quick cravings.",
    items: [
      {
        id: "snack-fries", name: "Fries", description: "Choose your flavor.", price: 80, image: MENU_IMAGES.fries, available: true,
        variants: { label: "Flavor", options: ["Classic", "Cheese", "Barbeque", "Sour & Cream"] }
      },
      { id: "snack-nachos-plain", name: "Plain Nachos", description: "", price: 110, image: MENU_IMAGES.nachos, available: true },
      { id: "snack-nachos-beef", name: "Beef Nachos", description: "", price: 145, image: MENU_IMAGES.nachos, available: true },
      { id: "snack-burger-plain", name: "Plain Burger", description: "", price: 75, image: MENU_IMAGES.burger, available: true },
      { id: "snack-burger-cheese", name: "Cheese Burger", description: "", price: 85, image: MENU_IMAGES.burger, available: true },
      { id: "snack-sandwich-egg", name: "Egg Sandwich", description: "", price: 70, image: MENU_IMAGES.sandwich, available: true },
      { id: "snack-sandwich-hotdog", name: "Hotdog Sandwich", description: "", price: 80, image: MENU_IMAGES.sandwich, available: true },
      { id: "snack-sandwich-ham", name: "Ham Sandwich", description: "", price: 70, image: MENU_IMAGES.sandwich, available: true },
      { id: "snack-sandwich-hamegg", name: "Ham & Egg Sandwich", description: "", price: 80, image: MENU_IMAGES.sandwich, available: true },
      { id: "snack-sandwich-hameggcheese", name: "Ham & Egg with Cheese Sandwich", description: "", price: 90, image: MENU_IMAGES.sandwich, available: true }
    ],
    addOns: [
      { id: "addon-cheese", name: "Cheese", price: 15 },
      { id: "addon-egg", name: "Egg", price: 20 }
    ]
  },
  {
    id: "specials",
    name: "Specials / Sharing",
    service: "goto",
    icon: "\uD83E\uDD58",
    description: "Pulutan and sharing plates for the barkada.",
    items: [
      { id: "special-shanghai", name: "Shanghai Rolls (25 pieces)", description: "", price: 100, image: MENU_IMAGES.shanghaiRolls, available: true },
      { id: "special-tokwatbaboy", name: "Tokwa't Baboy", description: "", price: 130, image: MENU_IMAGES.tokwaBaboy, available: true },
      { id: "special-chicharon", name: "Chicharon Bulaklak", description: "", price: 150, image: MENU_IMAGES.chicharonBulaklak, available: true },
      { id: "special-sisig", name: "Sisig", description: "", price: 150, image: MENU_IMAGES.sisig, available: true },
      { id: "special-papaitan", name: "Beef Papaitan", description: "", price: 130, image: MENU_IMAGES.beefPapaitan, available: true }
    ]
  },
  {
    id: "pancit",
    name: "Pancit",
    service: "goto",
    icon: "\uD83C\uDF5C",
    description: "Good for 2\u20133 pax.",
    servingNote: "Good for 2\u20133 people",
    items: [
      { id: "pancit-bihon", name: "Bihon", description: "Good for 2\u20133 pax.", price: 179, image: MENU_IMAGES.bihon, available: true },
      { id: "pancit-canton", name: "Canton", description: "Good for 2\u20133 pax.", price: 189, image: MENU_IMAGES.canton, available: true },
      { id: "pancit-mix", name: "Mix Canton Bihon", description: "Good for 2\u20133 pax.", price: 199, image: MENU_IMAGES.mixCantonBihon, available: true }
    ]
  },
  {
    id: "drinks",
    name: "Drinks",
    service: "goto",
    icon: "\uD83E\uDD64",
    description: "Cold drinks, juices & softdrinks.",
    items: [
      { id: "drink-water350", name: "Bottled Water 350ml", description: "", price: 20, image: MENU_IMAGES.bottledWater, available: true },
      { id: "drink-water500", name: "Bottled Water 500ml", description: "", price: 25, image: MENU_IMAGES.bottledWater, available: true },
      { id: "drink-c2solo", name: "C2 Solo", description: "", price: 25, image: MENU_IMAGES.c2, available: true },
      { id: "drink-c2-1.5l", name: "C2 1.5L", description: "", price: 40, image: MENU_IMAGES.c2, available: true },
      { id: "drink-pineapple", name: "Pineapple Juice", description: "", price: 50, image: MENU_IMAGES.pineappleJuice, available: true },
      { id: "drink-icedtea-glass", name: "Iced Tea Glass", description: "", price: 40, image: MENU_IMAGES.icedTea, available: true },
      { id: "drink-icedtea-pitcher", name: "Iced Tea Pitcher", description: "", price: 120, image: MENU_IMAGES.icedTea, available: true },
      {
        id: "drink-mismo", name: "Mismo Softdrinks", description: "Choose your flavor.", price: 30, image: MENU_IMAGES.softdrinks, available: true,
        variants: { label: "Flavor", options: ["Coke", "Sprite", "Royal", "Mountain Dew"] }
      },
      {
        id: "drink-1.5l", name: "1.5L Softdrinks", description: "Choose your flavor.", price: 100, image: MENU_IMAGES.softdrinks, available: true,
        variants: { label: "Flavor", options: ["Coke", "Coke Zero", "Royal", "Sprite"] }
      }
    ]
  }
];

window.MENU_IMAGES = MENU_IMAGES;
window.MENU_IMAGE_PLACEHOLDER = MENU_IMAGE_PLACEHOLDER;

/* Exposed globally so other scripts (storage.js, admin.js, main.js) can use it */
window.DEFAULT_SERVICE_SCHEDULE = DEFAULT_SERVICE_SCHEDULE;
window.DEFAULT_PREORDER_LEAD_MINUTES = DEFAULT_PREORDER_LEAD_MINUTES;
window.DEFAULT_MENU = DEFAULT_MENU;
