(function () {
  var M = window.MetricStack;
  var form = document.getElementById("saas-form");
  if (!form) return;

  function showTab(id) {
    document.querySelectorAll("[data-saas-panel]").forEach(function (p) {
      p.hidden = p.getAttribute("data-saas-panel") !== id;
    });
    document.querySelectorAll(".tabs .tab").forEach(function (t) {
      t.setAttribute("aria-selected", t.getAttribute("data-tab") === id ? "true" : "false");
    });
  }
  document.querySelectorAll(".tabs .tab").forEach(function (t) {
    t.addEventListener("click", function () { showTab(t.getAttribute("data-tab")); });
  });

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });

  function el(name) { return form.elements[name]; }
  function n(name) { return el(name).value; }

  function render() {
    var mrr = M.saasMrr({
      startMrr: n("startMrr"), newMrr: n("newMrr"), expansionMrr: n("expansionMrr"),
      churnedMrr: n("churnedMrr"), contractionMrr: n("contractionMrr")
    });
    document.getElementById("out-mrr").innerHTML =
      kpi("Ending MRR", M.money(mrr.ending)) +
      kpi("Net new MRR", M.money(mrr.netNew), mrr.netNew >= 0 ? "ok" : "danger") +
      kpi("ARR", M.money(mrr.arr));

    var pay = M.saasCacPayback({
      cac: n("cac"), arpu: n("payArpu"), grossMargin: M.toNum(n("payMargin")) / 100
    });
    document.getElementById("out-payback").innerHTML =
      kpi("Payback", isFinite(pay.months) ? M.num(pay.months, 1) + " months" : "—") +
      kpi("Monthly contribution", M.money(pay.monthlyContribution));

    var ch = M.saasChurn({
      startCustomers: n("startCust"), lostCustomers: n("lostCust"),
      startRevenue: n("startRev"), lostRevenue: n("lostRev"), expansionRevenue: n("expRev")
    });
    document.getElementById("out-churn").innerHTML =
      kpi("Logo churn", M.pct(ch.logoChurn)) +
      kpi("Revenue churn", M.pct(ch.revenueChurn)) +
      kpi("Net revenue retention", M.pct(ch.netRevenueRetention));

    var ltv = M.saasLtvCac({
      arpu: n("ltvArpu"), grossMargin: M.toNum(n("ltvMargin")) / 100,
      monthlyChurn: M.toNum(n("ltvChurn")) / 100, cac: n("ltvCac")
    });
    var ratioClass = !isFinite(ltv.ratio) ? "" : (ltv.ratio >= 3 ? "ok" : (ltv.ratio < 1 ? "danger" : ""));
    document.getElementById("out-ltv").innerHTML =
      kpi("LTV", isFinite(ltv.ltv) ? M.money(ltv.ltv) : "—") +
      kpi("LTV:CAC", isFinite(ltv.ratio) ? M.num(ltv.ratio, 2) + "×" : "—", ratioClass);

    var ab = M.saasAbTest({ n1: n("n1"), c1: n("c1"), n2: n("n2"), c2: n("c2") });
    document.getElementById("out-ab").innerHTML =
      kpi("Control rate", M.pct(ab.p1, 2)) +
      kpi("Variant rate", M.pct(ab.p2, 2)) +
      kpi("Relative lift", isFinite(ab.lift) ? M.pct(ab.lift, 1) : "—") +
      kpi("z-score", M.num(ab.z, 3)) +
      kpi("p-value (two-sided)", isFinite(ab.pValue) ? M.num(ab.pValue, 4) : "—") +
      kpi("Significant at 95%?", ab.significant95 ? "Yes" : "No", ab.significant95 ? "ok" : "");

    var roas = M.saasRoas({
      adSpend: n("adSpend"), revenue: n("adRevenue"), grossMargin: M.toNum(n("roasMargin")) / 100
    });
    document.getElementById("out-roas").innerHTML =
      kpi("ROAS", isFinite(roas.roas) ? M.num(roas.roas, 2) + "×" : "—") +
      kpi("Break-even ROAS", isFinite(roas.breakEven) ? M.num(roas.breakEven, 2) + "×" : "—") +
      kpi("Estimated profit", M.money(roas.profit), roas.profit >= 0 ? "ok" : "danger");
  }

  function kpi(label, value, cls) {
    return "<div class='kpi'><span class='lbl'>" + label + "</span><span class='val " + (cls || "") + "'>" + value + "</span></div>";
  }

  showTab("mrr");
  render();
})();
