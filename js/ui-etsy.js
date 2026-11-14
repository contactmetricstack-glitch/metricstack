(function () {
  var M = window.MetricStack;
  var form = document.getElementById("etsy-form");
  if (!form) return;

  function applyCountry() {
    var code = form.elements.country.value;
    var row = M.ETSY_PROCESSING[code] || M.ETSY_PROCESSING.CUSTOM;
    if (code !== "CUSTOM") {
      form.elements.procPct.value = (row.pct * 100).toFixed(2);
      form.elements.procFixed.value = row.fixed;
    }
  }
  form.elements.country.addEventListener("change", function () { applyCountry(); render(); });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });

  function render() {
    var r = M.etsyFees({
      itemPrice: form.elements.itemPrice.value,
      shipping: form.elements.shipping.value,
      giftWrap: form.elements.giftWrap.value,
      qty: form.elements.qty.value,
      salesTax: form.elements.salesTax.value,
      cogs: form.elements.cogs.value,
      otherCosts: form.elements.otherCosts.value,
      listingFee: form.elements.listingFee.value,
      txnRate: M.toNum(form.elements.txnRate.value) / 100,
      procPct: M.toNum(form.elements.procPct.value) / 100,
      procFixed: form.elements.procFixed.value,
      offsite: form.elements.offsite.value,
      offsiteCustom: M.toNum(form.elements.offsiteCustom.value) / 100,
      txnIncludesTax: form.elements.txnIncludesTax.checked
    });
    var html = "<div class='kpi-row'>";
    html += "<div class='kpi'><span class='lbl'>You keep (profit)</span><span class='val " + (r.profit >= 0 ? "ok" : "danger") + "'>" + M.money(r.profit) + "</span></div>";
    html += "<div class='kpi'><span class='lbl'>Total Etsy fees</span><span class='val'>" + M.money(r.fees) + "</span></div>";
    html += "<div class='kpi'><span class='lbl'>Effective fee rate</span><span class='val'>" + M.pct(r.effective) + "</span></div>";
    html += "<div class='kpi'><span class='lbl'>Profit margin</span><span class='val'>" + M.pct(r.margin) + "</span></div>";
    html += "</div>";
    html += "<div class='table-wrap'><table><tbody>";
    html += row("Item + shipping + gift wrap", r.itemTotal);
    html += row("Listing fee", r.listingFee);
    html += row("Transaction fee (6.5% default)", r.transactionFee);
    html += row("Payment processing", r.processingFee);
    html += row("Offsite Ads", r.offsiteFee);
    html += row("Total fees", r.fees);
    html += row("Profit after COGS and extras", r.profit);
    html += "</tbody></table></div>";
    html += "<p class='prices-checked'>Fee schedule checked 14 November 2026 from Etsy Help and the Fees &amp; Payments Policy. Processing rates outside the US should be confirmed in your shop. Estimates only.</p>";
    document.getElementById("etsy-results").innerHTML = html;
  }
  function row(label, value) {
    return "<tr><td>" + label + "</td><td class='num'>" + M.money(value) + "</td></tr>";
  }
  applyCountry();
  render();
})();
