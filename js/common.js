(function () {
  "use strict";
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var filter = document.getElementById("tool-filter");
  if (filter) {
    var cards = document.querySelectorAll("[data-tool-card]");
    var empty = document.getElementById("filter-empty");
    filter.addEventListener("input", function () {
      var q = filter.value.trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var hay = (card.getAttribute("data-search") || card.textContent).toLowerCase();
        var ok = !q || hay.indexOf(q) !== -1;
        card.classList.toggle("hidden", !ok);
        if (ok) shown += 1;
      });
      if (empty) empty.classList.toggle("hidden", shown > 0);
    });
  }

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
