import { getSupabase, formatSupabaseError, getSupabaseError } from "./supabase.js";
import {
  loadCart,
  changeQuantity,
  removeFromCart,
  clearCart,
  getCartSubtotal,
  formatPeso,
} from "./cart.js";
import { escapeHtml, imageOrPlaceholder, setNotice } from "./app.js";

function renderCart(cart) {
  const list = document.querySelector("[data-cart-list]");
  const empty = document.querySelector("[data-cart-empty]");
  const summary = document.querySelector("[data-cart-summary]");
  const form = document.querySelector("[data-order-form]");
  const subtotalNode = document.querySelector("[data-subtotal]");

  if (!list) return;

  if (cart.items.length === 0) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    if (summary) summary.hidden = true;
    if (form) form.hidden = true;
    return;
  }

  if (empty) empty.hidden = true;
  if (summary) summary.hidden = false;
  if (form) form.hidden = false;
  if (subtotalNode) subtotalNode.textContent = formatPeso(getCartSubtotal(cart));

  list.innerHTML = cart.items
    .map(
      (item) => `
      <article class="cart-row">
        <div class="cart-media">${imageOrPlaceholder(item.image_url, item.name)}</div>
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p class="muted">${item.menu_type === "cafe" ? "Cafe" : "Restaurant"} · ${formatPeso(item.price)}</p>
          <div class="qty">
            <button type="button" data-qty="-1" data-id="${escapeHtml(item.id)}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-qty="1" data-id="${escapeHtml(item.id)}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-side">
          <strong>${formatPeso(item.price * item.quantity)}</strong>
          <button class="text-btn" type="button" data-remove="${escapeHtml(item.id)}">Remove</button>
        </div>
      </article>
    `
    )
    .join("");
}

async function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const notice = document.querySelector("[data-order-notice]");
  const confirmBox = document.querySelector("[data-order-confirm]");
  const cart = loadCart();

  if (cart.items.length === 0) {
    setNotice(notice, "error", "Your order is empty.");
    return;
  }

  const payload = {
    customer_name: form.customer_name.value.trim(),
    customer_phone: form.customer_phone.value.trim(),
    customer_notes: form.customer_notes.value.trim(),
    fulfillment: form.fulfillment.value,
    status: "received",
    subtotal: getCartSubtotal(cart),
  };

  if (!payload.customer_name || !payload.customer_phone) {
    setNotice(notice, "error", "Please enter your name and phone number.");
    return;
  }

  const submit = form.querySelector("[type='submit']");
  submit.disabled = true;
  submit.textContent = "Sending order...";

  const client = getSupabase();
  if (!client) {
    submit.disabled = false;
    submit.textContent = "Place order";
    setNotice(
      notice,
      "error",
      getSupabaseError() || "Orders need Supabase. Add your project keys in js/config.js, then try again."
    );
    return;
  }

  const { data: order, error } = await client.from("orders").insert(payload).select("id, created_at").single();
  if (error || !order) {
    submit.disabled = false;
    submit.textContent = "Place order";
    setNotice(notice, "error", formatSupabaseError(error, "Unable to submit order. Please try again."));
    return;
  }

  const lines = cart.items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.id.startsWith("local-") ? null : item.id,
    name: item.name,
    menu_type: item.menu_type,
    unit_price: item.price,
    quantity: item.quantity,
    line_total: item.price * item.quantity,
  }));

  const { error: lineError } = await client.from("order_items").insert(lines);
  if (lineError) {
    submit.disabled = false;
    submit.textContent = "Place order";
    setNotice(
      notice,
      "error",
      "The order was created but line items failed to save. Please call the restaurant and mention your name."
    );
    return;
  }

  clearCart();
  renderCart(loadCart());
  form.reset();
  submit.disabled = false;
  submit.textContent = "Place order";
  setNotice(notice, "", "");
  if (confirmBox) {
    confirmBox.hidden = false;
    confirmBox.innerHTML = `
      <div class="notice notice-success">
        <strong>Order received.</strong>
        <p>Thank you, ${escapeHtml(payload.customer_name)}. Reference: ${escapeHtml(order.id.slice(0, 8).toUpperCase())}. We’ll prepare it for ${escapeHtml(payload.fulfillment)}.</p>
      </div>
    `;
    confirmBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

if (document.body?.dataset.page === "order") {
  document.addEventListener("DOMContentLoaded", () => {
    renderCart(loadCart());
    document.addEventListener("cart:change", (event) => renderCart(event.detail));

    document.querySelector("[data-cart-list]")?.addEventListener("click", (event) => {
      const qty = event.target.closest("[data-qty]");
      if (qty) changeQuantity(qty.dataset.id, Number(qty.dataset.qty));
      const remove = event.target.closest("[data-remove]");
      if (remove) removeFromCart(remove.dataset.remove);
    });

    document.querySelector("[data-order-form]")?.addEventListener("submit", (event) => {
      submitOrder(event).catch((error) => {
        console.error(error);
        setNotice(document.querySelector("[data-order-notice]"), "error", "Unable to submit order. Please try again.");
      });
    });
  });
}
