(function () {
  var M = window.MetricStack;
  var form = document.getElementById("llm-form");
  if (!form) return;

  var PRESETS = {
    chatbot: { in: 1500, out: 400, req: 10000, cache: 40 },
    rag: { in: 4000, out: 600, req: 5000, cache: 60 },
    agent: { in: 8000, out: 1500, req: 2000, cache: 25 },
    custom: null
  };

  document.getElementById("prices-checked").textContent = M.PRICES_CHECKED;

  form.elements.preset.addEventListener("change", function () {
    var p = PRESETS[form.elements.preset.value];
    if (!p) return;
    form.elements.inputTokens.value = p.in;
    form.elements.outputTokens.value = p.out;
    form.elements.requests.value = p.req;
    form.elements.cachedShare.value = p.cache;
    render();
  });

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });

  function opts() {
    return {
      inputTokens: form.elements.inputTokens.value,
      outputTokens: form.elements.outputTokens.value,
      requests: form.elements.requests.value,
      cachedShare: M.toNum(form.elements.cachedShare.value) / 100,
      customInput: form.elements.customInput.value,
      customOutput: form.elements.customOutput.value,
      customCached: form.elements.customCached.value
    };
  }

  function render() {
    var o = opts();
    var provider = form.elements.provider.value;
    var rows = M.llmCompare(o).filter(function (r) {
      return provider === "all" || r.model.provider.indexOf(provider) === 0 || r.model.provider === provider;
    });
    var out = document.getElementById("llm-results");
    if (!rows.length) {
      out.innerHTML = "<p class='note'>No models with a public list price match that filter. Add a custom rate to estimate Enterprise models.</p>";
      return;
    }
    var cheapest = rows[0].cost.total;
    var html = "<div class='kpi-row'>";
    html += "<div class='kpi'><span class='lbl'>Cheapest on this workload</span><span class='val ok'>" + rows[0].model.name + "</span></div>";
    html += "<div class='kpi'><span class='lbl'>Estimated total</span><span class='val'>" + M.money(rows[0].cost.total) + "</span></div>";
    html += "<div class='kpi'><span class='lbl'>Per request</span><span class='val'>" + M.money(rows[0].cost.perRequest, 4) + "</span></div>";
    html += "</div>";
    html += "<div class='table-wrap'><table><thead><tr><th>Provider</th><th>Model</th><th>Input / 1M</th><th>Output / 1M</th><th>Per request</th><th>Total</th></tr></thead><tbody>";
    rows.forEach(function (r, i) {
      var mark = i === 0 ? " <strong>(lowest)</strong>" : "";
      html += "<tr><td>" + r.model.provider + "</td><td>" + r.model.name + mark + "</td>";
      html += "<td class='num'>" + M.money(r.cost.inputPrice, 3) + "</td>";
      html += "<td class='num'>" + M.money(r.cost.outputPrice, 3) + "</td>";
      html += "<td class='num'>" + M.money(r.cost.perRequest, 4) + "</td>";
      html += "<td class='num'>" + M.money(r.cost.total) + "</td></tr>";
    });
    html += "</tbody></table></div>";
    var enterprise = M.LLM_MODELS.filter(function (m) { return m.enterprise; });
    if (enterprise.length) {
      html += "<p class='note'>Meta Llama models on Groq (Llama 3.3 70B and Llama 3.1 8B Instant) are listed as Enterprise with no public list price as of " + M.PRICES_CHECKED + ". Enter custom per-million rates above to include them in a private estimate.</p>";
    }
    html += "<p class='prices-checked'>List prices checked " + M.PRICES_CHECKED + ". Standard-tier, uncached input except where you set a cache share. Not a bill.</p>";
    out.innerHTML = html;
  }

  render();
})();
