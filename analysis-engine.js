/* =====================================================================
   FOREX NERDS — AUTO ANALYSIS ENGINE
   ---------------------------------------------------------------------
   Rules taken from the reading material in the "reading material" folder:

   • Advanced CRT Gold Training Guide
       - Reference candle → Range High (RH), Range Low (RL), Equilibrium
         EQ = (RH + RL) / 2
       - Bullish CRT: candle 2 trades below RL and CLOSES back inside
       - Bearish CRT: candle 2 trades above RH and CLOSES back inside
       - Top-down: D1 context → H4 reference range → H1 context → M15 MSS + FVG
       - Stop beyond the sweep extreme; targets EQ → opposite side → external
         liquidity; skip the trade if reward-to-risk is poor
   • Smart Money Concepts guide
       - Break of Structure (BOS), Change of Character (CHOCH)
       - Liquidity grab (false breakout), order blocks, fair value gaps (FVG)
       - "No change of character after the liquidity grab → no trade"
   • XAUUSD Bible
       - Psychological levels every 50 pips, top-down H4 → H1 → M15,
         "3 out of 4 confirmations is good, 4 out of 4 is better",
         1% risk per trade, 1:2 minimum reward-to-risk
   • BabyPips
       - Trend with moving averages (EMA 50 / 200), RSI overbought / oversold,
         support & resistance

   Works in the browser (window.FNEngine) and in Node (module.exports).
   This is an educational tool, not financial advice.
   ===================================================================== */
