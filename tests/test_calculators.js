#!/usr/bin/env node
"use strict";
var path = require("path");
var fs = require("fs");
var M = require("../js/calculators.js");
var failed = 0, passed = 0;

function almost(a, b, eps) {
  eps = eps == null ? 1e-9 : eps;
  return Math.abs(a - b) <= eps;
}
function eq(name, a, b, eps) {
  if (almost(a, b, eps)) {
    passed += 1;
    console.log("  PASS  " + name + "  (" + a + ")");
  } else {
    failed += 1;
    console.error("  FAIL  " + name + "  got " + a + " expected " + b);
  }
}
function ok(name, cond, detail) {
  if (cond) { passed += 1; console.log("  PASS  " + name); }
  else { failed += 1; console.error("  FAIL  " + name + (detail ? "  " + detail : "")); }
}

console.log("Prices checked:", M.PRICES_CHECKED);
ok("prices-checked date is 14 November 2026", M.PRICES_CHECKED === "14 November 2026");

console.log("\nLLM");
var sonnet = M.LLM_MODELS.filter(function (m) { return m.id === "claude-sonnet-5.5"; })[0];
var c = M.llmCost(sonnet, { inputTokens: 1500, outputTokens: 400, cachedShare: 0.4, requests: 10000 });
eq("Sonnet 5.5 monthly total", c.total, 58.6, 1e-9);
eq("Sonnet 5.5 per request", c.perRequest, 0.00586, 1e-12);

var luna = M.LLM_MODELS.filter(function (m) { return m.id === "gpt-6-luna"; })[0];
var cl = M.llmCost(luna, { inputTokens: 1500, outputTokens: 400, cachedShare: 0.4, requests: 10000 });
eq("GPT-6 Luna monthly total", cl.total, 2.96, 1e-9);

var flash = M.LLM_MODELS.filter(function (m) { return m.id === "deepseek-flash-off"; })[0];
var cf = M.llmCost(flash, { inputTokens: 1500, outputTokens: 400, cachedShare: 0.4, requests: 10000 });
eq("DeepSeek Flash off-peak monthly", cf.total, 3.768, 1e-9);

var astra = M.LLM_MODELS.filter(function (m) { return m.id === "gpt-6-astra"; })[0];
var ca = M.llmCost(astra, { inputTokens: 1e6, outputTokens: 2e5, cachedShare: 0, requests: 1 });
eq("Astra 1M in / 200k out", ca.total, 1 * 10 + 0.2 * 50, 1e-9); // 20

var llama = M.LLM_MODELS.filter(function (m) { return m.id === "llama-3.3-70b-groq"; })[0];
var misses = M.llmCost(llama, { inputTokens: 1000, outputTokens: 100, requests: 1 });
ok("Llama enterprise has no invented price", misses.ok === false);

var customLlama = M.llmCost(llama, { inputTokens: 1e6, outputTokens: 1e6, requests: 1, customInput: 0.5, customOutput: 0.8 });
eq("Llama with custom rates", customLlama.total, 1.3, 1e-9);

var ranked = M.llmCompare({ inputTokens: 1500, outputTokens: 400, cachedShare: 0.4, requests: 10000 });
ok("comparison is sorted ascending", ranked.every(function (r, i) {
  return i === 0 || r.cost.total >= ranked[i - 1].cost.total - 1e-12;
}));
ok("OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek all present",
  ["OpenAI", "Anthropic", "Google", "Mistral", "Groq", "DeepSeek"].every(function (p) {
    return M.LLM_MODELS.some(function (m) { return m.provider === p || m.provider.indexOf(p) === 0; });
  })
);

console.log("\nSaaS");
var mrr = M.saasMrr({ startMrr: 40000, newMrr: 6000, expansionMrr: 2000, churnedMrr: 1500, contractionMrr: 500 });
eq("ending MRR", mrr.ending, 46000);
eq("net new MRR", mrr.netNew, 6000);
eq("ARR", mrr.arr, 552000);

var pay = M.saasCacPayback({ cac: 800, arpu: 120, grossMargin: 0.8 });
eq("CAC payback months", pay.months, 800 / 96, 1e-9);

var ch = M.saasChurn({ startCustomers: 200, lostCustomers: 10, startRevenue: 40000, lostRevenue: 1500, expansionRevenue: 2000 });
eq("logo churn", ch.logoChurn, 0.05);
eq("revenue churn", ch.revenueChurn, 1500 / 40000);
eq("NRR", ch.netRevenueRetention, 1.0125);

