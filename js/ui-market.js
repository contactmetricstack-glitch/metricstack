(function () {
  var M = window.MetricStack;
  var form = document.getElementById("mkt-form");
  if (!form) return;

  function show(which) {
    document.getElementById("amazon-fields").hidden = which !== "amazon";
    document.getElementById("ebay-fields").hidden = which !== "ebay";
    document.querySelectorAll("#mkt-tabs .tab").forEach(function (t) {
      t.setAttribute("aria-selected", t.getAttribute("data-tab") === which ? "true" : "false");
    });
    render();
  }
  document.querySelectorAll("#mkt-tabs .tab").forEach(function (t) {
    t.addEventListener("click", function () { show(t.getAttribute("data-tab")); });
  });

  form.elements.referralCat.addEventListener("change", function () {
    var id = form.elements.referralCat.value;
    var row = M.AMZ_REFERRAL.filter(function (r) { return r.id === id; })[0];
    if (row && row.id !== "custom") {
      form.elements.referralRate.value = (row.rate * 100).toFixed(2);
      form.elements.referralMin.value = row.min;
    }
  });

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });

  function render() {
    var which = document.querySelector("#mkt-tabs .tab[aria-selected='true']").getAttribute("data-tab");
    if (which === "amazon") renderAmazon();
    else renderEbay();
  }

  function renderAmazon() {
    var r = M.amazonProfit({
      price: form.elements.amzPrice.value,
      shippingCharged: form.elements.amzShipCharged.value,
      referralRate: M.toNum(form.elements.referralRate.value) / 100,
      referralMin: form.elements.referralMin.value,
      closingFee: form.elements.closingFee.value,
      sizeTier: form.elements.sizeTier.value,
      weightOz: form.elements.weightOz.value,
      peak: form.elements.peak.checked,
      customFba: form.elements.customFba.value,
      storage: form.elements.storage.value,
      ads: form.elements.amzAds.value,
      cogs: form.elements.amzCogs.value,
      inbound: form.elements.inbound.value
    });
    var html = kpis(r.profit, r.fees, r.margin);
    html += "<div class='table-wrap'><table><tbody>";
    html += row("Item + shipping charged", r.total);
    html += row("Referral fee", r.referral);
    html += row("FBA fulfillment (incl. 3.5% surcharge unless custom)", r.fba.fee);
    html += row("Storage / inbound / ads", r.storage + r.inbound + r.ads);
    html += row("Cost of goods", r.cogs);
    html += row("Profit", r.profit);
    html += "</tbody></table></div>";
    html += "<p class='note'>Fulfillment lookup: " + r.fba.source + ". Base " + M.money(r.fba.base) + " + surcharge " + M.money(r.fba.surcharge) + ".</p>";
    html += "<p class='prices-checked'>Referral and FBA figures checked 14 November 2026 against public US rate explanations and Amazon’s 2026 fee update. Confirm the live fee in Seller Central. Today falls in the peak window (15 October 2026 – 14 January 2027).</p>";
    document.getElementById("mkt-results").innerHTML = html;
  }

  function renderEbay() {
    var r = M.ebayProfit({
      price: form.elements.ebayPrice.value,
      shippingCharged: form.elements.ebayShipCharged.value,
      tax: form.elements.ebayTax.value,
      rate: M.toNum(form.elements.ebayRate.value) / 100,
      highRate: M.toNum(form.elements.ebayHighRate.value) / 100,
      threshold: form.elements.ebayThreshold.value,
      international: form.elements.ebayIntl.checked,
      insertion: form.elements.insertion.value,
      cogs: form.elements.ebayCogs.value,
      shipCost: form.elements.ebayShipCost.value,
      ads: form.elements.ebayAds.value
    });
    var html = kpis(r.profit, r.fees, r.margin);
    html += "<div class='table-wrap'><table><tbody>";
    html += row("Total amount of the sale (item + shipping + tax)", r.total);
    html += row("Final value fee (including per-order fee of " + M.money(r.perOrder) + ")", r.fvf);
    html += row("Insertion / promoted listing costs", r.insertion + r.ads);
    html += row("Cost of goods + your shipping cost", r.cogs + r.shipCost);
    html += row("Profit", r.profit);
    html += "</tbody></table></div>";
    html += "<p class='prices-checked'>US eBay final value fee for most categories checked 14 November 2026: 13.6% of the total sale up to $7,500 per item, then 2.35%, plus $0.30 per order of $10 or less or $0.40 above $10. Category exceptions apply. Confirm in Seller Hub.</p>";
    document.getElementById("mkt-results").innerHTML = html;
  }

  function kpis(profit, fees, margin) {
    var html = "<div class='kpi-row'>";
    html += "<div class='kpi'><span class='lbl'>Estimated profit</span><span class='val " + (profit >= 0 ? "ok" : "danger") + "'>" + M.money(profit) + "</span></div>";
    html += "<div class='kpi'><span class='lbl'>Marketplace fees</span><span class='val'>" + M.money(fees) + "</span></div>";
    html += "<div class='kpi'><span class='lbl'>Margin</span><span class='val'>" + M.pct(margin) + "</span></div>";
    html += "</div>";
    return html;
  }
  function row(label, value) {
    return "<tr><td>" + label + "</td><td class='num'>" + M.money(value) + "</td></tr>";
  }

  show("amazon");
})();