(function (root) {
  "use strict";

  /* ---------------- helpers ---------------- */
  const last = (a, k = 1) => a[a.length - k];
  const body = (c) => Math.abs(c.c - c.o);

  function ema(values, period) {
    if (values.length < period) return [];
    const k = 2 / (period + 1);
    const out = new Array(values.length).fill(null);
    let prev = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
    out[period - 1] = prev;
    for (let i = period; i < values.length; i++) { prev = values[i] * k + prev * (1 - k); out[i] = prev; }
    return out;
  }

  function rsi(candles, period = 14) {
    if (candles.length <= period) return null;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const d = candles[i].c - candles[i - 1].c;
      if (d >= 0) gain += d; else loss -= d;
    }
    gain /= period; loss /= period;
    for (let i = period + 1; i < candles.length; i++) {
      const d = candles[i].c - candles[i - 1].c;
      gain = (gain * (period - 1) + Math.max(d, 0)) / period;
      loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    }
    if (loss === 0) return 100;
    return 100 - 100 / (1 + gain / loss);
  }

  function atr(candles, period = 14) {
    if (candles.length < 2) return 0;
    const trs = [];
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i], p = candles[i - 1];
      trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
    }
    const s = trs.slice(-period);
    return s.reduce((a, b) => a + b, 0) / s.length;
  }

  /* Swing points (fractals): a high with `n` lower highs either side */
  function swings(candles, n = 2) {
    const highs = [], lows = [];
    for (let i = n; i < candles.length - n; i++) {
      let isH = true, isL = true;
      for (let j = 1; j <= n; j++) {
        if (candles[i].h <= candles[i - j].h || candles[i].h < candles[i + j].h) isH = false;
        if (candles[i].l >= candles[i - j].l || candles[i].l > candles[i + j].l) isL = false;
      }
      if (isH) highs.push({ i, p: candles[i].h, t: candles[i].t });
      if (isL) lows.push({ i, p: candles[i].l, t: candles[i].t });
    }
    return { highs, lows };
  }

  /* ---------------- SMC: market structure, BOS / CHOCH ---------------- */
  function structure(candles) {
    const { highs, lows } = swings(candles, 2);
    const res = { trend: "range", event: null, lastHigh: last(highs) || null, lastLow: last(lows) || null, highs, lows };
    if (highs.length < 2 || lows.length < 2) return res;

    const hh = last(highs).p > last(highs, 2).p;
    const hl = last(lows).p > last(lows, 2).p;
    if (hh && hl) res.trend = "bullish";
    else if (!hh && !hl) res.trend = "bearish";

    // Has price closed beyond the most recent swing since it formed?
    const sh = last(highs), sl = last(lows);
    let brokeUp = null, brokeDown = null;
    for (let i = sh.i + 1; i < candles.length; i++) if (candles[i].c > sh.p) { brokeUp = i; break; }
    for (let i = sl.i + 1; i < candles.length; i++) if (candles[i].c < sl.p) { brokeDown = i; break; }

    if (brokeUp !== null && (brokeDown === null || brokeUp > brokeDown)) {
      res.event = { dir: "bullish", type: res.trend === "bearish" ? "CHOCH" : "BOS", level: sh.p, i: brokeUp };
      if (res.trend === "range") res.trend = "bullish";
    } else if (brokeDown !== null) {
      res.event = { dir: "bearish", type: res.trend === "bullish" ? "CHOCH" : "BOS", level: sl.p, i: brokeDown };
      if (res.trend === "range") res.trend = "bearish";
    }
    // A CHOCH flips the working bias
    if (res.event && res.event.type === "CHOCH") res.trend = res.event.dir;
    return res;
  }

  /* ---------------- CRT: Candle Range Theory ----------------
     Look at the last few COMPLETED candle pairs. Candle 1 = reference,
     candle 2 = sweep of one side + close back inside the range.          */
  function crt(candles, lookback = 4) {
    const n = candles.length;
    for (let k = n - 1; k >= Math.max(1, n - lookback); k--) {
      const ref = candles[k - 1], c2 = candles[k];
      const RH = ref.h, RL = ref.l, EQ = (RH + RL) / 2;
      let dir = null, sweep = null;
      if (c2.l < RL && c2.c > RL && c2.c < RH) { dir = "bullish"; sweep = c2.l; }
      else if (c2.h > RH && c2.c < RH && c2.c > RL) { dir = "bearish"; sweep = c2.h; }
      if (!dir) continue;

      // What has happened since?
      let status = "active";
      for (let i = k + 1; i < n; i++) {
        const c = candles[i];
        if (dir === "bullish") {
          if (c.c < sweep) { status = "invalidated"; break; }
          if (c.h >= RH) { status = "target hit"; break; }
        } else {
          if (c.c > sweep) { status = "invalidated"; break; }
          if (c.l <= RL) { status = "target hit"; break; }
        }
      }
      return { dir, RH, RL, EQ, sweep, status, refTime: ref.t, sweepTime: c2.t, barsAgo: n - 1 - k };
    }
    return null;
  }

  /* Re-check a CRT against the still-forming candle / live price */
  function refreshCrt(x, forming) {
    if (!x || x.status !== "active" || !forming) return x;
    if (x.dir === "bullish") {
      if (forming.c < x.sweep) x.status = "invalidated";
      else if (forming.h >= x.RH) x.status = "target hit";
    } else {
      if (forming.c > x.sweep) x.status = "invalidated";
      else if (forming.l <= x.RL) x.status = "target hit";
    }
    return x;
  }

  /* ---------------- Fair value gaps ---------------- */
  function fvgs(candles, minSize) {
    const out = [];
    for (let i = 2; i < candles.length; i++) {
      const a = candles[i - 2], c = candles[i];
      if (a.h < c.l && c.l - a.h >= minSize) out.push({ dir: "bullish", top: c.l, bottom: a.h, i, t: candles[i - 1].t });
      if (a.l > c.h && a.l - c.h >= minSize) out.push({ dir: "bearish", top: a.l, bottom: c.h, i, t: candles[i - 1].t });
    }
    // keep the ones price hasn't fully filled
    return out.filter((g) => {
      for (let j = g.i + 1; j < candles.length; j++) {
        if (g.dir === "bullish" && candles[j].l <= g.bottom) return false;
        if (g.dir === "bearish" && candles[j].h >= g.top) return false;
      }
      return true;
    });
  }

  /* ---------------- Order block: last opposite candle before the move that broke structure ---------------- */
  function orderBlock(candles, event) {
    if (!event) return null;
    for (let i = event.i - 1; i >= Math.max(0, event.i - 15); i--) {
      const c = candles[i];
      if (event.dir === "bullish" && c.c < c.o) return { dir: "bullish", top: c.h, bottom: c.l, t: c.t };
      if (event.dir === "bearish" && c.c > c.o) return { dir: "bearish", top: c.h, bottom: c.l, t: c.t };
    }
    return null;
  }

  /* ---------------- Liquidity: equal highs / lows ---------------- */
  function equalLevels(points, tol) {
    const recent = points.slice(-8);
    for (let a = recent.length - 1; a > 0; a--)
      for (let b = a - 1; b >= 0; b--)
        if (Math.abs(recent[a].p - recent[b].p) <= tol) return (recent[a].p + recent[b].p) / 2;
    return null;
  }

  /* ---------------- Psychological levels (every 50 pips) ---------------- */
  function psychStep(meta) {
    if (meta.code === "XAUUSD") return 5;      // 50 pips on gold
    if (meta.code === "XAGUSD") return 0.5;
    if (/JPY$/.test(meta.code)) return 0.5;
    return 0.005;
  }

  /* ---------------- Main ---------------- */
  function analyse(data, meta) {
    const dp = meta.dp;
    const fmt = (v) => (v == null || !isFinite(v) ? "—" : Number(v).toFixed(dp));
    // Use COMPLETED candles for analysis (the guide: never treat a forming candle as confirmed)
    const done = (arr) => arr.slice(0, -1);
    const D1 = done(data.d1), H4 = done(data.h4), H1 = done(data.h1), M15 = done(data.m15);
    const price = last(data.m15).c;

    const atrH1 = atr(H1), atrM15 = atr(M15), atrH4 = atr(H4);

    /* ---- D1: context ---- */
    const d1s = structure(D1);
    const d1closes = D1.map((c) => c.c);
    const e50 = last(ema(d1closes, 50)), e200 = last(ema(d1closes, 200));
    const dCrt = refreshCrt(crt(D1, 2), last(data.d1));

    /* ---- H4: reference range ---- */
    const h4s = structure(H4);
    const hCrt = refreshCrt(crt(H4, 4), last(data.h4));
    const h4closes = H4.map((c) => c.c);
    const h4e50 = last(ema(h4closes, 50));
    const rangeBars = H4.slice(-40);
    const dealHigh = Math.max(...rangeBars.map((c) => c.h)), dealLow = Math.min(...rangeBars.map((c) => c.l));
    const dealEQ = (dealHigh + dealLow) / 2;
    const zone = price > dealEQ ? "premium" : "discount";

    /* ---- H1: context, RSI, order block, liquidity ---- */
    const h1s = structure(H1);
    const r = rsi(H1, 14);
    const ob = orderBlock(H1, h1s.event);
    // Equal highs above price = buy-side liquidity; equal lows below price = sell-side liquidity
    const eqh = equalLevels(h1s.highs.filter((x) => x.p > price), atrH1 * 0.15);
    const eql = equalLevels(h1s.lows.filter((x) => x.p < price), atrH1 * 0.15);

    /* ---- M15: execution — MSS + FVG ---- */
    const m15s = structure(M15);
    const gaps = fvgs(M15.slice(-80), atrM15 * 0.25);
    const bullGap = gaps.filter((g) => g.dir === "bullish" && g.bottom < price).pop() || null;
    const bearGap = gaps.filter((g) => g.dir === "bearish" && g.top > price).pop() || null;

    // MSS after the H4 sweep (if there is one)
    let mss = null;
    if (hCrt && hCrt.status === "active") {
      const after = M15.filter((c) => c.t >= hCrt.sweepTime);
      if (after.length > 5) {
        const s = structure(M15.filter((c) => c.t >= hCrt.sweepTime - 15 * 60 * 20));
        if (s.event && s.event.dir === hCrt.dir) mss = s.event;
      }
    }
    if (!mss && m15s.event) mss = m15s.event;

    /* ---- Psychological levels ---- */
    const step = psychStep(meta);
    const psychBelow = Math.floor(price / step) * step, psychAbove = psychBelow + step;

    /* ---------------- Scoring ----------------
       Each confirmation adds weight to buyers or sellers.               */
    const bull = [], bear = [];
    const add = (side, w, why) => (side === "bullish" ? bull : bear).push({ w, why });

    if (d1s.trend !== "range") add(d1s.trend, 2, `Daily structure is ${d1s.trend}`);
    if (e50 && e200) add(e50 > e200 ? "bullish" : "bearish", 1, `Daily EMA 50 is ${e50 > e200 ? "above" : "below"} EMA 200`);
    if (e50) add(price > e50 ? "bullish" : "bearish", 1, `Price is ${price > e50 ? "above" : "below"} the daily EMA 50`);
    if (dCrt && dCrt.status === "active") add(dCrt.dir, 2, `Daily CRT: ${dCrt.dir === "bullish" ? "previous day's low" : "previous day's high"} swept and reclaimed`);
    if (h4s.trend !== "range") add(h4s.trend, 2, `H4 structure is ${h4s.trend}${h4s.event ? ` (${h4s.event.type})` : ""}`);
    if (hCrt && hCrt.status === "active") add(hCrt.dir, 3, `H4 CRT: ${hCrt.dir === "bullish" ? "range low" : "range high"} swept and closed back inside`);
    add(zone === "discount" ? "bullish" : "bearish", 1, `Price is in the H4 ${zone} (${zone === "discount" ? "below" : "above"} equilibrium)`);
    if (h1s.trend !== "range") add(h1s.trend, 1, `H1 structure is ${h1s.trend}`);
    if (r != null && r < 30) add("bullish", 1, `H1 RSI oversold (${r.toFixed(0)})`);
    if (r != null && r > 70) add("bearish", 1, `H1 RSI overbought (${r.toFixed(0)})`);
    if (mss) add(mss.dir, 2, `M15 ${mss.type === "CHOCH" ? "change of character" : "break of structure"} to the ${mss.dir === "bullish" ? "upside" : "downside"}`);
    if (bullGap && (!bearGap || bullGap.i > bearGap.i)) add("bullish", 1, "Unfilled bullish FVG below price");
    else if (bearGap) add("bearish", 1, "Unfilled bearish FVG above price");

    const sum = (a) => a.reduce((s, x) => s + x.w, 0);
    const bw = sum(bull), sw = sum(bear);
    const buyPct = bw + sw ? Math.round((bw / (bw + sw)) * 100) : 50;
    const sellPct = 100 - buyPct;
    const lean = buyPct >= 55 ? "bullish" : sellPct >= 55 ? "bearish" : "neutral";

    /* ---------------- Pre-trade checklist (CRT guide + SMC guide) ---------------- */
    const dir = lean === "neutral" ? null : lean;
    const sweepOk = !!(hCrt && hCrt.status === "active" && hCrt.dir === dir) || !!(dCrt && dCrt.status === "active" && dCrt.dir === dir);
    const htfOk = !!dir && (d1s.trend === dir || h4s.trend === dir);
    const mssOk = !!(mss && mss.dir === dir);
    const fvgOk = dir === "bullish" ? !!bullGap : dir === "bearish" ? !!bearGap : false;
    const zoneOk = dir === "bullish" ? zone === "discount" : dir === "bearish" ? zone === "premium" : false;

    /* ---------------- Trade plan ---------------- */
    let plan = null;
    const buffer = atrH1 * 0.2;
    if (dir) {
      const rng = sweepOk && hCrt && hCrt.dir === dir ? hCrt : (dCrt && dCrt.dir === dir ? dCrt : null);
      const gap = dir === "bullish" ? bullGap : bearGap;
      const entry = gap ? (gap.top + gap.bottom) / 2 : price;
      let stop, t1, t2, t3;
      if (dir === "bullish") {
        stop = (rng ? Math.min(rng.sweep, gap ? gap.bottom : Infinity) : Math.min(h1s.lastLow ? h1s.lastLow.p : price - atrH1, gap ? gap.bottom : Infinity)) - buffer;
        t1 = rng ? rng.EQ : dealEQ;
        t2 = rng ? rng.RH : dealHigh;
        const ext = h4s.highs.filter((s) => s.p > Math.max(t2, entry)).map((s) => s.p);
        t3 = eqh && eqh > t2 ? eqh : (ext.length ? Math.min(...ext) : Math.max(dealHigh, t2));
      } else {
        stop = (rng ? Math.max(rng.sweep, gap ? gap.top : -Infinity) : Math.max(h1s.lastHigh ? h1s.lastHigh.p : price + atrH1, gap ? gap.top : -Infinity)) + buffer;
        t1 = rng ? rng.EQ : dealEQ;
        t2 = rng ? rng.RL : dealLow;
        const ext = h4s.lows.filter((s) => s.p < Math.min(t2, entry)).map((s) => s.p);
        t3 = eql && eql < t2 ? eql : (ext.length ? Math.max(...ext) : Math.min(dealLow, t2));
      }
      // Sanity: stop must sit beyond the entry (structural invalidation), never on the wrong side
      if (dir === "bullish" && !(stop < entry)) stop = entry - Math.max(atrH1 * 1.5, buffer);
      if (dir === "bearish" && !(stop > entry)) stop = entry + Math.max(atrH1 * 1.5, buffer);
      // Targets must be in the direction of the trade; drop any that aren't, keep them ordered
      const beyond = (t) => isFinite(t) && (dir === "bullish" ? t > entry : t < entry);
      const tg = [];
      [t1, t2, t3].filter(beyond).sort((a, b) => (dir === "bullish" ? a - b : b - a))
        .forEach((t) => { if (!tg.some((x) => Math.abs(x - t) < atrH1 * 0.1)) tg.push(t); });
      [t1, t2, t3] = [tg[0] ?? null, tg[1] ?? null, tg[2] ?? null];
      const risk = Math.abs(entry - stop);
      const mainT = t2 ?? t1;   // the guide: opposite side of the range is the main target
      const rr = mainT != null && risk ? Math.abs(mainT - entry) / risk : 0;
      plan = { dir, entry, stop, t1, t2, t3, rr, entryType: gap ? "FVG retracement" : "Market / confirmation" };
    }
    const rrOk = !!plan && plan.rr >= 2;

    const checklist = [
      { ok: htfOk, text: "Higher-timeframe (D1 / H4) direction agrees" },
      { ok: sweepOk, text: "Range swept and a candle closed back inside (CRT)" },
      { ok: mssOk, text: "Change of character / MSS on M15 after the sweep" },
      { ok: fvgOk, text: "Fair value gap available for a retracement entry" },
      { ok: zoneOk, text: dir === "bearish" ? "Selling from the premium half of the range" : "Buying from the discount half of the range" },
      { ok: rrOk, text: "Reward-to-risk of at least 1 : 2" }
    ];
    const passed = checklist.filter((c) => c.ok).length;

    /* ---------------- Final opinion ----------------
       Following the material: no sweep + no change of character → no trade.
       Need a clear lean, at least 4 of 6 checks, and acceptable R:R.        */
    let opinion = "Wait", reason;
    if (!dir) reason = "Buyers and sellers are balanced — no clear direction.";
    else if (!sweepOk && !mssOk) reason = `Leaning ${dir}, but there is no liquidity sweep or change of character yet. Wait for the trigger.`;
    else if (!rrOk) reason = `Leaning ${dir}, but the reward-to-risk is below 1 : 2 from here. Don't chase — wait for a better entry.`;
    else if (passed < 4) reason = `Leaning ${dir}, but only ${passed} of 6 confirmations are in place.`;
    else { opinion = dir === "bullish" ? "Buy" : "Sell"; reason = `${passed} of 6 confirmations line up for a ${dir === "bullish" ? "buy" : "sell"}.`; }

    /* ---------------- Per-timeframe rows for the table ---------------- */
    const rowPct = (items) => {
      const b = items.filter((x) => x === "bullish").length, s = items.filter((x) => x === "bearish").length;
      return b + s ? Math.round((b / (b + s)) * 100) : 50;
    };
    const rowOpinion = (p) => (p >= 60 ? "Buy" : p <= 40 ? "Sell" : "Wait");
    const tr = (t) => (t === "bullish" ? "bullish" : t === "bearish" ? "bearish" : "ranging");

    const d1Votes = [d1s.trend, e50 && e200 ? (e50 > e200 ? "bullish" : "bearish") : null, e50 ? (price > e50 ? "bullish" : "bearish") : null, dCrt && dCrt.status === "active" ? dCrt.dir : null];
    const h4Votes = [h4s.trend, hCrt && hCrt.status === "active" ? hCrt.dir : null, hCrt && hCrt.status === "active" ? hCrt.dir : null, zone === "discount" ? "bullish" : "bearish", h4e50 ? (price > h4e50 ? "bullish" : "bearish") : null];
    const h1Votes = [h1s.trend, r != null && r < 30 ? "bullish" : r != null && r > 70 ? "bearish" : null, ob ? ob.dir : null];
    const m15Votes = [m15s.trend, mss ? mss.dir : null, bullGap && (!bearGap || bullGap.i > bearGap.i) ? "bullish" : bearGap ? "bearish" : null];

    const rows = [
      {
        timeframe: "D1",
        analysis: `Daily structure is ${tr(d1s.trend)}${d1s.event ? ` with a ${d1s.event.dir} ${d1s.event.type} at ${fmt(d1s.event.level)}` : ""}. ` +
          (e50 ? `Price is ${price > e50 ? "above" : "below"} the 50 EMA (${fmt(e50)})${e200 ? ` and the 50 EMA is ${e50 > e200 ? "above" : "below"} the 200 EMA` : ""}. ` : "") +
          (dCrt ? `Daily CRT: ${dCrt.dir === "bullish" ? "low" : "high"} of the previous day swept (${dCrt.status}).` : "No daily CRT sweep."),
        buy: rowPct(d1Votes)
      },
      {
        timeframe: "H4",
        analysis: hCrt
          ? `CRT range ${fmt(hCrt.RL)} – ${fmt(hCrt.RH)}, EQ ${fmt(hCrt.EQ)}. ${hCrt.dir === "bullish" ? "Range low" : "Range high"} swept to ${fmt(hCrt.sweep)} and reclaimed — ${hCrt.status}. Structure ${tr(h4s.trend)}, price in ${zone}.`
          : `No valid CRT sweep on the last completed candles. Structure ${tr(h4s.trend)}${h4s.event ? ` (${h4s.event.type} at ${fmt(h4s.event.level)})` : ""}. Price is in the ${zone} of the ${fmt(dealLow)} – ${fmt(dealHigh)} range.`,
        buy: rowPct(h4Votes)
      },
      {
        timeframe: "H1",
        analysis: `Structure ${tr(h1s.trend)}${h1s.event ? `, ${h1s.event.dir} ${h1s.event.type} at ${fmt(h1s.event.level)}` : ""}. RSI ${r != null ? r.toFixed(0) : "—"}${r > 70 ? " (overbought)" : r < 30 ? " (oversold)" : ""}.` +
          (ob ? ` ${ob.dir === "bullish" ? "Bullish" : "Bearish"} order block ${fmt(ob.bottom)} – ${fmt(ob.top)}.` : "") +
          (eqh ? ` Equal highs (buy-side liquidity) near ${fmt(eqh)}.` : "") + (eql ? ` Equal lows (sell-side liquidity) near ${fmt(eql)}.` : ""),
        buy: rowPct(h1Votes)
      },
      {
        timeframe: "M15",
        analysis: (mss ? `${mss.type === "CHOCH" ? "Change of character" : "Break of structure"} to the ${mss.dir === "bullish" ? "upside" : "downside"} at ${fmt(mss.level)}. ` : "No fresh break of structure. ") +
          (bullGap ? `Bullish FVG ${fmt(bullGap.bottom)} – ${fmt(bullGap.top)}. ` : "") + (bearGap ? `Bearish FVG ${fmt(bearGap.bottom)} – ${fmt(bearGap.top)}. ` : "") +
          `Nearest round levels ${fmt(psychBelow)} / ${fmt(psychAbove)}.`,
        buy: rowPct(m15Votes)
      }
    ].map((row) => ({ ...row, sell: 100 - row.buy, opinion: rowOpinion(row.buy) }));

    /* ---------------- Plain-English summary ---------------- */
    const reasons = (lean === "bearish" ? bear : bull).slice().sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.why);
    const against = (lean === "bearish" ? bull : bear).slice().sort((a, b) => b.w - a.w).slice(0, 2).map((x) => x.why);

    return {
      symbol: meta.label, price, priceText: fmt(price), generatedAt: Date.now(),
      buy: buyPct, sell: sellPct, opinion, reason, lean,
      confidence: passed, checklist, rows,
      plan: plan && {
        dir: plan.dir, entryType: plan.entryType,
        entry: fmt(plan.entry), stop: fmt(plan.stop), t1: fmt(plan.t1), t2: fmt(plan.t2), t3: fmt(plan.t3),
        rr: plan.rr ? (plan.rr > 10 ? "10+" : plan.rr.toFixed(1)) : "—"
      },
      levels: {
        crt: hCrt ? { RH: fmt(hCrt.RH), RL: fmt(hCrt.RL), EQ: fmt(hCrt.EQ), sweep: fmt(hCrt.sweep), dir: hCrt.dir, status: hCrt.status } : null,
        range: { high: fmt(dealHigh), low: fmt(dealLow), eq: fmt(dealEQ), zone },
        psych: [fmt(psychBelow), fmt(psychAbove)]
      },
      reasonsFor: reasons, reasonsAgainst: against
    };
  }

  const api = { analyse, _internals: { ema, rsi, atr, swings, structure, crt, fvgs, orderBlock } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FNEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