var ltv = M.saasLtvCac({ arpu: 120, grossMargin: 0.8, monthlyChurn: 0.03, cac: 800 });
eq("LTV", ltv.ltv, 3200);
eq("LTV:CAC", ltv.ratio, 4);

var ab = M.saasAbTest({ n1: 2000, c1: 80, n2: 2000, c2: 110 });
eq("control rate", ab.p1, 0.04);
eq("variant rate", ab.p2, 0.055);
eq("A/B z-score", ab.z, 2.229, 0.005);
ok("A/B significant at 95%", ab.significant95 === true);
ok("A/B p-value around 0.026", ab.pValue > 0.02 && ab.pValue < 0.03);

var identical = M.saasAbTest({ n1: 1000, c1: 100, n2: 1000, c2: 100 });
eq("identical arms z is 0", identical.z, 0);
ok("identical arms not significant", identical.significant95 === false);

var roas = M.saasRoas({ adSpend: 2500, revenue: 9000, grossMargin: 0.6 });
eq("ROAS", roas.roas, 3.6, 1e-9);
eq("break-even ROAS", roas.breakEven, 1 / 0.6, 1e-9);
eq("ROAS profit", roas.profit, 9000 * 0.6 - 2500, 1e-9);

console.log("\nEtsy");
var et = M.etsyFees({
  itemPrice: 40, shipping: 8, giftWrap: 0, qty: 1, salesTax: 0,
  cogs: 12, otherCosts: 0, listingFee: 0.20, txnRate: 0.065,
  procPct: 0.03, procFixed: 0.25, offsite: "none"
});
eq("Etsy listing", et.listingFee, 0.20);
eq("Etsy transaction", et.transactionFee, 3.12, 1e-9);
eq("Etsy processing", et.processingFee, 1.69, 1e-9);
eq("Etsy fees", et.fees, 5.01, 1e-9);
eq("Etsy profit", et.profit, 30.99, 1e-9);

var etAds = M.etsyFees({
  itemPrice: 40, shipping: 8, qty: 1, cogs: 12, listingFee: 0.20,
  txnRate: 0.065, procPct: 0.03, procFixed: 0.25, offsite: "15"
});
eq("Offsite ads fee capped logic (7.20)", etAds.offsiteFee, 7.20, 1e-9);
eq("Profit with offsite ads", etAds.profit, 23.79, 1e-9);

var etCap = M.etsyFees({
  itemPrice: 2000, shipping: 0, qty: 1, cogs: 0, listingFee: 0.20,
  txnRate: 0.065, procPct: 0.03, procFixed: 0.25, offsite: "15"
});
eq("Offsite ads cap at $100", etCap.offsiteFee, 100, 1e-9);

var etTax = M.etsyFees({
  itemPrice: 40, shipping: 8, salesTax: 10, qty: 1, cogs: 12,
  listingFee: 0.20, txnRate: 0.065, procPct: 0.03, procFixed: 0.25,
  offsite: "none", txnIncludesTax: false
});
eq("US: transaction fee ignores tax", etTax.transactionFee, 3.12, 1e-9);
eq("processing includes tax", etTax.processingFee, 58 * 0.03 + 0.25, 1e-9);
ok("tax is not counted as profit", almost(etTax.profit, 48 - 12 - (0.20 + 3.12 + (58 * 0.03 + 0.25))));

console.log("\nFreelancer");
var up = M.freelancerTakeHome({ gross: 1000, platform: "upwork", upworkFee: 0.10, withdrawFee: 0.99, taxRate: 0, fxRate: 280 });
eq("Upwork platform fee", up.platformFee, 100);
eq("Upwork net USD", up.netUsd, 899.01, 1e-9);
eq("Upwork PKR", up.local, 251722.80, 1e-6);

var fv = M.freelancerTakeHome({ gross: 500, platform: "fiverr", withdrawFee: 3, taxRate: 0, fxRate: 280 });
eq("Fiverr 20% fee", fv.platformFee, 100);
eq("Fiverr net USD", fv.netUsd, 397);
eq("Fiverr PKR", fv.local, 111160);

var up15 = M.freelancerTakeHome({ gross: 1000, platform: "upwork", upworkFee: 0.15, withdrawFee: 0.99, fxRate: 280 });
eq("Upwork 15% net", up15.netUsd, 849.01, 1e-9);

