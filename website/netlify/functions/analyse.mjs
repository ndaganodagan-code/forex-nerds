/* =====================================================================
   FOREX NERDS — SCREENSHOT AUTO ANALYSIS (server function)
   ---------------------------------------------------------------------
   Receives 3 chart screenshots (H4, H1 and M15 or M5) from the website,
   sends them to Claude's vision model together with the Forex Nerds
   rulebook (built from the CRT, SMC, XAUUSD Bible and BabyPips material),
   and returns a structured analysis as JSON.

   It never recommends buying or selling — it only describes the chart
   and estimates the chances of each side.

   Pick ONE provider by adding its key in Netlify → Environment variables.
   The first key found is used, in this order:

     GEMINI_API_KEY      FREE  — Google AI Studio (aistudio.google.com)
     GROQ_API_KEY        FREE  — GroqCloud (console.groq.com)
     ANTHROPIC_API_KEY   paid  — Claude (console.anthropic.com)

   Optional:
     GEMINI_MODEL        default: gemini-flash-latest
     GROQ_MODEL          default: qwen/qwen3.6-27b
     ANTHROPIC_MODEL     default: claude-sonnet-5-5
     ALLOWED_ORIGIN      e.g. https://forexnerds.netlify.app (blocks other
                         sites from using your key)
   ===================================================================== */

export const config = { path: "/api/analyse" };

const MAX_IMAGE_BYTES = 3_000_000; // per image, after base64 decoding

const RULEBOOK = `
You are the analysis engine for "Forex Nerds by Notoriety", a forex research and education website.
You receive three chart screenshots of ONE instrument: a higher timeframe (H4), a middle timeframe (H1) and a lower timeframe (M15 or M5).
Analyse them top-down using ONLY the methodology below.

METHODOLOGY

1. Top-down (XAUUSD Bible, CRT guide)
 - H4 = narrative and reference range. H1 = refine context, see whether a range boundary was swept. M15/M5 = confirmation (reclaim, displacement, market structure shift, fair value gap).
 - Never treat the last, still-forming candle as confirmed.

2. Candle Range Theory (Advanced CRT Gold guide)
 - Reference candle: a COMPLETED candle; its high = Range High (RH), its low = Range Low (RL), Equilibrium EQ = (RH + RL) / 2.
 - Bullish CRT: price trades below RL, then a candle CLOSES back inside the range.
 - Bearish CRT: price trades above RH, then a candle CLOSES back inside the range.
 - A sweep alone is not proof of a reversal. Candle 3 expansion is a hypothesis, not a certainty.
 - Above EQ = premium, below EQ = discount (context, not a trigger).
 - Common failure modes: treating every wick as a sweep, labelling candles after the fact to force a pattern.

3. Smart Money Concepts (SMC guide)
 - Uptrend = higher highs and higher lows; a close above the previous high = bullish Break of Structure (BOS).
 - Downtrend = lower highs and lower lows; a close below the previous low = bearish BOS.
 - Change of Character (CHOCH): in an uptrend, price breaks the last higher low; in a downtrend, price breaks the last lower high.
 - Liquidity grab = false breakout of a recent high/low (or equal highs/lows) followed by reversal.
 - "No change of character after the liquidity grab → the setup is not confirmed."
 - Order blocks = zones where price reversed strongly; stronger on higher timeframes.
 - Fair Value Gap (FVG) = three-candle imbalance after a fast move; price often retraces into it, but not always.

4. Gold & key levels (XAUUSD Bible)
 - Psychological / round-number levels (every 50 pips; on gold every $5) and F&R zones (levels touched frequently and recently) act as support/resistance.
 - More confirmations = higher probability ("3 of 4 is good, 4 of 4 is better").

5. Technical (BabyPips)
 - If moving averages or RSI are visible, use them: price above/below a rising/falling MA, RSI above 70 overbought, below 30 oversold.

HOW TO SCORE
 - Weigh bullish versus bearish evidence across the three timeframes. Higher timeframes carry more weight; a confirmed sweep + reclaim + CHOCH/MSS carries the most.
 - "bullish" and "bearish" are whole-number percentages that add up to 100. Use roughly 50/50 when evidence is mixed. Avoid extreme values (above 85) unless the evidence is overwhelming on all timeframes.

STRICT RULES
 - Do NOT tell the user to buy or sell. Do NOT give entries, stop losses, take profits or lot sizes. Describe what the chart shows and the chances of each side only.
 - Only describe what is actually visible. If a price is not readable, say "near the previous high" etc. instead of inventing a number. Read prices from the axis only when legible.
 - If a screenshot is not a price chart, is unreadable, or the three images clearly show different instruments, set "valid" to false and explain briefly in "problem".
 - Plain, friendly English for beginners. Short sentences. Each "reading" at most 2 sentences.

Reply with ONLY a JSON object, no markdown, in exactly this shape:
{
  "valid": true,
  "problem": "",
  "instrument": "e.g. XAU/USD or Unknown",
  "headline": "one short sentence describing the overall picture",
  "bullish": 60,
  "bearish": 40,
  "timeframes": [
    { "tf": "H4", "structure": "bullish | bearish | ranging", "bullish": 65, "reading": "..." },
    { "tf": "H1", "structure": "...", "bullish": 55, "reading": "..." },
    { "tf": "M15", "structure": "...", "bullish": 50, "reading": "..." }
  ],
  "concepts": [
    { "name": "CRT", "found": true, "note": "short note" },
    { "name": "Liquidity sweep", "found": false, "note": "" },
    { "name": "BOS / CHOCH", "found": true, "note": "" },
    { "name": "Fair value gap", "found": false, "note": "" },
    { "name": "Order block", "found": false, "note": "" },
    { "name": "Premium / discount", "found": true, "note": "" }
  ],
  "levels": [ { "label": "Range high", "value": "2650 or 'previous H4 high'" } ],
  "bullishCase": ["what would strengthen the bullish side", "..."],
  "bearishCase": ["what would strengthen the bearish side", "..."]
}
Use the real lower-timeframe label (M15 or M5) for the third entry. Give at most 5 levels and at most 3 points per case.
`;

