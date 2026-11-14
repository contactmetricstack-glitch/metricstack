/* MetricStack calculators — works in the browser and in Node tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MetricStack = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PRICES_CHECKED = "14 November 2026";

  /* ---- money helpers ---- */
  function money(n, digits) {
    if (!isFinite(n)) return "—";
    var d = digits == null ? 2 : digits;
    var sign = n < 0 ? "-" : "";
    return sign + "$" + Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }
  function num(n, digits) {
    if (!isFinite(n)) return "—";
    var d = digits == null ? 2 : digits;
    return Number(n).toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }
  function pct(n, digits) {
    if (!isFinite(n)) return "—";
    return num(n * 100, digits == null ? 1 : digits) + "%";
  }
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }
  function toNum(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
    return isFinite(n) ? n : 0;
  }

  /* ============================================================
     1. LLM API cost
     Prices are USD per 1 million tokens, standard list, uncached
     unless a cachedInput rate is used.
     ============================================================ */
  var LLM_MODELS = [
    { id: "gpt-6-astra", provider: "OpenAI", name: "GPT-6 Astra", input: 10, output: 50, cached: 1, notes: "Short context (≤272K). Longer prompts cost more." },
    { id: "gpt-6.1-sol", provider: "OpenAI", name: "GPT-6.1 Sol", input: 2, output: 10, cached: 0.10, notes: "Short context (≤272K)." },
    { id: "gpt-6.1-terra", provider: "OpenAI", name: "GPT-6.1 Terra", input: 1, output: 5, cached: 0.05, notes: "Short context (≤272K)." },
    { id: "gpt-6-luna", provider: "OpenAI", name: "GPT-6 Luna", input: 0.10, output: 0.50, cached: 0.01, notes: "Short context (≤272K)." },
    { id: "gpt-5.2", provider: "OpenAI", name: "GPT-5.2", input: 1.75, output: 14, cached: 0.175, notes: "" },
    { id: "gpt-5-mini", provider: "OpenAI", name: "GPT-5 mini", input: 0.25, output: 2.00, cached: 0.025, notes: "" },
    { id: "gpt-5-nano", provider: "OpenAI", name: "GPT-5 nano", input: 0.05, output: 0.40, cached: 0.005, notes: "" },
    { id: "gpt-4o", provider: "OpenAI", name: "GPT-4o", input: 2.50, output: 10, cached: 1.25, notes: "" },
    { id: "gpt-4o-mini", provider: "OpenAI", name: "GPT-4o mini", input: 0.15, output: 0.60, cached: 0.075, notes: "" },

    { id: "claude-fable-5.2", provider: "Anthropic", name: "Claude Fable 5.2", input: 8, output: 40, cached: 0.20, notes: "" },
    { id: "claude-opus-5.5", provider: "Anthropic", name: "Claude Opus 5.5", input: 4, output: 20, cached: 0.20, notes: "" },
    { id: "claude-sonnet-5.5", provider: "Anthropic", name: "Claude Sonnet 5.5", input: 2, output: 10, cached: 0.10, notes: "" },
    { id: "claude-haiku-5.5", provider: "Anthropic", name: "Claude Haiku 5.5 (≤100K prompt)", input: 0.10, output: 0.50, cached: 0.01, notes: "Prompts over 100K tokens cost $0.50 / $2.50." },
    { id: "claude-haiku-5.5-long", provider: "Anthropic", name: "Claude Haiku 5.5 (>100K prompt)", input: 0.50, output: 2.50, cached: 0.05, notes: "" },

    { id: "gemini-4-carbon", provider: "Google", name: "Gemini 4 Carbon", input: 2, output: 10, cached: 0.10, notes: "Introductory price through 30 November 2026, then $4 / $20." },
    { id: "gemini-4-argon", provider: "Google", name: "Gemini 4 Argon", input: 2, output: 10, cached: 0.10, notes: "Introductory price through 30 November 2026, then $4 / $20." },
    { id: "gemini-4-hydrogen", provider: "Google", name: "Gemini 4 Hydrogen", input: 1.50, output: 7.50, cached: 0.075, notes: "" },
    { id: "gemini-3.8-flash", provider: "Google", name: "Gemini 3.8 Flash", input: 0.75, output: 3.75, cached: 0.075, notes: "Price through 31 December 2026, then $1.50 / $7.50." },
    { id: "gemini-3.5-flash-lite", provider: "Google", name: "Gemini 3.5 Flash-Lite", input: 0.30, output: 2.50, cached: 0.03, notes: "" },

    { id: "mistral-large-4", provider: "Mistral", name: "Mistral Large 4", input: 0.70, output: 2.10, cached: 0.07, notes: "" },
    { id: "mistral-small-4", provider: "Mistral", name: "Mistral Small 4", input: 0.15, output: 0.60, cached: 0.015, notes: "" },
    { id: "codestral", provider: "Mistral", name: "Codestral", input: 0.30, output: 0.90, cached: 0.03, notes: "" },

    { id: "groq-gpt-oss-120b", provider: "Groq", name: "GPT-OSS 120B (Groq)", input: 0.15, output: 0.60, cached: 0.075, notes: "Public list price on GroqCloud." },
    { id: "groq-gpt-oss-20b", provider: "Groq", name: "GPT-OSS 20B (Groq)", input: 0.075, output: 0.30, cached: 0.038, notes: "Public list price on GroqCloud." },
    { id: "llama-3.3-70b-groq", provider: "Meta / Groq", name: "Llama 3.3 70B (Groq Enterprise)", input: null, output: null, cached: null, notes: "Groq lists this as Enterprise — contact sales. Enter a custom rate to estimate." , enterprise: true },
    { id: "llama-3.1-8b-groq", provider: "Meta / Groq", name: "Llama 3.1 8B Instant (Groq Enterprise)", input: null, output: null, cached: null, notes: "Groq lists this as Enterprise — contact sales. Enter a custom rate to estimate.", enterprise: true },

    { id: "deepseek-v4-pro-peak", provider: "DeepSeek", name: "DeepSeek V4 Pro (peak)", input: 1.32, output: 3.96, cached: 0.044, notes: "Peak: 01:00–04:00 and 06:00–10:00 UTC, Mon–Fri, excluding Chinese public holidays." },
    { id: "deepseek-v4-pro-off", provider: "DeepSeek", name: "DeepSeek V4 Pro (off-peak)", input: 0.66, output: 1.98, cached: 0.022, notes: "Half of the peak rate." },
    { id: "deepseek-flash-peak", provider: "DeepSeek", name: "DeepSeek Flash (peak)", input: 0.30, output: 1.20, cached: 0.006, notes: "Model ID deepseek-flash (V4.1 Flash)." },
    { id: "deepseek-flash-off", provider: "DeepSeek", name: "DeepSeek Flash (off-peak)", input: 0.15, output: 0.60, cached: 0.003, notes: "Half of the peak rate." }
  ];

  function llmCost(model, opts) {
    var inputTokens = toNum(opts.inputTokens);
    var outputTokens = toNum(opts.outputTokens);
    var cachedShare = clamp(toNum(opts.cachedShare), 0, 1);
    var requests = Math.max(0, toNum(opts.requests || 1));
    var inputPrice = model.input;
    var outputPrice = model.output;
    var cachedPrice = model.cached;
    if (opts.customInput != null && opts.customInput !== "") inputPrice = toNum(opts.customInput);
    if (opts.customOutput != null && opts.customOutput !== "") outputPrice = toNum(opts.customOutput);
    if (opts.customCached != null && opts.customCached !== "") cachedPrice = toNum(opts.customCached);
    if (inputPrice == null || outputPrice == null) {
      return { ok: false, reason: "No public list price. Enter a custom rate." };
    }
    if (cachedPrice == null) cachedPrice = inputPrice;
    var uncachedTokens = inputTokens * (1 - cachedShare);
    var cachedTokens = inputTokens * cachedShare;
    var perRequest =
      (uncachedTokens / 1e6) * inputPrice +
      (cachedTokens / 1e6) * cachedPrice +
      (outputTokens / 1e6) * outputPrice;
    var total = perRequest * requests;
    return {
      ok: true,
      perRequest: perRequest,
      total: total,
      inputCost: (uncachedTokens / 1e6) * inputPrice * requests,
      cachedCost: (cachedTokens / 1e6) * cachedPrice * requests,
      outputCost: (outputTokens / 1e6) * outputPrice * requests,
      inputPrice: inputPrice,
      outputPrice: outputPrice,
      cachedPrice: cachedPrice
    };
  }

  function llmCompare(opts) {
    return LLM_MODELS.map(function (m) {
      var c = llmCost(m, opts);
      return { model: m, cost: c };
    }).filter(function (row) {
      return row.cost.ok;
    }).sort(function (a, b) {
      return a.cost.total - b.cost.total;
    });
  }

  /* ============================================================
     2. SaaS metrics
     ============================================================ */
  function saasMrr(opts) {
    var start = toNum(opts.startMrr);
    var neu = toNum(opts.newMrr);
    var expansion = toNum(opts.expansionMrr);
    var churned = toNum(opts.churnedMrr);
    var contraction = toNum(opts.contractionMrr);
    var ending = start + neu + expansion - churned - contraction;
    var netNew = ending - start;
    return {
      start: start,
      ending: ending,
      netNew: netNew,
      arr: ending * 12,
      startingArr: start * 12
    };
  }

  function saasCacPayback(opts) {
    var cac = toNum(opts.cac);
    var arpu = toNum(opts.arpu);
    var margin = clamp(toNum(opts.grossMargin), 0, 1);
    var monthlyContribution = arpu * margin;
    var months = monthlyContribution > 0 ? cac / monthlyContribution : Infinity;
    return { cac: cac, arpu: arpu, margin: margin, monthlyContribution: monthlyContribution, months: months };
  }

  function saasChurn(opts) {
    var startCust = toNum(opts.startCustomers);
    var lostCust = toNum(opts.lostCustomers);
    var startRev = toNum(opts.startRevenue);
    var lostRev = toNum(opts.lostRevenue);
    var expansion = toNum(opts.expansionRevenue);
    var logo = startCust > 0 ? lostCust / startCust : 0;
    var revenue = startRev > 0 ? lostRev / startRev : 0;
    var netRevenue = startRev > 0 ? (startRev - lostRev + expansion) / startRev : 0;
    return { logoChurn: logo, revenueChurn: revenue, netRevenueRetention: netRevenue };
  }

  function saasLtvCac(opts) {
    var arpu = toNum(opts.arpu);
    var margin = clamp(toNum(opts.grossMargin), 0, 1);
    var churn = toNum(opts.monthlyChurn);
    var cac = toNum(opts.cac);
    var ltv = churn > 0 ? (arpu * margin) / churn : Infinity;
    var ratio = cac > 0 && isFinite(ltv) ? ltv / cac : Infinity;
    return { ltv: ltv, cac: cac, ratio: ratio, arpu: arpu, margin: margin, churn: churn };
  }

  /* Two-proportion z-test, two-tailed, normal approximation. */
  function erf(x) {
    /* Abramowitz and Stegun 7.1.26 */
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1 / (1 + p * x);
    var y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }
  function normCdf(z) {
    return 0.5 * (1 + erf(z / Math.SQRT2));
  }
  function saasAbTest(opts) {
    var n1 = toNum(opts.n1);
    var c1 = toNum(opts.c1);
    var n2 = toNum(opts.n2);
    var c2 = toNum(opts.c2);
    var p1 = n1 > 0 ? c1 / n1 : 0;
    var p2 = n2 > 0 ? c2 / n2 : 0;
    var pooled = (n1 + n2) > 0 ? (c1 + c2) / (n1 + n2) : 0;
    var se = (n1 > 0 && n2 > 0) ? Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2)) : 0;
    var z = se > 0 ? (p2 - p1) / se : 0;
    var pValue = 2 * (1 - normCdf(Math.abs(z)));
    var significant95 = Math.abs(z) >= 1.95996398454;
    var lift = p1 > 0 ? (p2 - p1) / p1 : (p2 > 0 ? Infinity : 0);
    return { p1: p1, p2: p2, z: z, pValue: pValue, significant95: significant95, lift: lift, pooled: pooled };
  }

  function saasRoas(opts) {
    var spend = toNum(opts.adSpend);
    var revenue = toNum(opts.revenue);
    var margin = clamp(toNum(opts.grossMargin), 0, 1);
    var roas = spend > 0 ? revenue / spend : Infinity;
    var profit = revenue * margin - spend;
    var breakEven = margin > 0 ? 1 / margin : Infinity;
    return { roas: roas, profit: profit, breakEven: breakEven, spend: spend, revenue: revenue, margin: margin };
  }

  /* ============================================================
     3. Etsy fees
     ============================================================ */
  var ETSY_PROCESSING = {
    US: { label: "United States (3% + $0.25)", pct: 0.03, fixed: 0.25, currency: "USD" },
    UK: { label: "United Kingdom (4% + £0.20) — confirm in your shop", pct: 0.04, fixed: 0.20, currency: "GBP" },
    CA: { label: "Canada (3% + C$0.25) — confirm in your shop", pct: 0.03, fixed: 0.25, currency: "CAD" },
    AU: { label: "Australia (3% + A$0.25) — confirm in your shop", pct: 0.03, fixed: 0.25, currency: "AUD" },
    CUSTOM: { label: "Custom rate", pct: 0, fixed: 0, currency: "USD" }
  };

  function etsyFees(opts) {
    var price = toNum(opts.itemPrice);
    var shipping = toNum(opts.shipping);
    var gift = toNum(opts.giftWrap);
    var qty = Math.max(1, Math.round(toNum(opts.qty || 1)));
    var tax = toNum(opts.salesTax);
    var cogs = toNum(opts.cogs);
    var extras = toNum(opts.otherCosts);
    var listingFee = opts.listingFee != null ? toNum(opts.listingFee) : 0.20;
    var txnRate = opts.txnRate != null ? toNum(opts.txnRate) : 0.065;
    var itemTotal = (price * qty) + shipping + gift;
    /* US: transaction fee does not apply to sales tax. Elsewhere it often does; default US treatment, with a toggle. */
    var txnBase = opts.txnIncludesTax ? itemTotal + tax : itemTotal;
    var transactionFee = txnBase * txnRate;
    var procPct = toNum(opts.procPct);
    var procFixed = toNum(opts.procFixed);
    var procBase = itemTotal + tax; /* processing applies to total sale including shipping and tax */
    var processingFee = procBase * procPct + procFixed;
    var offsiteRate = 0;
    if (opts.offsite === "15") offsiteRate = 0.15;
    else if (opts.offsite === "12") offsiteRate = 0.12;
    else if (opts.offsite === "custom") offsiteRate = toNum(opts.offsiteCustom);
    var offsiteRaw = (itemTotal + (opts.offsiteOnTax ? tax : 0)) * offsiteRate;
    var offsiteCap = opts.offsiteCap != null ? toNum(opts.offsiteCap) : 100;
    var offsiteFee = Math.min(offsiteRaw, offsiteCap);
    var fees = listingFee + transactionFee + processingFee + offsiteFee;
    var revenue = itemTotal + tax;
    var profit = itemTotal - cogs - extras - fees; /* tax collected is typically paid onward, so not profit */
    var margin = itemTotal > 0 ? profit / itemTotal : 0;
    var effective = itemTotal > 0 ? fees / itemTotal : 0;
    return {
      itemTotal: itemTotal,
      listingFee: listingFee,
      transactionFee: transactionFee,
      processingFee: processingFee,
      offsiteFee: offsiteFee,
      fees: fees,
      profit: profit,
      margin: margin,
      effective: effective,
      tax: tax,
      revenue: revenue
    };
  }

  /* ============================================================
     4. Freelancer take-home
     ============================================================ */
  var WITHDRAWAL = {
    upwork: {
      local_bank: { label: "Direct to local bank ($0.99)", fee: 0.99 },
      us_bank_nonus: { label: "Direct to U.S. bank, non-US tax address ($2.99)", fee: 2.99 },
      us_bank_us: { label: "Direct to U.S. bank, US tax address ($0)", fee: 0 },
      wire: { label: "USD wire ($50)", fee: 50 },
      custom: { label: "Custom withdrawal fee", fee: 0 }
    },
    fiverr: {
      paypal: { label: "PayPal ($0)", fee: 0 },
      bank: { label: "Bank transfer via Payoneer ($1)", fee: 1 },
      payoneer: { label: "Payoneer account ($3)", fee: 3 },
      custom: { label: "Custom withdrawal fee", fee: 0 }
    }
  };

  function freelancerTakeHome(opts) {
    var gross = toNum(opts.gross);
    var platform = opts.platform === "fiverr" ? "fiverr" : "upwork";
    var feeRate = platform === "fiverr" ? 0.20 : clamp(toNum(opts.upworkFee), 0, 0.15);
    if (opts.feeRate != null && opts.feeRate !== "") feeRate = clamp(toNum(opts.feeRate), 0, 1);
    var platformFee = gross * feeRate;
    var afterPlatform = gross - platformFee;
    var withdrawFee = toNum(opts.withdrawFee);
    var afterWithdraw = afterPlatform - withdrawFee;
    var taxRate = clamp(toNum(opts.taxRate), 0, 1);
    var tax = afterWithdraw * taxRate;
    var netUsd = afterWithdraw - tax;
    var fx = toNum(opts.fxRate);
    var local = fx > 0 ? netUsd * fx : 0;
    return {
      gross: gross,
      platform: platform,
      feeRate: feeRate,
      platformFee: platformFee,
      withdrawFee: withdrawFee,
      afterWithdraw: afterWithdraw,
      tax: tax,
      netUsd: netUsd,
      fx: fx,
      local: local
    };
  }

  /* ============================================================
     5. Amazon FBA / eBay
     ============================================================ */
  var AMZ_REFERRAL = [
    { id: "most", name: "Most categories (15%, $0.30 min.)", rate: 0.15, min: 0.30 },
    { id: "clothing", name: "Clothing & Accessories (17%, $0.30 min.)", rate: 0.17, min: 0.30 },
    { id: "beauty-low", name: "Beauty / Grocery-style 8% (confirm category)", rate: 0.08, min: 0.30 },
    { id: "electronics", name: "Computers / Electronics often 8% (confirm)", rate: 0.08, min: 0.30 },
    { id: "automotive", name: "Automotive / Industrial often 12% (confirm)", rate: 0.12, min: 0.30 },
    { id: "custom", name: "Custom referral %", rate: 0, min: 0 }
  ];

  /* US FBA fulfillment, non-apparel, non-hazmat.
     Rates from published 15 Jan 2026 US cards for the $10–$50 band,
     plus small-standard under-$10 and over-$50 where published.
     Fuel & logistics surcharge of 3.5% applies from 17 Apr 2026.
     Peak: 15 Oct 2026 – 14 Jan 2027. */
  var FBA_SMALL_STANDARD = [
    { maxOz: 2,  u10: 2.43, mid: 3.32, o50: 3.58, p_u10: 2.62, p_mid: 3.51, p_o50: 3.77 },
    { maxOz: 4,  u10: 2.49, mid: 3.42, o50: 3.68, p_u10: 2.68, p_mid: 3.61, p_o50: 3.87 },
    { maxOz: 6,  u10: 2.56, mid: 3.45, o50: 3.71, p_u10: 2.76, p_mid: 3.65, p_o50: 3.91 },
    { maxOz: 8,  u10: 2.66, mid: 3.54, o50: 3.80, p_u10: 2.86, p_mid: 3.74, p_o50: 4.00 },
    { maxOz: 10, u10: 2.77, mid: 3.68, o50: 3.94, p_u10: 2.98, p_mid: 3.89, p_o50: 4.15 },
    { maxOz: 12, u10: 2.82, mid: 3.78, o50: 4.04, p_u10: 3.03, p_mid: 3.99, p_o50: 4.25 },
    { maxOz: 14, u10: 2.92, mid: 3.91, o50: 4.17, p_u10: 3.14, p_mid: 4.13, p_o50: 4.39 },
    { maxOz: 16, u10: 2.97, mid: 3.96, o50: 4.22, p_u10: 3.19, p_mid: 4.18, p_o50: 4.44 }
  ];
  /* Large standard $10–$50 published; under $10 / over $50 use mid as a stand-in only if needed — we require size + price band mid by default and document. */
  var FBA_LARGE_STANDARD_MID = [
    { maxOz: 4, mid: 3.73, peak: 3.97 },
    { maxOz: 8, mid: 3.95, peak: 4.21 },
    { maxOz: 12, mid: 4.20, peak: 4.48 },
    { maxOz: 16, mid: 4.60, peak: 4.89 },
    { maxOz: 20, mid: 5.04, peak: 5.34 },
    { maxOz: 24, mid: 5.42, peak: 5.73 },
    { maxOz: 28, mid: 5.57, peak: 5.89 },
    { maxOz: 32, mid: 5.82, peak: 6.15 },
    { maxOz: 36, mid: 5.92, peak: 6.29 },
    { maxOz: 40, mid: 6.10, peak: 6.49 },
    { maxOz: 44, mid: 6.26, peak: 6.66 },
    { maxOz: 48, mid: 6.67, peak: 7.08 }
  ];

  function fbaFulfillment(opts) {
    if (opts.customFba != null && opts.customFba !== "") {
      return { fee: toNum(opts.customFba), source: "custom", surcharge: 0, base: toNum(opts.customFba) };
    }
    var oz = toNum(opts.weightOz);
    if (opts.weightLb) oz = toNum(opts.weightLb) * 16;
    var price = toNum(opts.price);
    var peak = !!opts.peak;
    var size = opts.sizeTier || "large_standard";
    var base = 0;
    var source = "lookup";
    if (size === "small_standard") {
      var row = null;
      for (var i = 0; i < FBA_SMALL_STANDARD.length; i++) {
        if (oz <= FBA_SMALL_STANDARD[i].maxOz) { row = FBA_SMALL_STANDARD[i]; break; }
      }
      if (!row) row = FBA_SMALL_STANDARD[FBA_SMALL_STANDARD.length - 1];
      if (price < 10) base = peak ? row.p_u10 : row.u10;
      else if (price <= 50) base = peak ? row.p_mid : row.mid;
      else base = peak ? row.p_o50 : row.o50;
    } else if (size === "large_standard") {
      if (oz <= 48) {
        var r = null;
        for (var j = 0; j < FBA_LARGE_STANDARD_MID.length; j++) {
          if (oz <= FBA_LARGE_STANDARD_MID[j].maxOz) { r = FBA_LARGE_STANDARD_MID[j]; break; }
        }
        if (!r) r = FBA_LARGE_STANDARD_MID[FBA_LARGE_STANDARD_MID.length - 1];
        base = peak ? r.peak : r.mid;
        if (price < 10 || price > 50) source = "large-standard mid-band estimate — confirm in Seller Central for under $10 / over $50";
      } else {
        var over3lbOz = Math.max(0, oz - 48);
        var steps = Math.ceil(over3lbOz / 4);
        var mid = 6.97 + steps * 0.08;
        var pk = 7.51 + steps * 0.08;
        base = peak ? pk : mid;
        if (price < 10 || price > 50) source = "large-standard 3–20 lb card for the $10–$50 band — confirm other price bands";
      }
    } else {
      return { fee: 0, source: "unknown size — enter a custom FBA fee", surcharge: 0, base: 0 };
    }
    var surchargeRate = opts.noSurcharge ? 0 : 0.035;
    var surcharge = base * surchargeRate;
    return { fee: base + surcharge, source: source, surcharge: surcharge, base: base };
  }

  function amazonProfit(opts) {
    var price = toNum(opts.price);
    var shippingCharged = toNum(opts.shippingCharged);
    var total = price + shippingCharged;
    var rate = toNum(opts.referralRate);
    var minFee = toNum(opts.referralMin);
    var referral = Math.max(total * rate, minFee);
    if (opts.closingFee) referral += toNum(opts.closingFee);
    var fba = fbaFulfillment(opts);
    var storage = toNum(opts.storage);
    var ads = toNum(opts.ads);
    var cogs = toNum(opts.cogs);
    var inbound = toNum(opts.inbound);
    var fees = referral + fba.fee + storage + ads + inbound;
    var profit = total - cogs - fees;
    var margin = total > 0 ? profit / total : 0;
    return {
      total: total,
      referral: referral,
      fba: fba,
      storage: storage,
      ads: ads,
      inbound: inbound,
      cogs: cogs,
      fees: fees,
      profit: profit,
      margin: margin
    };
  }

  function ebayProfit(opts) {
    var price = toNum(opts.price);
    var shippingCharged = toNum(opts.shippingCharged);
    var tax = toNum(opts.tax);
    var total = price + shippingCharged + tax;
    var rate = opts.rate != null ? toNum(opts.rate) : 0.136;
    var highRate = opts.highRate != null ? toNum(opts.highRate) : 0.0235;
    var threshold = opts.threshold != null ? toNum(opts.threshold) : 7500;
    var perOrder = total <= 10 ? 0.30 : 0.40;
    if (opts.perOrder != null && opts.perOrder !== "") perOrder = toNum(opts.perOrder);
    var portionLow = Math.min(total, threshold);
    var portionHigh = Math.max(0, total - threshold);
    var fvf = portionLow * rate + portionHigh * highRate + perOrder;
    if (opts.international) fvf += total * toNum(opts.intlRate != null ? opts.intlRate : 0.0165);
    var insertion = toNum(opts.insertion);
    var cogs = toNum(opts.cogs);
    var shipCost = toNum(opts.shipCost);
    var ads = toNum(opts.ads);
    var fees = fvf + insertion + ads;
    var profit = price + shippingCharged - cogs - shipCost - fees;
    var margin = (price + shippingCharged) > 0 ? profit / (price + shippingCharged) : 0;
    return {
      total: total,
      fvf: fvf,
      perOrder: perOrder,
      insertion: insertion,
      ads: ads,
      cogs: cogs,
      shipCost: shipCost,
      fees: fees,
      profit: profit,
      margin: margin
    };
  }

  return {
    PRICES_CHECKED: PRICES_CHECKED,
    money: money,
    num: num,
    pct: pct,
    toNum: toNum,
    clamp: clamp,
    LLM_MODELS: LLM_MODELS,
    llmCost: llmCost,
    llmCompare: llmCompare,
    saasMrr: saasMrr,
    saasCacPayback: saasCacPayback,
    saasChurn: saasChurn,
    saasLtvCac: saasLtvCac,
    saasAbTest: saasAbTest,
    saasRoas: saasRoas,
    ETSY_PROCESSING: ETSY_PROCESSING,
    etsyFees: etsyFees,
    WITHDRAWAL: WITHDRAWAL,
    freelancerTakeHome: freelancerTakeHome,
    AMZ_REFERRAL: AMZ_REFERRAL,
    fbaFulfillment: fbaFulfillment,
    amazonProfit: amazonProfit,
    ebayProfit: ebayProfit
  };
});