console.log("\nAmazon / eBay");
var amz = M.amazonProfit({
  price: 24.99, shippingCharged: 0, referralRate: 0.15, referralMin: 0.30,
  sizeTier: "large_standard", weightOz: 12, peak: true, cogs: 8,
  storage: 0, ads: 0, inbound: 0
});
eq("Amazon referral", amz.referral, 24.99 * 0.15, 1e-9);
eq("Amazon FBA base peak 12oz large std", amz.fba.base, 4.48, 1e-9);
eq("Amazon FBA with 3.5% surcharge", amz.fba.fee, 4.48 * 1.035, 1e-9);
eq("Amazon profit", amz.profit, 24.99 - 8 - (24.99 * 0.15) - (4.48 * 1.035), 1e-9);

var amzOff = M.amazonProfit({
  price: 24.99, referralRate: 0.15, referralMin: 0.30,
  sizeTier: "large_standard", weightOz: 12, peak: false, cogs: 8
});
eq("Amazon off-peak FBA base", amzOff.fba.base, 4.20, 1e-9);

var customFba = M.amazonProfit({
  price: 24.99, referralRate: 0.15, referralMin: 0.30, customFba: 5, cogs: 8
});
eq("custom FBA overrides lookup", customFba.fba.fee, 5);

var ebay = M.ebayProfit({
  price: 50, shippingCharged: 10, tax: 0, cogs: 20, shipCost: 8
});
eq("eBay FVF 13.6% + $0.40", ebay.fvf, 60 * 0.136 + 0.40, 1e-9);
eq("eBay profit", ebay.profit, 23.44, 1e-9);

var ebayLow = M.ebayProfit({ price: 9, shippingCharged: 0, cogs: 0, shipCost: 0 });
eq("eBay per-order fee $0.30 on <= $10", ebayLow.perOrder, 0.30);
eq("eBay low FVF", ebayLow.fvf, 9 * 0.136 + 0.30, 1e-9);

var ebayHigh = M.ebayProfit({
  price: 8000, shippingCharged: 0, cogs: 0, shipCost: 0
});
eq("eBay above $7500 uses 2.35%", ebayHigh.fvf, 7500 * 0.136 + 500 * 0.0235 + 0.40, 1e-9);

console.log("\nSolar savings");
var billSized = M.solarSavings({
  monthlyBill: 150,
  electricityRate: 0.08,
  specificYield: 1150,
  directionFactor: 1,
  shadingFactor: 1,
  costPerWatt: 2.80,
  m2PerKw: 5.5,
  escalation: 0,
  degradation: 0,
  co2KgPerKwh: 0.0017,
  years: 25
});
eq("bill-based annual use", billSized.annualUsageKwh, 22500);
eq("bill-based kW", billSized.suggestedKw, 22500 / 1150, 1e-9);
eq("bill-based year-1 production", billSized.annualProductionKwh, 22500, 1e-9);
eq("bill-based year-1 savings", billSized.year1Savings, 1800, 1e-9);
eq("bill-based installed cost", billSized.installedCost, (22500 / 1150) * 1000 * 2.80, 1e-9);
eq("bill-based simple payback", billSized.paybackYears, ((22500 / 1150) * 1000 * 2.80) / 1800, 1e-9);
eq("bill-based 25y savings, no esc/deg", billSized.lifetimeSavings, 1800 * 25, 1e-9);
eq("bill-based year-1 CO2 kg", billSized.annualCo2Kg, 22500 * 0.0017, 1e-9);
ok("bill-based size source", billSized.sizeSource === "bill");

var entered = M.solarSavings({
  monthlyBill: 150,
  electricityRate: 0.08,
  specificYield: 1150,
  directionFactor: 1,
  shadingFactor: 1,
  costPerWatt: 2.80,
  systemSizeKw: 6,
  escalation: 0,
  degradation: 0,
  co2KgPerKwh: 0.0017,
  years: 25
});
eq("entered 6 kW production", entered.annualProductionKwh, 6900, 1e-9);
eq("entered 6 kW year-1 savings", entered.year1Savings, 552, 1e-9);
eq("entered 6 kW cost", entered.installedCost, 16800, 1e-9);
eq("entered 6 kW payback", entered.paybackYears, 16800 / 552, 1e-9);
ok("entered size source", entered.sizeSource === "entered");

var shaded = M.solarSavings({
  systemSizeKw: 6,
  electricityRate: 0.08,
  specificYield: 1150,
  directionFactor: M.SOLAR_DIRECTION.west,
  shadingFactor: M.SOLAR_SHADING.moderate,
  costPerWatt: 2.80,
  escalation: 0,
  degradation: 0,
  years: 25
});
eq("west + moderate effective yield", shaded.effectiveYield, 1150 * 0.85 * 0.75, 1e-9);
eq("west + moderate production", shaded.annualProductionKwh, 6 * 1150 * 0.85 * 0.75, 1e-9);