/* ---------------- AI providers ----------------
   Each returns the model's raw text reply, or throws { status, message }. */
const fail = (status, message) => Object.assign(new Error(message), { status });

async function callGemini(images, prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const parts = [];
  for (const img of images) {
    parts.push({ text: `${img.tf} chart:` });
    parts.push({ inline_data: { mime_type: img.type, data: img.data } });
  }
  parts.push({ text: prompt });
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: RULEBOOK }] },
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 4000 }
    })
  });
  if (!r.ok) throw fail(r.status, await r.text());
  const d = await r.json();
  return ((d.candidates || [])[0]?.content?.parts || []).map((p) => p.text || "").join("");
}

async function callGroq(images, prompt) {
  const model = process.env.GROQ_MODEL || "qwen/qwen3.6-27b";
  const content = [];
  for (const img of images) {
    content.push({ type: "text", text: `${img.tf} chart:` });
    content.push({ type: "image_url", image_url: { url: `data:${img.type};base64,${img.data}` } });
  }
  content.push({ type: "text", text: prompt });
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model, temperature: 0.2, max_tokens: 3000,
      messages: [{ role: "system", content: RULEBOOK }, { role: "user", content }]
    })
  });
  if (!r.ok) throw fail(r.status, await r.text());
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

async function callAnthropic(images, prompt) {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  const content = [];
  for (const img of images) {
    content.push({ type: "text", text: `${img.tf} chart:` });
    content.push({ type: "image", source: { type: "base64", media_type: img.type, data: img.data } });
  }
  content.push({ type: "text", text: prompt });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 2000, system: RULEBOOK, messages: [{ role: "user", content }] })
  });
  if (!r.ok) throw fail(r.status, await r.text());
  const d = await r.json();
  return (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
}

