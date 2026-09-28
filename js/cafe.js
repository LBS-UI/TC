import { initMenuPage } from "./menu.js";

if (document.body?.dataset.page === "cafe") {
  document.addEventListener("DOMContentLoaded", () => {
    initMenuPage("cafe").catch((error) => {
      console.error(error);
      const grid = document.querySelector("[data-menu-grid]");
      if (grid) grid.innerHTML = `<div class="state state-error">Unable to load the cafe menu. Please try again.</div>`;
    });
  });
}
