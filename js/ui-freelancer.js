(function () {
  var M = window.MetricStack;
  var form = document.getElementById("free-form");
  if (!form) return;

  function fillWithdraw() {
    var platform = form.elements.platform.value;
    var sel = form.elements.withdrawMethod;
    var current = sel.value;
    var map = M.WITHDRAWAL[platform];
    sel.innerHTML = "";
    Object.keys(map).forEach(function (k) {
      var opt = document.createElement("option");
      opt.value = k;
      opt.textContent = map[k].label;
      sel.appendChild(opt);
    });
    if (map[current]) sel.value = current;
    applyWithdraw();
  }
  function applyWithdraw() {
    var platform = form.elements.platform.value;
    var method = form.elements.withdrawMethod.value;
    var row = M.WITHDRAWAL[platform][method];
    if (row && method !== "custom") form.elements.withdrawFee.value = row.fee;
  }
  function togglePlatform() {
    var isFiverr = form.elements.platform.value === "fiverr";
    document.getElementById("upwork-fee-wrap").hidden = isFiverr;
    fillWithdraw();
  }

  form.elements.platform.addEventListener("change", function () { togglePlatform(); render(); });
  form.elements.withdrawMethod.addEventListener("change", function () { applyWithdraw(); render(); });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });

  function render() {
    var r = M.freelancerTakeHome({
      gross: form.elements.gross.value,
      platform: form.elements.platform.value,
      upworkFee: M.toNum(form.elements.upworkFee.value) / 100,
      withdrawFee: form.elements.withdrawFee.value,
      taxRate: M.toNum(form.elements.taxRate.value) / 100,
      fxRate: form.elements.fxRate.value
    });
    var cur = form.elements.currency.value;
    var html = "<div class='kpi-row'>";
    html += "<div class='kpi'><span class='lbl'>Take-home (USD)</span><span class='val ok'>" + M.money(r.netUsd) + "</span></div>";
    html += "<div class='kpi'><span class='lbl'>Take-home (" + cur + ")</span><span class='val'>" + (r.fx > 0 ? M.num(r.local, 2) + " " + cur : "Enter a rate") + "</span></div>";
    html += "<div class='kpi'><span class='lbl'>Platform fee</span><span class='val'>" + M.money(r.platformFee) + " (" + M.pct(r.feeRate) + ")</span></div>";
    html += "</div>";
    html += "<div class='table-wrap'><table><tbody>";
    html += "<tr><td>Gross invoice</td><td class='num'>" + M.money(r.gross) + "</td></tr>";
    html += "<tr><td>Platform service fee</td><td class='num'>" + M.money(r.platformFee) + "</td></tr>";
    html += "<tr><td>After platform fee</td><td class='num'>" + M.money(r.gross - r.platformFee) + "</td></tr>";
    html += "<tr><td>Withdrawal fee</td><td class='num'>" + M.money(r.withdrawFee) + "</td></tr>";
    html += "<tr><td>After withdrawal</td><td class='num'>" + M.money(r.afterWithdraw) + "</td></tr>";
    html += "<tr><td>Optional tax reserve</td><td class='num'>" + M.money(r.tax) + "</td></tr>";
    html += "<tr><td>Net USD</td><td class='num'>" + M.money(r.netUsd) + "</td></tr>";
    if (r.fx > 0) html += "<tr><td>Net at " + r.fx + " " + cur + "/USD</td><td class='num'>" + M.num(r.local, 2) + " " + cur + "</td></tr>";
    html += "</tbody></table></div>";
    html += "<p class='prices-checked'>Upwork and Fiverr fee rules checked 14 November 2026 from official help pages. The exchange rate is the figure you type — this page does not fetch a live FX rate. Estimates only, not tax advice.</p>";
    document.getElementById("free-results").innerHTML = html;
  }

  togglePlatform();
  render();
})();
