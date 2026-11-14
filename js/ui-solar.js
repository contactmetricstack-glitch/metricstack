(function () {
  var M = window.MetricStack;
  var form = document.getElementById("solar-form");
  var lead = document.getElementById("lead-form");
  if (!form || !M) return;

  var lang = "en";
  var I18N = {
    en: {
      suggested: "Suggested system",
      production: "Estimated annual production",
      year1: "Year 1 savings",
      lifetime: "25-year savings",
      payback: "Simple payback",
      cost: "Estimated installed cost",
      co2y: "CO₂ avoided (year 1)",
      co2l: "CO₂ avoided (25 years)",
      usage: "Implied annual use",
      years: "years",
      months: "months",
      kw: "kW",
      kwh: "kWh",
      kg: "kg",
      t: "t",
      cad: "CAD",
      src_entered: "Using the system size you entered.",
      src_roof: "Based on the roof area entered.",
      src_roof_capped: "Limited by the roof area entered (a larger system would over-produce relative to the bill at these assumptions).",
      src_bill: "Sized to cover about one year of electricity use at the example yield, direction and shading.",
      src_none: "Enter a monthly bill, a roof area, or a system size to see an estimate.",
      invalid: "Add a positive bill, roof area, or system size, and keep the example yield above zero."
    },
    fr: {
      suggested: "Système suggéré",
      production: "Production annuelle estimée",
      year1: "Économies (année 1)",
      lifetime: "Économies sur 25 ans",
      payback: "Délai de récupération simple",
      cost: "Coût d'installation estimé",
      co2y: "CO₂ évité (année 1)",
      co2l: "CO₂ évité (25 ans)",
      usage: "Consommation annuelle implicite",
      years: "ans",
      months: "mois",
      kw: "kW",
      kwh: "kWh",
      kg: "kg",
      t: "t",
      cad: "CAD",
      src_entered: "Selon la taille de système que vous avez indiquée.",
      src_roof: "Selon la superficie de toit indiquée.",
      src_roof_capped: "Limitée par la superficie de toit indiquée (un système plus grand surproduirait par rapport à la facture, selon ces hypothèses).",
      src_bill: "Dimensionné pour couvrir environ une année de consommation selon le productible, l'orientation et l'ombrage d'exemple.",
      src_none: "Indiquez une facture mensuelle, une superficie de toit ou une taille de système pour voir une estimation.",
      invalid: "Ajoutez une facture, une superficie ou une taille de système positive, et laissez le productible d'exemple au-dessus de zéro."
    }
  };

  function t() { return I18N[lang] || I18N.en; }

  function applyLang(next) {
    lang = next === "fr" ? "fr" : "en";
    document.documentElement.lang = lang === "fr" ? "fr" : "en";
    document.querySelectorAll("[data-en]").forEach(function (el) {
      var value = lang === "fr" ? el.getAttribute("data-fr") : el.getAttribute("data-en");
      if (value == null) return;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        if (el.getAttribute("data-i18n-placeholder")) el.setAttribute("placeholder", value);
        else el.value = value;
      } else if (el.tagName === "OPTION") {
        el.textContent = value;
      } else {
        el.innerHTML = value;
      }
    });
    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      var on = btn.getAttribute("data-lang-btn") === lang;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("active", on);
    });
    document.querySelectorAll("option[data-en]").forEach(function (opt) {
      opt.textContent = lang === "fr" ? opt.getAttribute("data-fr") : opt.getAttribute("data-en");
    });
    render();
  }

  document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLang(btn.getAttribute("data-lang-btn"));
    });
  });

  var province = form.elements.province;
  province.addEventListener("change", function () {
    var preset = M.SOLAR_PROVINCES[province.value] || M.SOLAR_PROVINCES.QC;
    form.elements.electricityRate.value = preset.rate;
    form.elements.specificYield.value = preset.yield;
    form.elements.co2KgPerKwh.value = preset.co2;
    render();
  });

  function n(name) { return form.elements[name].value; }

  function moneyCad(value) {
    if (!isFinite(value)) return "—";
    if (lang === "fr") {
      return Number(value).toLocaleString("fr-CA", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }) + " CAD";
    }
    return "CAD " + M.money(value, 0).replace("$", "");
  }

  function moneyCadExact(value) {
    if (!isFinite(value)) return "—";
    if (lang === "fr") {
      return Number(value).toLocaleString("fr-CA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + " CAD";
    }
    return "CAD " + M.money(value, 2).replace("$", "");
  }

  function qty(value, digits, unit) {
    if (!isFinite(value)) return "—";
    var formatted = lang === "fr"
      ? Number(value).toLocaleString("fr-CA", { minimumFractionDigits: digits, maximumFractionDigits: digits })
      : M.num(value, digits);
    return formatted + " " + unit;
  }

  function co2Label(kg) {
    if (!isFinite(kg)) return "—";
    if (kg >= 1000) return qty(kg / 1000, 2, t().t);
    return qty(kg, kg >= 10 ? 1 : 2, t().kg);
  }

  function paybackLabel(years) {
    if (!isFinite(years) || years < 0) return "—";
    if (years < 2) {
      return qty(years * 12, 1, t().months);
    }
    return qty(years, 1, t().years);
  }

  function kpi(label, value, cls) {
    return "<div class='kpi'><span class='lbl'>" + label + "</span><span class='val " + (cls || "") + "'>" + value + "</span></div>";
  }

  function render() {
    var dirKey = n("direction");
    var shadeKey = n("shading");
    var result = M.solarSavings({
      monthlyBill: n("monthlyBill"),
      electricityRate: n("electricityRate"),
      specificYield: n("specificYield"),
      directionFactor: M.SOLAR_DIRECTION[dirKey] != null ? M.SOLAR_DIRECTION[dirKey] : 1,
      shadingFactor: M.SOLAR_SHADING[shadeKey] != null ? M.SOLAR_SHADING[shadeKey] : 1,
      costPerWatt: n("costPerWatt"),
      m2PerKw: n("m2PerKw"),
      roofArea: n("roofArea"),
      systemSizeKw: n("systemSizeKw"),
      escalation: M.toNum(n("escalation")) / 100,
      degradation: M.toNum(n("degradation")) / 100,
      co2KgPerKwh: n("co2KgPerKwh"),
      years: 25
    });
    var copy = t();
    var out = document.getElementById("solar-results");
    var note = document.getElementById("solar-note");
    if (!result.ok) {
      out.innerHTML = kpi(copy.suggested, "—") + kpi(copy.production, "—");
      note.textContent = copy.invalid;
      return;
    }
    out.innerHTML =
      kpi(copy.suggested, qty(result.suggestedKw, 2, copy.kw)) +
      kpi(copy.production, qty(result.annualProductionKwh, 0, copy.kwh)) +
      kpi(copy.year1, moneyCad(result.year1Savings), "ok") +
      kpi(copy.lifetime, moneyCad(result.lifetimeSavings), "ok") +
      kpi(copy.payback, paybackLabel(result.paybackYears)) +
      kpi(copy.cost, moneyCad(result.installedCost)) +
      kpi(copy.co2y, co2Label(result.annualCo2Kg)) +
      kpi(copy.co2l, co2Label(result.lifetimeCo2Kg)) +
      kpi(copy.usage, qty(result.annualUsageKwh, 0, copy.kwh));
    var src = {
      entered: copy.src_entered,
      roof: copy.src_roof,
      "roof-capped": copy.src_roof_capped,
      bill: copy.src_bill,
      none: copy.src_none
    };
    note.textContent = src[result.sizeSource] || copy.src_none;
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    render();
  });

  if (lead) {
    lead.addEventListener("submit", function (e) {
      e.preventDefault();
      lead.hidden = true;
      var thanks = document.getElementById("lead-thanks");
      if (thanks) {
        thanks.hidden = false;
        thanks.focus();
      }
    });
  }

  applyLang("en");
})();
