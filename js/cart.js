const STORAGE_KEY = "tambayan-cawag-v2-cart";

function emptyCart() {
  return { items: [] };
}

export function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCart();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return emptyCart();
    return {
      items: parsed.items
        .filter((item) => item && item.id && item.quantity > 0)
        .map((item) => ({
          id: String(item.id),
          name: String(item.name || "Item"),
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          menu_type: item.menu_type === "cafe" ? "cafe" : "restaurant",
          image_url: item.image_url || "",
          available: item.available !== false,
        })),
    };
  } catch {
    return emptyCart();
  }
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  document.dispatchEvent(new CustomEvent("cart:change", { detail: cart }));
}

export function getCartCount(cart = loadCart()) {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal(cart = loadCart()) {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function addToCart(item, quantity = 1) {
  if (!item || !item.id) return loadCart();
  if (item.available === false) return loadCart();

  const cart = loadCart();
  const existing = cart.items.find((row) => row.id === String(item.id));
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({
      id: String(item.id),
      name: item.name,
      price: Number(item.price) || 0,
      quantity,
      menu_type: item.menu_type === "cafe" ? "cafe" : "restaurant",
      image_url: item.image_url || "",
      available: true,
    });
  }
  saveCart(cart);
  return cart;
}

export function setQuantity(id, quantity) {
  const cart = loadCart();
  const next = Math.max(0, Number(quantity) || 0);
  cart.items = cart.items
    .map((item) => (item.id === String(id) ? { ...item, quantity: next } : item))
    .filter((item) => item.quantity > 0);
  saveCart(cart);
  return cart;
}

export function changeQuantity(id, delta) {
  const cart = loadCart();
  const item = cart.items.find((row) => row.id === String(id));
  if (!item) return cart;
  return setQuantity(id, item.quantity + delta);
}

export function removeFromCart(id) {
  const cart = loadCart();
  cart.items = cart.items.filter((item) => item.id !== String(id));
  saveCart(cart);
  return cart;
}

export function clearCart() {
  const cart = emptyCart();
  saveCart(cart);
  return cart;
}

export function formatPeso(amount) {
  const value = Number(amount) || 0;
  return `₱${value.toFixed(2)}`;
}

export function bindCartBadge() {
  const nodes = document.querySelectorAll("[data-cart-count]");
  const paint = () => {
    const count = getCartCount();
    nodes.forEach((node) => {
      node.textContent = String(count);
      node.hidden = count === 0;
    });
  };
  paint();
  document.addEventListener("cart:change", paint);
}
