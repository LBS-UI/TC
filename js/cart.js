/* ===================================================================
   TAMBAYAN CAWAG — CART LOGIC
   -------------------------------------------------------------------
   Cart lines are stored as plain objects in localStorage via
   TCStorage. Each line has its own uid so identical items with
   different customizations don't merge into each other.
=================================================================== */

const TCCart = (function () {
  function uid() {
    return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getLines() {
    return window.TCStorage.getCart();
  }

  function saveLines(lines) {
    window.TCStorage.saveCart(lines);
    document.dispatchEvent(new CustomEvent("tc:cart-changed"));
  }

  // line = { categoryId, itemId, name, unitPrice, qty, variant, addOns:[{id,name,price}], notes, bundleContents, servingNote }
  function addLine(line) {
    const lines = getLines();
    lines.push(Object.assign({ lineId: uid(), qty: line.qty || 1 }, line));
    saveLines(lines);
  }

  function removeLine(lineId) {
    const lines = getLines().filter((l) => l.lineId !== lineId);
    saveLines(lines);
  }

  function updateQty(lineId, qty) {
    const lines = getLines();
    const line = lines.find((l) => l.lineId === lineId);
    if (!line) return;
    line.qty = Math.max(1, qty);
    saveLines(lines);
  }

  function updateLine(lineId, patch) {
    const lines = getLines();
    const idx = lines.findIndex((l) => l.lineId === lineId);
    if (idx === -1) return;
    lines[idx] = Object.assign({}, lines[idx], patch);
    saveLines(lines);
  }

  function clear() {
    saveLines([]);
  }

  function lineTotal(line) {
    const addOnsTotal = (line.addOns || []).reduce((s, a) => s + a.price, 0);
    return (line.unitPrice + addOnsTotal) * line.qty;
  }

  function subtotal() {
    return getLines().reduce((sum, l) => sum + lineTotal(l), 0);
  }

  function itemCount() {
    return getLines().reduce((sum, l) => sum + l.qty, 0);
  }

  return { getLines, addLine, removeLine, updateQty, updateLine, clear, lineTotal, subtotal, itemCount };
})();

window.TCCart = TCCart;
