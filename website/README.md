# Forex Nerds by Notoriety — website

Open `index.html` to view the site. All weekly edits happen in `content.js`.

## Nerd Pro signals
In `content.js` → `signals`:
- `available: true` shows the gold banner at the top, the ringing bell, and the "Get access · UGX 10,000" buttons.
- `available: false` hides the banner. The buttons then say "No signals right now".
- Change `headline` and `detail` each time you post new signals. You can also change `amount` and the `telegram` link there.

## How a member requests signals
1. Taps **Get access**, which opens a short window showing the price and what's included. They can add their name if they want.
2. Taps **Request on Telegram**. A message saying they're interested in the signals is written for them and copied.
3. A reminder pops up: **"Don't forget your proof of payment"**.
4. Taps **Got it — open Telegram**. Telegram opens at t.me/forexnerdsbynotoriety with the message already typed. They attach their payment screenshot and send.

## ⚡ Auto analysis (screenshot upload)
Visitors tap **Auto analyse my charts** under the chart. They upload H4, H1 and M15 (or M5) screenshots of one pair and tap **Analyse**. The result shows:
- the **bullish vs bearish chances**, with a one-line summary
- a reading for **each timeframe**, in tabs
- which concepts were spotted: CRT, liquidity sweep, BOS/CHOCH, FVG, order block, premium/discount
- **key levels** to watch
- **what would strengthen** the bullish side and the bearish side

It never says buy or sell, and never gives entries or stop losses.

### How it works
The screenshots are sent to `netlify/functions/analyse.mjs`, a small server function. It passes them to an AI vision model along with the Forex Nerds rulebook, which is built from the reading material (CRT gold guide, SMC guide, XAUUSD Bible, BabyPips). Your API key stays on the server and is never visible to visitors.

### Choose a provider (free options available)
| Provider | Cost | Where to get the key | Netlify variable |
|---|---|---|---|
| **Google Gemini** (recommended) | Free tier | aistudio.google.com → Get API key | `GEMINI_API_KEY` |
| **Groq** | Free tier | console.groq.com → API Keys | `GROQ_API_KEY` |
| Claude | Paid per request | console.anthropic.com | `ANTHROPIC_API_KEY` |

Add only one key. If you add several, the order above decides which one is used. Free tiers have daily and per-minute limits; when a limit is hit, visitors see "the free analysis limit is busy right now".

On Gemini's free tier, Google may use the uploaded screenshots to improve its products. That's fine for chart screenshots, but it's worth knowing.

### Switching it on (one-time setup)
1. **Get a free key** from Google AI Studio (aistudio.google.com).
2. **Put the site on GitHub.** Create a repository and upload everything in this `website` folder, including the `netlify` folder and `netlify.toml`.
3. **Connect it to Netlify.** At app.netlify.com, choose **Add new site → Import from GitHub** and pick the repository. No build command is needed.
4. **Add your key.** In Netlify, go to **Site configuration → Environment variables** and add `GEMINI_API_KEY` = your key. Then redeploy.
5. **Optional:** add `ALLOWED_ORIGIN` = your site's address (e.g. `https://forexnerds.netlify.app`) so other websites can't use your key.

Note: Netlify's drag-and-drop upload doesn't run server functions, so use the GitHub route above. Until a key is added, visitors who try it see "Auto analysis isn't switched on for this website yet."

If a model name ever stops working, set `GEMINI_MODEL` (or `GROQ_MODEL`) in Netlify to a current vision model name from the provider's model list.

To turn the button off, set `autoAnalysis.enabled` to `false` in `content.js`.

`analysis-engine.js` is from the earlier candle-based version. It's no longer used and can be deleted.
