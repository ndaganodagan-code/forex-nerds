/* Forex Nerds by Notoriety — site behaviour
   Content lives in content.js. Live charts: TradingView widgets. */
(function () {
  "use strict";
  const C = window.FN || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Links ---------- */
  document.querySelectorAll("[data-link]").forEach((a) => {
    const url = C.links && C.links[a.dataset.link];
    if (url) a.href = url;
  });
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Mobile nav ---------- */
  const toggle = $("#navToggle"), links = $("#navLinks");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  });
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
    links.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false");
  }));

  /* ---------- Socials ---------- */
  const socialNames = { whatsapp: "WhatsApp", telegram: "Telegram", instagram: "Instagram", tiktok: "TikTok", email: "Email" };
  const soc = $("#socials");
  Object.keys(socialNames).forEach((k) => {
    let url = C.links && C.links[k];
    if (!url) return;
    if (k === "email" && !url.startsWith("mailto:")) url = "mailto:" + url;
    soc.insertAdjacentHTML("beforeend", `<a href="${esc(url)}" target="_blank" rel="noopener">${socialNames[k]}</a>`);
  });

  /* ---------- Content: setups ---------- */
  if (C.weekLabel) $("#weekLabel").textContent = C.weekLabel;
  const setupList = $("#setupList");
  (C.setups || []).forEach((s) => {
    const locked = s.access === "premium";
    const dirPill = s.direction === "Bearish" ? "pill--red" : "pill--green";
    const accessPill = locked ? `<span class="pill pill--gold">Nerd Pro</span>` : `<span class="pill pill--green">Free</span>`;
    const levels = locked
      ? `<div><span>Entry zone</span><span>1.0000 – 1.0000</span></div><div><span>Invalidation</span><span>1.0000</span></div><div><span>Target</span><span>1.0000</span></div>`
      : `<div><span>Entry zone</span><span>${esc(s.entry)}</span></div><div><span>Invalidation</span><span>${esc(s.stop)}</span></div><div><span>Target</span><span>${esc(s.target)}</span></div>`;
    setupList.insertAdjacentHTML("beforeend", `
      <article class="setup reveal ${locked ? "setup--locked" : "setup--free"}">
        ${s.example ? `<span class="badge-sample">SAMPLE</span>` : ""}
        <div class="setup__top"><span class="setup__sym">${esc(s.instrument)}</span>${accessPill}</div>
        <div class="setup__meta"><span class="pill ${dirPill}">${esc(s.direction)}</span><span class="pill">${esc(s.timeframe)}</span></div>
        <div class="setup__levels">${levels}</div>
        <p class="setup__note">${esc(s.note)}</p>
        ${locked ? `<div class="setup__lock"><span class="setup__lock-icon">🔒</span><strong>Nerd Pro setup</strong><button class="btn btn--sm btn--gold" data-access><span>Get access · <span data-amount>UGX 10,000</span></span></button></div>` : ""}
      </article>`);
  });
  const free = (C.setups || []).find((s) => s.access === "free");
  if (free) $("#heroSetup").textContent = `${free.instrument} · ${free.direction} · ${free.timeframe}`;

  /* ---------- Content: outlook ---------- */
  if (C.outlook) {
    $("#outlookTitle").textContent = C.outlook.title || "Weekly Outlook";
    $("#outlookSummary").textContent = C.outlook.summary || "";
    $("#outlookPoints").innerHTML = (C.outlook.points || []).map((p) => `<li>${esc(p)}</li>`).join("");
  }

  /* ---------- Content: analysis ---------- */
  $("#analysisList").innerHTML = (C.analysis || []).map((a) => `
    <article class="card reveal">
      <span class="pill">${esc(a.tag)}</span>
      <h3>${esc(a.title)}</h3>
      <p class="muted">${esc(a.excerpt)}</p>
      <div class="card__foot"><span>${esc(a.read)}</span><span>Coming soon</span></div>
    </article>`).join("");

  /* ---------- Nerd Pro price / CTA ---------- */
  const pro = C.nerdPro || {};
  if (pro.price) {
    $("#proPrice").innerHTML = `${esc(pro.price)} <small>${esc(pro.interval || "")}</small>`;
    $("#proCta").textContent = "Join Nerd Pro";
  }
  const proCta = $("#proCta");
  proCta.setAttribute("data-access", "");
  proCta.textContent = "Get Nerd Pro signals";

  /* ---------- Reveal on scroll ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 }) : null;
  document.querySelectorAll(".reveal").forEach((el) => io ? io.observe(el) : el.classList.add("is-in"));

  /* =========================================================
     MARKET DATA — TradingView free widgets
     ========================================================= */
  const INSTRUMENTS = [
    { label: "EUR/USD", tv: "FX:EURUSD", code: "EURUSD" },
    { label: "GBP/USD", tv: "FX:GBPUSD", code: "GBPUSD" },
    { label: "USD/JPY", tv: "FX:USDJPY", code: "USDJPY" },
    { label: "Gold", tv: "OANDA:XAUUSD", code: "XAUUSD" },
    { label: "USD/CHF", tv: "FX:USDCHF", code: "USDCHF" },
    { label: "AUD/USD", tv: "FX:AUDUSD", code: "AUDUSD" },
    { label: "NZD/USD", tv: "FX:NZDUSD", code: "NZDUSD" },
    { label: "USD/CAD", tv: "FX:USDCAD", code: "USDCAD" },
    { label: "Silver", tv: "OANDA:XAGUSD", code: "XAGUSD" }
  ];
  const TIMEFRAMES = [
    { code: "M15", tv: "15", name: "15 minutes" },
    { code: "H1", tv: "60", name: "1 hour" },
    { code: "H4", tv: "240", name: "4 hours" },
    { code: "D1", tv: "D", name: "Daily" },
    { code: "W1", tv: "W", name: "Weekly" }
  ];
  let current = INSTRUMENTS[0], tf = TIMEFRAMES[1];

  function embed(container, file, config, onFail) {
    container.innerHTML = "";
    const holder = document.createElement("div");
    holder.className = "tradingview-widget-container";
    holder.style.width = "100%"; holder.style.height = "100%";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.width = "100%"; inner.style.height = "100%";
    holder.appendChild(inner);
    const sc = document.createElement("script");
    sc.src = "https://s3.tradingview.com/external-embedding/" + file;
    sc.async = true;
    sc.type = "text/javascript";
    sc.text = JSON.stringify(config);
    if (onFail) sc.onerror = onFail;
    holder.appendChild(sc);
    container.appendChild(holder);
  }

  /* Ticker tape */
  embed($("#ticker"), "embed-widget-ticker-tape.js", {
    symbols: INSTRUMENTS.map((i) => ({ proName: i.tv, title: i.label })),
    showSymbolLogo: true, isTransparent: true, displayMode: "adaptive",
    colorTheme: "dark", locale: "en"
  });

  /* Chips */
  const symChips = $("#symbolChips"), tfChips = $("#tfChips");
  symChips.innerHTML = INSTRUMENTS.map((i, n) => `<button class="chip${n === 0 ? " is-active" : ""}" data-sym="${n}" role="tab">${i.label}</button>`).join("");
  tfChips.innerHTML = TIMEFRAMES.map((t, n) => `<button class="chip${t === tf ? " is-active" : ""}" data-tf="${n}" role="tab">${t.code}</button>`).join("");
  symChips.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sym]"); if (!b) return;
    current = INSTRUMENTS[+b.dataset.sym];
    symChips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === b));
    loadChart();
    renderAnalysis();
  });
  tfChips.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tf]"); if (!b) return;
    tf = TIMEFRAMES[+b.dataset.tf];
    tfChips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === b));
    loadChart();
  });

  /* Main chart */
  const chartEl = $("#chart"), statusEl = $("#status"), statusText = $("#statusText");
  function loadChart() {
    $("#chartSym").textContent = current.label;
    $("#chartTf").textContent = tf.name;
    embed(chartEl, "embed-widget-advanced-chart.js", {
      autosize: true,
      symbol: current.tv,
      interval: tf.tv,
      timezone: "Africa/Nairobi",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(16, 20, 23, 1)",
      gridColor: "rgba(255, 255, 255, 0.04)",
      hide_top_toolbar: true,
      hide_side_toolbar: true,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com"
    }, () => {
      chartEl.innerHTML = '<div class="chart__msg">Couldn\'t load the live chart. Check your internet connection and refresh.</div>';
      statusEl.classList.remove("is-live"); statusEl.classList.add("is-down"); statusText.textContent = "Offline";
    });
  }
  loadChart();

  /* ---------- Analysis tables (My analysis + Auto analysis share one row style) ---------- */
  function rowsHTML(rows, opinionLabel) {
    return rows.map((r) => {
      const buy = Math.max(0, Math.min(100, Number(r.buy) || 0));
      const sell = r.sell != null ? Math.max(0, Math.min(100, Number(r.sell) || 0)) : 100 - buy;
      const op = String(r.opinion || "Wait").toLowerCase();
      const cls = op === "buy" ? "op--buy" : op === "sell" ? "op--sell" : "op--wait";
      const icon = op === "buy" ? "▲" : op === "sell" ? "▼" : "●";
      return `<tr>
        <td data-label="Timeframe"><span class="pill">${esc(r.timeframe || "—")}</span></td>
        <td data-label="Analysis" class="ana__text">${esc(r.analysis)}</td>
        <td data-label="Buying vs selling">
          <div class="meter" role="img" aria-label="${buy}% buying, ${sell}% selling">
            <div class="meter__bar"><span class="meter__buy" style="width:${buy}%"></span><span class="meter__sell" style="width:${sell}%"></span></div>
            <div class="meter__nums"><span class="up">Buy ${buy}%</span><span class="down">Sell ${sell}%</span></div>
          </div>
        </td>
        <td data-label="${opinionLabel}"><span class="op ${cls}">${icon} ${esc(r.opinion || "Wait")}</span></td>
      </tr>`;
    }).join("");
  }

  function renderAnalysis() {
    const data = (C.instrumentAnalysis || {})[current.code];
    $("#anaTitle").innerHTML = esc(current.label) + (data && data.sample ? ' <span class="badge-inline">SAMPLE</span>' : "");
    $("#anaUpdated").textContent = data && data.updated ? "Updated " + data.updated : "";
    const rows = (data && data.rows) || [];
    $("#anaBody").innerHTML = rows.length
      ? rowsHTML(rows, "My opinion")
      : `<tr><td colspan="4" class="ana__empty">No analysis for ${esc(current.label)} yet — check back soon.</td></tr>`;
  }
  renderAnalysis();

  /* =========================================================
     ⚡ AUTO ANALYSIS — upload H4 / H1 / M15|M5 screenshots
     The server function reads them with the Forex Nerds rulebook
     (CRT + SMC + top-down) and returns bullish / bearish chances.
     ========================================================= */
  const AUTO = C.autoAnalysis || {};
  const autoEl = $("#auto"), autoBtn = $("#autoBtn");
  const panes = { upload: $("#paneUpload"), loading: $("#paneLoading"), error: $("#paneError"), result: $("#paneResult") };
  const slots = [{ tf: "H4", file: null }, { tf: "H1", file: null }, { tf: "M15", file: null }];
  const tiles = $$(".up__tile"), upInput = $("#upInput"), analyseBtn = $("#analyseBtn");
  let pickSlot = 0, busy = false;

  function pane(name) {
    Object.entries(panes).forEach(([k, el]) => (el.hidden = k !== name));
    $("#autoTitle").textContent = name === "result" ? "Your chart analysis" : name === "loading" ? "Analysing your charts…" : "Upload your charts";
    $("#autoSub").hidden = name === "result" || name === "loading";
  }

  function openAuto() {
    autoEl.hidden = false;
    if (panes.result.hidden && panes.loading.hidden) pane("upload");
    autoEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  autoBtn.addEventListener("click", openAuto);
  $("#autoClose").addEventListener("click", () => { autoEl.hidden = true; });
  if (AUTO.enabled === false) autoBtn.hidden = true;

  /* --- picking files --- */
  function refreshTiles() {
    tiles.forEach((tile, i) => {
      const s = slots[i], img = tile.querySelector("img");
      tile.classList.toggle("has-img", !!s.file);
      img.hidden = !s.file;
      tile.querySelector(".up__empty").hidden = !!s.file;
      tile.querySelector(".up__x").hidden = !s.file;
      if (s.file) img.src = s.url;
    });
    const n = slots.filter((s) => s.file).length;
    analyseBtn.disabled = n < 3;
    $("#analyseLabel").textContent = n < 3 ? `Add ${3 - n} more screenshot${3 - n === 1 ? "" : "s"}` : "⚡ Analyse my charts";
  }
  function setFile(i, file) {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) { toastMsg("Please use a PNG, JPG or WebP screenshot."); return; }
    if (slots[i].url) URL.revokeObjectURL(slots[i].url);
    slots[i].file = file; slots[i].url = URL.createObjectURL(file);
    refreshTiles();
  }
  tiles.forEach((tile, i) => {
    const open = () => { pickSlot = i; upInput.value = ""; upInput.click(); };
    tile.addEventListener("click", (e) => {
      if (e.target.closest(".up__x")) { e.stopPropagation(); if (slots[i].url) URL.revokeObjectURL(slots[i].url); slots[i].file = null; slots[i].url = null; refreshTiles(); return; }
      if (e.target.closest(".tfsw")) return;
      open();
    });
    tile.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    tile.addEventListener("dragover", (e) => { e.preventDefault(); tile.classList.add("is-drag"); });
    tile.addEventListener("dragleave", () => tile.classList.remove("is-drag"));
    tile.addEventListener("drop", (e) => { e.preventDefault(); tile.classList.remove("is-drag"); setFile(i, e.dataTransfer.files[0]); });
  });
  upInput.addEventListener("change", () => setFile(pickSlot, upInput.files[0]));
  $$(".tfsw").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    $$(".tfsw").forEach((x) => x.classList.toggle("is-on", x === b));
    slots[2].tf = b.dataset.low;
    tiles[2].setAttribute("aria-label", `Add ${b.dataset.low} screenshot`);
  }));

  function toastMsg(t) {
    const el = $("#toast"); if (!el) return;
    el.textContent = t; el.classList.add("is-on"); setTimeout(() => el.classList.remove("is-on"), 2400);
  }

  /* Shrink screenshots before upload (keeps them fast on mobile data) */
  function compress(file, maxW = 1600) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
        const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL("image/jpeg", 0.85).split(",")[1]);
      };
      img.onerror = () => reject(new Error("Couldn't read one of the images."));
      img.src = URL.createObjectURL(file);
    });
  }

  /* --- loading steps --- */
  let stepTimer = null;
  function startSteps() {
    const items = $$("#autoSteps li"); let i = 0;
    items.forEach((li) => (li.className = "")); items[0].className = "is-doing";
    clearInterval(stepTimer);
    stepTimer = setInterval(() => { if (i < items.length - 1) { items[i].className = "is-done"; i++; items[i].className = "is-doing"; } }, 2600);
  }

  /* --- run --- */
  analyseBtn.addEventListener("click", async () => {
    if (busy || slots.some((s) => !s.file)) return;
    busy = true; pane("loading"); startSteps();
    try {
      const images = await Promise.all(slots.map(async (s) => ({ tf: s.tf, type: "image/jpeg", data: await compress(s.file) })));
      const res = await fetch(AUTO.endpoint || "/api/analyse", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images })
      });
      let body = null; try { body = await res.json(); } catch {}
      if (!res.ok || !body) {
        const notLive = [404, 405, 501].includes(res.status) || (body && body.error === "not_configured");
        const err = new Error(notLive ? "Auto analysis isn't switched on for this website yet. Please check back soon." : (body && body.error) || "Something went wrong. Please try again.");
        err.code = body && body.code ? body.code : "http_" + res.status;
        throw err;
      }
      if (!body.valid) { const err = new Error(body.problem || "Those screenshots couldn't be read as price charts. Try clearer, cropped screenshots of the same pair."); err.code = "not_charts"; throw err; }
      pane("result");
      renderResult(body);
    } catch (e) {
      const offline = !navigator.onLine;
      $("#errText").textContent = offline ? "You seem to be offline. Check your connection and try again." :
        (e instanceof TypeError ? "Auto analysis isn't available here yet. Please check back soon." : e.message);
      $("#errCode").textContent = e.code ? "Error code: " + e.code : "";
      pane("error");
    } finally {
      clearInterval(stepTimer); busy = false;
    }
  });
  $("#errBack").addEventListener("click", () => pane("upload"));
  $("#newAnalysis").addEventListener("click", () => {
    slots.forEach((s) => { if (s.url) URL.revokeObjectURL(s.url); s.file = null; s.url = null; });
    refreshTiles(); pane("upload");
  });

  /* --- results --- */
  function renderResult(r) {
    $("#autoTitle").textContent = r.instrument && r.instrument !== "Unknown" ? `${r.instrument} — chart analysis` : "Your chart analysis";
    $("#oBull").textContent = r.bullish + "%"; $("#oBear").textContent = r.bearish + "%";
    $("#oBullBar").style.width = r.bullish + "%"; $("#oBearBar").style.width = r.bearish + "%";
    const odds = $(".odds");
    odds.classList.toggle("lean-bull", r.bullish >= 55); odds.classList.toggle("lean-bear", r.bearish >= 55);
    $("#resHeadline").textContent = r.headline;

    // timeframe tabs
    const tabs = $("#tfTabs"), card = $("#tfCard");
    tabs.innerHTML = r.timeframes.map((t, i) => `<button class="seg__btn${i === 0 ? " is-on" : ""}" role="tab" data-i="${i}">${esc(t.tf)}</button>`).join("");
    const show = (i) => {
      const t = r.timeframes[i]; if (!t) { card.innerHTML = ""; return; }
      tabs.querySelectorAll(".seg__btn").forEach((b) => b.classList.toggle("is-on", +b.dataset.i === i));
      const cls = t.structure === "bullish" ? "pill--green" : t.structure === "bearish" ? "pill--red" : "";
      card.innerHTML = `
        <div class="tfcard__top"><span class="pill ${cls}">${esc(t.structure[0].toUpperCase() + t.structure.slice(1))} structure</span>
          <span class="tfcard__pct"><span class="up">${t.bullish}%</span> / <span class="down">${100 - t.bullish}%</span></span></div>
        <div class="meter__bar"><span class="meter__buy" style="width:${t.bullish}%"></span><span class="meter__sell" style="width:${100 - t.bullish}%"></span></div>
        <p>${esc(t.reading)}</p>`;
    };
    tabs.onclick = (e) => { const b = e.target.closest("[data-i]"); if (b) show(+b.dataset.i); };
    show(0);

    $("#conceptChips").innerHTML = r.concepts.map((c) =>
      `<span class="cchip${c.found ? " is-found" : ""}"${c.note ? ` title="${esc(c.note)}"` : ""}><i>${c.found ? "✓" : "–"}</i>${esc(c.name)}${c.found && c.note ? `<small>${esc(c.note)}</small>` : ""}</span>`).join("");

    $("#levelsBlock").hidden = !r.levels.length;
    $("#levelList").innerHTML = r.levels.map((l) => `<li><span>${esc(l.label)}</span><strong class="mono">${esc(l.value)}</strong></li>`).join("");

    const li = (a) => a.length ? a.map((x) => `<li>${esc(x)}</li>`).join("") : "<li>—</li>";
    $("#bullCase").innerHTML = li(r.bullishCase);
    $("#bearCase").innerHTML = li(r.bearishCase);
  }

  /* Forex session clock (hero card) — times in UTC */
  const SESSIONS = [
    { name: "Sydney", open: 21, close: 6 },
    { name: "Tokyo", open: 0, close: 9 },
    { name: "London", open: 8, close: 17 },
    { name: "New York", open: 13, close: 22 }
  ];
  function inSession(h, s) { return s.open < s.close ? h >= s.open && h < s.close : h >= s.open || h < s.close; }
  function updateSessions() {
    const now = new Date();
    const day = now.getUTCDay(), h = now.getUTCHours();
    const weekend = day === 6 || (day === 5 && h >= 22) || (day === 0 && h < 21);
    const eat = now.toLocaleTimeString("en-GB", { timeZone: "Africa/Kampala", hour: "2-digit", minute: "2-digit" });
    if (weekend) {
      $("#sessionLabel").textContent = "Forex market";
      $("#sessionName").textContent = "Closed for the weekend";
    } else {
      const open = SESSIONS.filter((s) => inSession(h, s)).map((s) => s.name);
      $("#sessionLabel").textContent = open.length > 1 ? "Sessions open" : "Session open";
      $("#sessionName").textContent = open.join(" + ") || "Between sessions";
    }
    $("#sessionTime").textContent = `${eat} EAT`;
  }
  updateSessions();
  setInterval(updateSessions, 30000);
})();