var roof = M.solarSavings({
  monthlyBill: 150,
  electricityRate: 0.08,
  specificYield: 1150,
  directionFactor: 1,
  shadingFactor: 1,
  costPerWatt: 2.80,
  m2PerKw: 5.5,
  roofArea: 40,
  escalation: 0,
  degradation: 0,
  years: 25
});
eq("roof-capped kW", roof.suggestedKw, 40 / 5.5, 1e-9);
ok("roof-capped source", roof.sizeSource === "roof-capped");

var lifetime = M.solarSavings({
  systemSizeKw: 6,
  electricityRate: 0.08,
  specificYield: 1150,
  directionFactor: 1,
  shadingFactor: 1,
  costPerWatt: 2.80,
  escalation: 0.02,
  degradation: 0.005,
  co2KgPerKwh: 0.0017,
  years: 25
});
var expectedLife = 0;
var expectedProd = 0;
for (var yr = 0; yr < 25; yr++) {
  var prodY = 6900 * Math.pow(0.995, yr);
  expectedProd += prodY;
  expectedLife += prodY * 0.08 * Math.pow(1.02, yr);
}
eq("25y savings with 2% esc and 0.5% deg", lifetime.lifetimeSavings, expectedLife, 1e-6);
eq("25y CO2 with degradation", lifetime.lifetimeCo2Kg, expectedProd * 0.0017, 1e-6);
eq("Quebec default rate", M.SOLAR_PROVINCES.QC.rate, 0.08);
eq("Quebec default yield", M.SOLAR_PROVINCES.QC.yield, 1150);

// Formatting helpers should not throw
ok("money formats negative", M.money(-1.2) === "-$1.20");
ok("pct formats", M.pct(0.104375).indexOf("10.4") === 0);

// Static pages exist and contain required phrases
console.log("\nPages");
var root = path.join(__dirname, "..");
var files = [
  "index.html", "about.html", "privacy.html", "robots.txt", "sitemap.xml", "favicon.svg",
  "tools/llm-api-cost.html", "tools/saas-metrics.html", "tools/etsy-fees.html",
  "tools/freelancer-takehome.html", "tools/amazon-ebay-fees.html",
  "solar-savings-demo/index.html", "js/ui-solar.js"
];
files.forEach(function (f) {
  ok("exists " + f, fs.existsSync(path.join(root, f)));
});
var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
ok("hero line present", html.indexOf("Free calculators for founders &amp; builders") !== -1);
ok("brand line present", html.indexOf("MetricStack by AHM Global") !== -1);
ok("contact email present", html.indexOf("ahmglobal7@gmail.com") !== -1);
ok("no personal name on homepage", !/attaullah|marth|hanif/i.test(html));
ok("FAQ present", html.indexOf("Are these calculators free?") !== -1);
ok("why-free present", html.indexOf("Why free") !== -1 || html.indexOf("why") !== -1);
ok("JSON-LD present", html.indexOf("application/ld+json") !== -1);
ok("ad slot reserved, no live ads", html.indexOf("no live ads") !== -1 && html.indexOf("googlesyndication") === -1);

var allHtml = "";
fs.readdirSync(path.join(root, "tools")).forEach(function (f) {
  allHtml += fs.readFileSync(path.join(root, "tools", f), "utf8");
});
allHtml += fs.readFileSync(path.join(root, "about.html"), "utf8");
allHtml += fs.readFileSync(path.join(root, "privacy.html"), "utf8");
allHtml += html;
var solarPage = fs.readFileSync(path.join(root, "solar-savings-demo/index.html"), "utf8");
allHtml += solarPage;
ok("no personal name anywhere in HTML", !/attaullah|marth|hanif/i.test(allHtml));
ok("disclaimer in footer", /not financial/i.test(allHtml));
ok("solar demo is noindex", /content\s*=\s*"noindex/i.test(solarPage));
ok("solar demo credit line", solarPage.indexOf("Demo prepared for") !== -1 && solarPage.indexOf("Power Q") !== -1 && solarPage.indexOf("AHM Global") !== -1);
ok("solar demo not claimed as Power Q figures", /not Power Q/i.test(solarPage));
ok("solar demo is not in the homepage nav or tool list", html.indexOf("solar-savings-demo") === -1);
var sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
ok("solar demo is not in sitemap.xml", sitemap.indexOf("solar-savings-demo") === -1);
ok("lead form does not post to a server", /id="lead-form"/.test(solarPage) && !/id="lead-form"[^>]*method="post"/i.test(solarPage));
ok("bilingual toggle present", /data-lang-btn="fr"/.test(solarPage) && /data-lang-btn="en"/.test(solarPage));

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
