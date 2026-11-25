/* =====================================================================
   FOREX NERDS BY NOTORIETY — EDITABLE CONTENT
   ---------------------------------------------------------------------
   Update this file every week to publish new setups and analysis.
   You don't need to touch index.html, styles.css or app.js.

   Tip: open this file in Notepad / VS Code, change the text between
   the quotes, save, and refresh the website.
   ===================================================================== */

window.FN = {

  /* ---------- Your links ---------- */
  links: {
    copyTrading: "https://my.hfm.com/en/copy-trading/provider-details?provider=147068614",
    openAccount: "https://www.hfm.com/sv/en/?refid=30607550",
    // Optional: add your social / contact links (leave "" to hide)
    whatsapp: "",   // e.g. "https://wa.me/2567XXXXXXXX"
    telegram: "",   // e.g. "https://t.me/yourchannel"
    instagram: "",
    tiktok: "",
    email: ""       // e.g. "hello@forexnerds.com"
  },

  /* ---------- This week's labels ---------- */
  weekLabel: "Week of 23 – 27 Nov 2026",

  /* ---------- Weekly outlook (short summary) ---------- */
  outlook: {
    title: "Weekly Outlook",
    summary: "Dollar strength is the theme to watch. We're tracking how EUR/USD and Gold react at last week's highs and lows before committing to a direction.",
    points: [
      "Watch last week's high and low on the majors for liquidity sweeps.",
      "Gold: wait for a clean H4 range before looking for entries.",
      "High-impact USD data mid-week — reduce size around releases."
    ]
  },

  /* ---------- Trade setups ----------
     access: "free" or "premium"
     direction: "Bullish" or "Bearish"
     Set example:true to show the "Sample" badge (remove when real). */
  setups: [
    {
      access: "free",
      example: true,
      instrument: "XAU/USD",
      direction: "Bullish",
      timeframe: "H1",
      entry: "Published Monday",
      stop: "Published Monday",
      target: "Published Monday",
      note: "Waiting for a CRT sweep of the Asian low, then an SMC break of structure to confirm."
    },
    {
      access: "premium",
      instrument: "EUR/USD",
      direction: "Bearish",
      timeframe: "H4",
      note: "Full entry, invalidation and targets available to Nerd Pro members."
    },
    {
      access: "premium",
      instrument: "GBP/USD",
      direction: "Bullish",
      timeframe: "H1",
      note: "Full entry, invalidation and targets available to Nerd Pro members."
    }
  ],

  /* ---------- My analysis per instrument (table under the chart) ----------
     One entry per instrument. Each can have one or more rows.
       timeframe: "H4", "H1", "D1"…
       analysis:  your reasoning (keep it short)
       buy / sell: percentages — should add up to 100
       opinion:   "Buy", "Sell" or "Wait"
     Set sample:true to show a "Sample" badge until you write your own. */
  instrumentAnalysis: {
    EURUSD: { updated: "24 Nov 2026", sample: true, rows: [
      { timeframe: "H4", analysis: "Price swept last week's low and closed back inside the range. Watching for a break of structure above 1.0550.", buy: 62, sell: 38, opinion: "Buy" },
      { timeframe: "H1", analysis: "Pullback into a bullish order block. Wait for confirmation before entry.", buy: 55, sell: 45, opinion: "Wait" }
    ]},
    GBPUSD: { updated: "24 Nov 2026", sample: true, rows: [
      { timeframe: "H4", analysis: "Higher lows holding. Liquidity resting above the Asian high.", buy: 58, sell: 42, opinion: "Buy" }
    ]},
    USDJPY: { updated: "24 Nov 2026", sample: true, rows: [
      { timeframe: "H4", analysis: "Rejected from a premium zone. Bearish CRT candle formed on the daily.", buy: 35, sell: 65, opinion: "Sell" }
    ]},
    XAUUSD: { updated: "24 Nov 2026", sample: true, rows: [
      { timeframe: "H4", analysis: "Ranging between key levels. Waiting for a sweep of either side.", buy: 50, sell: 50, opinion: "Wait" },
      { timeframe: "D1", analysis: "Overall trend still bullish — favour buys from discount.", buy: 68, sell: 32, opinion: "Buy" }
    ]},
    USDCHF: { updated: "24 Nov 2026", sample: true, rows: [
      { timeframe: "H4", analysis: "Lower highs forming. Bearish while below the last swing high.", buy: 40, sell: 60, opinion: "Sell" }
    ]},
    AUDUSD: { updated: "24 Nov 2026", sample: true, rows: [
      { timeframe: "H4", analysis: "Choppy structure. No clear edge this week.", buy: 48, sell: 52, opinion: "Wait" }
    ]},
    NZDUSD: { updated: "24 Nov 2026", sample: true, rows: [
      { timeframe: "H4", analysis: "Following AUD. Bearish bias below the weekly open.", buy: 42, sell: 58, opinion: "Sell" }
    ]},
    USDCAD: { updated: "24 Nov 2026", sample: true, rows: [
      { timeframe: "H4", analysis: "Break of structure to the upside. Looking for a retest.", buy: 60, sell: 40, opinion: "Buy" }
    ]},
    XAGUSD: { updated: "24 Nov 2026", sample: true, rows: [
      { timeframe: "H4", analysis: "Tracking gold. Wait for a clean range break.", buy: 52, sell: 48, opinion: "Wait" }
    ]}
  },

  /* ---------- Auto analysis (⚡ button under the chart) ----------
     Visitors upload H4, H1 and M15/M5 screenshots; the server function
     (netlify/functions/analyse.mjs) reads them with a free AI vision model
     (Google Gemini or Groq). See README for the one-time setup. */
  autoAnalysis: {
    enabled: true,
    endpoint: "/api/analyse"
  },

  /* ---------- Latest analysis cards ---------- */
  analysis: [
    {
      tag: "CRT",
      title: "How the Asian range sets up the London move",
      excerpt: "A simple way to read the first sweep of the day — and why most traders enter too early.",
      read: "4 min read"
    },
    {
      tag: "SMC",
      title: "Order blocks vs. supply zones: what actually matters",
      excerpt: "Cutting through the jargon so you know which levels deserve your attention.",
      read: "6 min read"
    },
    {
      tag: "Risk",
      title: "The 1% rule for small accounts in UGX",
      excerpt: "Position sizing for real-life account sizes, with worked examples.",
      read: "5 min read"
    }
  ],

  /* ---------- Nerd Pro price ----------
     Leave price as "" to show "Launching soon". */
  nerdPro: {
    price: "UGX 10,000",
    interval: "/ signal pack"
  },

  /* =================================================================
     NERD PRO SIGNALS — notification + Telegram request
     -----------------------------------------------------------------
     available: true  → banner shows at the top, access buttons appear
     available: false → banner hides, buttons say "No signals right now"
     ================================================================= */
  signals: {
    available: true,
    headline: "New Nerd Pro signals are live",
    detail: "2 premium setups · EUR/USD & GBP/USD",
    amount: 10000,                 // UGX
    payNumber: "0794378419",      // number members send payment to
    telegram: "https://t.me/forexnerdsbynotoriety"
  }
};