function pickProvider() {
  if (process.env.GEMINI_API_KEY) return callGemini;
  if (process.env.GROQ_API_KEY) return callGroq;
  if (process.env.ANTHROPIC_API_KEY) return callAnthropic;
  return null;
}

const json = (status, body, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });

const clamp = (n, d = 50) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : d;
};

export default async (req) => {
  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.get("origin") || "";
  const corsOrigin = allowed || "*";

  if (req.method === "OPTIONS") return json(204, {}, corsOrigin);
  if (req.method !== "POST") return json(405, { error: "Use POST" }, corsOrigin);
  if (allowed && origin && origin !== allowed) return json(403, { error: "Not allowed" }, corsOrigin);
  const provider = pickProvider();
  if (!provider) return json(503, { error: "not_configured" }, corsOrigin);

  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Bad request" }, corsOrigin); }

  const images = Array.isArray(body.images) ? body.images : [];
  const tfs = images.map((i) => i && i.tf);
  const lower = tfs.includes("M5") ? "M5" : "M15";
  if (images.length !== 3 || !tfs.includes("H4") || !tfs.includes("H1") || !(tfs.includes("M15") || tfs.includes("M5"))) {
    return json(400, { error: "Please upload H4, H1 and M15 (or M5) screenshots." }, corsOrigin);
  }
  for (const img of images) {
    if (!/^image\/(jpeg|png|webp)$/.test(img.type || "") || typeof img.data !== "string") {
      return json(400, { error: "Screenshots must be JPG, PNG or WebP images." }, corsOrigin);
    }
    if (img.data.length * 0.75 > MAX_IMAGE_BYTES) return json(413, { error: "One of the screenshots is too large." }, corsOrigin);
  }

  const order = ["H4", "H1", lower];
  const ordered = order.map((tf) => images.find((i) => i.tf === tf));
  const pair = String(body.pair || "").slice(0, 20).replace(/[^\w/ .-]/g, "");
  const prompt = `Analyse these three screenshots top-down (H4 → H1 → ${lower})${pair ? ` for ${pair}` : ""}. Reply with the JSON object only.`;

  let text;
  try {
    text = await provider(ordered, prompt);
  } catch (e) {
    console.error("AI provider error", e.status, String(e.message).slice(0, 500));
    if (e.status === 429) return json(429, { error: "The free analysis limit is busy right now — please try again in a minute." }, corsOrigin);
    return json(502, { error: "The analysis service had a problem. Please try again." }, corsOrigin);
  }

  let out;
  try {
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "");
    const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
    out = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return json(502, { error: "Couldn't read the analysis. Please try again." }, corsOrigin);
  }

  // Normalise so the page can trust the shape
  const bull = clamp(out.bullish);
  const result = {
    valid: out.valid !== false,
    problem: String(out.problem || ""),
    instrument: String(out.instrument || "Unknown"),
    headline: String(out.headline || ""),
    bullish: bull,
    bearish: 100 - bull,
    timeframes: (Array.isArray(out.timeframes) ? out.timeframes : []).slice(0, 3).map((t, i) => ({
      tf: String(t.tf || order[i]),
      structure: ["bullish", "bearish", "ranging"].includes(String(t.structure).toLowerCase()) ? String(t.structure).toLowerCase() : "ranging",
      bullish: clamp(t.bullish),
      reading: String(t.reading || "")
    })),
    concepts: (Array.isArray(out.concepts) ? out.concepts : []).slice(0, 8).map((c) => ({
      name: String(c.name || ""), found: !!c.found, note: String(c.note || "")
    })),
    levels: (Array.isArray(out.levels) ? out.levels : []).slice(0, 5).map((l) => ({ label: String(l.label || ""), value: String(l.value || "") })),
    bullishCase: (Array.isArray(out.bullishCase) ? out.bullishCase : []).slice(0, 3).map(String),
    bearishCase: (Array.isArray(out.bearishCase) ? out.bearishCase : []).slice(0, 3).map(String)
  };
  return json(200, result, corsOrigin);
};