/* =========================================================
   NERD PRO SIGNALS — banner, access buttons, Telegram request
   ========================================================= */
(function () {
  "use strict";
  const C = window.FN || {};
  const SIG = C.signals || {};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const amount = Number(SIG.amount) || 10000;
  const ugx = "UGX " + amount.toLocaleString("en-US");
  const TG = SIG.telegram || "https://t.me/forexnerdsbynotoriety";

  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch {} }
  };

  $$("[data-amount]").forEach((el) => (el.textContent = ugx));
  if (SIG.payNumber) $("#payNumber").textContent = SIG.payNumber;

  /* ---------- Availability: banner, bell, buttons ---------- */
  const announce = $("#announce"), bell = $("#bell");
  if (SIG.available) {
    if (SIG.headline) $("#announceHead").textContent = SIG.headline;
    if (SIG.detail) { $("#announceDetail").textContent = SIG.detail; $("#paySignalDetail").textContent = SIG.detail; }
    if (store.get("fn_announce_closed") !== "1") announce.hidden = false;
    bell.hidden = false;
    const heroCard = $(".float-card--bottom");
    if (heroCard) {
      heroCard.setAttribute("data-access", "");
      const pill = heroCard.querySelector(".pill");
      pill.textContent = "Signals live"; pill.className = "pill pill--gold";
      $("#heroSetup").textContent = "Tap to get Nerd Pro signals";
    }
  } else {
    $$("[data-access]").forEach((b) => {
      if (b.closest("#announce") || b === bell) return;
      if (b.id === "proCta") { b.textContent = "Get notified on Telegram"; b.href = TG; b.target = "_blank"; b.rel = "noopener"; b.removeAttribute("data-access"); return; }
      b.disabled = true; b.textContent = "No signals right now";
    });
  }
  $("#announceClose").addEventListener("click", () => { announce.hidden = true; store.set("fn_announce_closed", "1"); });

  /* ---------- Toast + copy ---------- */
  const toastEl = $("#toast"); let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add("is-on");
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch {}
      ta.remove(); return ok;
    }
  }

  /* ---------- Modal ---------- */
  const modal = $("#payModal");
  let lastFocus = null;
  function show(step) { $$(".pstep", modal).forEach((s) => (s.hidden = s.dataset.step !== String(step))); }
  function open() {
    if (!SIG.available) return;
    lastFocus = document.activeElement;
    modal.hidden = false; document.body.classList.add("modal-open");
    show(1);
  }
  function close() {
    modal.hidden = true; document.body.classList.remove("modal-open");
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-access]");
    if (t && !t.disabled) { e.preventDefault(); open(); }
  });
  $$("[data-close]", modal).forEach((el) => el.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });
  $$("[data-back]", modal).forEach((b) => b.addEventListener("click", () => show(b.dataset.back)));

  function buildMessage() {
    const name = $("#payName").value.trim();
    return [
      "Hi Notoriety 👋",
      "",
      `I'm interested in this week's Nerd Pro signals (${ugx}).`,
      SIG.detail ? `Signals: ${SIG.detail}` : null,
      name ? `Name: ${name}` : null,
      "",
      "📎 My proof of payment is attached.",
      "Thank you!"
    ].filter((l) => l !== null).join("\n");
  }

  /* Step 1 → reminder popup */
  $("#requestBtn").addEventListener("click", async () => {
    const msg = buildMessage();
    $("#tgMessage").textContent = msg;
    $("#tgBtn").href = `${TG}?text=${encodeURIComponent(msg)}`;
    show(2);
    if (await copyText(msg)) toast("Message copied ✓");
  });

  /* Step 2 → Telegram */
  $("#tgBtn").addEventListener("click", () => setTimeout(close, 300));

  $$("[data-copy]", modal).forEach((b) => b.addEventListener("click", async () => {
    const src = $(b.dataset.copy, modal);
    if (src && await copyText(src.textContent.trim())) {
      const old = b.textContent; b.textContent = "Copied ✓"; setTimeout(() => (b.textContent = old), 1500);
    }
  }));
})();
