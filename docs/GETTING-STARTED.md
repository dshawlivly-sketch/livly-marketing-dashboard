# ⚡ Agent 9 — Getting Started Guide

**Agent 9** is your visual AI console: one dashboard to drive **Claude (Anthropic)**,
**OpenAI**, **Google Gemini**, and **OpenDesign** — with a streaming prompt console,
a reusable skills library, and a live agent status board.

This guide takes you from zero to a fully connected, deployed Agent 9 in about
30 minutes. No prior AI-tooling experience assumed.

---

## Contents

1. [What you're setting up](#1-what-youre-setting-up)
2. [Prerequisites](#2-prerequisites)
3. [Local setup (10 minutes)](#3-local-setup-10-minutes)
4. [Connecting your providers](#4-connecting-your-providers)
5. [Your first runs](#5-your-first-runs)
6. [Working with Skills](#6-working-with-skills)
7. [Reading the Agents board](#7-reading-the-agents-board)
8. [Deploying to Vercel](#8-deploying-to-vercel)
9. [Where your data and keys live](#9-where-your-data-and-keys-live)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What you're setting up

Agent 9 has four workspaces, reachable from the left sidebar:

| Tab | What it's for |
|---|---|
| **▸ Console** | Chat with any connected model, streaming in real time. Set a system prompt, temperature, and max tokens. Tag runs to a project. Toggle **Compare all** to send one prompt to *every* connected provider at once and read the answers side-by-side. |
| **✦ Skills** | Reusable prompt templates with `{{fill-in}}` variables. Click a skill, fill the blanks, pick a model, run. Ships with seven marketing-ready starters; add your own in seconds. |
| **◉ Agents** | The mission-control board. Every run — console prompt, skill run, compare fan-out — appears here with live status, then rolls into history with stats: success rate, latency, token usage, filterable by provider/status/project. |
| **⇄ Connections** | Wire up each provider once, test the connection, and pull its live model list. |

Under the hood, Agent 9 is a React app with a thin serverless proxy layer (`api/`).
The proxy is what talks to the AI providers — **your API keys never reach the browser.**

---

## 2. Prerequisites

- **Node.js 18+** and **npm** — check with `node -v`
- **Git**
- At least one provider API key (you can add the others later):
  - **Claude** → [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key (`sk-ant-…`)
  - **OpenAI** → [platform.openai.com](https://platform.openai.com/api-keys) → Create new secret key (`sk-…`)
  - **Gemini** → [aistudio.google.com](https://aistudio.google.com/apikey) → Get API key (`AIza…`)
  - **OpenDesign** → the URL of your deployed [nexu-io/open-design](https://github.com/nexu-io/open-design) instance (see §4.4)

> 💡 **Tip:** set a monthly spend limit on each provider's billing page before you
> start. Every provider supports this, and it turns a runaway experiment into a
> non-event.

---

## 3. Local setup (10 minutes)

```bash
# 1. Clone
git clone https://github.com/dshawlivly-sketch/visual-ai-harness.git agent9
cd agent9

# 2. Install
npm install

# 3. Configure keys
cp .env.example .env
#    → open .env and paste the keys you have

# 4. Run
npm run dev
```

Open **http://localhost:5173**. That's the whole stack — a Vite plugin mounts the
same serverless handlers that run in production, so there is no separate backend
to start.

You should see the Agent 9 console with grey dots next to each provider in the
sidebar. Grey means "not connected yet" — fix that next.

---

## 4. Connecting your providers

Go to the **⇄ Connections** tab. Each provider has a card with:

- **Server env key** — shows `✓ set` if the key was found in `.env` (or Vercel env vars)
- **Local key override** — paste a key here instead if you don't want to touch `.env`
- **Test connection** — validates the key *and* pulls the provider's live model list

### 4.1 Claude (Anthropic)

1. Put `ANTHROPIC_API_KEY=sk-ant-…` in `.env` (restart `npm run dev` after editing), or paste the key into the card.
2. Click **Test connection** → you should see `✓ Connected — N models available`.
3. Recommended default model: **Claude Opus 4.8** (already the default).

### 4.2 OpenAI

Same flow with `OPENAI_API_KEY`. After a successful test, the model dropdowns
across Agent 9 switch from the built-in shortlist to your account's actual model list.

### 4.3 Gemini

Same flow with `GEMINI_API_KEY` (from Google AI Studio — no GCP project needed).

### 4.4 OpenDesign

OpenDesign is self-hosted, so this one is a URL rather than just a key:

1. Deploy your instance: `gh repo clone nexu-io/open-design`, then follow that repo's deployment README.
2. In Agent 9's OpenDesign card, set **Base URL** to the deployed address
   (or set `OPENDESIGN_BASE_URL` in `.env`).
3. If your instance requires auth, add the bearer token in the **API key** field
   (or `OPENDESIGN_API_KEY`).
4. If your instance's generate endpoint isn't `/api/generate`, set the path in the
   card (or `OPENDESIGN_GENERATE_PATH`).
5. **Test connection.**

Agent 9 POSTs `{ "prompt": "...", "context": "..." }` to the generate endpoint and
renders the response; any image URLs in the reply appear as visual previews on the
Agents board. Different request shape on your instance? Adjust `runOpenDesign()` in
`api/_lib/providers.js` — it's about 30 lines.

### ✅ Connection checklist

You're done when the sidebar shows a colored dot and **ready** next to each
provider you intend to use.

---

## 5. Your first runs

### A single prompt

1. **▸ Console** → the provider tabs at the top-left show a colored dot for each connected provider. Pick one.
2. Choose a model, type a prompt, hit **Run** (or `⌘/Ctrl + Enter`).
3. The reply streams in live. The run is already on the Agents board.

### A system prompt

Click **System prompt** in the toolbar to open the editor. Whatever you put there
applies to every run from the Console until you change it — e.g.
*"You are Livly's marketing copilot. Voice: warm, sharp, never corporate."*

### Compare all — the signature move

1. Toggle **Compare all** in the Console toolbar.
2. Type one prompt, hit **Run**.
3. Agent 9 fans it out to *every connected provider simultaneously* and streams the
   answers into a side-by-side grid.

Use this for quality bake-offs, tone checks, and "which model should own this
task" decisions. Each column is recorded as its own run.

### Projects

The **Project** field in the Console header tags every run (default: `General`).
Set it to a campaign or workstream name — the Agents board filters by it.

---

## 6. Working with Skills

A **skill** is a prompt template with `{{variables}}` that anyone can run without
writing prompts from scratch.

### Running a skill

1. **✦ Skills** → click a card (e.g. *LinkedIn Post Draft*).
2. The run panel opens on the right. Fill in the variables (`topic`, `audience`, …).
3. Pick provider + model (each skill remembers a preferred provider) → **Run skill**.
4. Output streams into the panel — **copy** it, or click **Open in Console →** to
   continue the conversation with the filled prompt.

### Creating your own

Click **+ New skill**:

- **Name / Description** — what teammates see on the card
- **Preferred provider** — the default engine for this skill
- **Tags** — used for the filter row (e.g. `marketing`, `email`)
- **Template** — the prompt, with `{{variable}}` placeholders anywhere you want a fill-in

**Template tips**

- Name variables in plain language: `{{campaign_description}}` beats `{{x}}` — the variable name becomes the form label.
- Bake the format into the template ("3 sections, under 250 words") so output quality doesn't depend on who runs it.
- Be opinionated. "Make the calls, don't list options" is the difference between a draft and a decision.

Skills live in your browser's localStorage. To ship a shared library to your whole
team, edit `src/data/seedSkills.js` and redeploy — see the Customer Implementation
Guide, §5.

---

## 7. Reading the Agents board

**◉ Agents** is the answer to "what's running and what happened."

- **Stat tiles** — Active now, Runs (24h), Success rate, Avg latency, Tokens (24h)
- **Filters** — provider / status / project
- **The feed** — newest first, grouped by day. Every row shows status
  (`RUNNING` with a spinner, `DONE`, `ERROR`, `CANCELLED`), provider, run label,
  kind (`console` / `skill` / `compare`), model, time, duration, and token count.
- **Click a row** to expand the full prompt, output, error detail, and any
  generated design assets (OpenDesign image results render inline).

The sidebar's **Agents** item shows a live badge with the count of active runs, so
you can see work in flight from anywhere in the app.

History keeps the 300 most recent runs. **Clear history** wipes it.

---

## 8. Deploying to Vercel

Local is great; deployed means it's open in a tab all day.

1. Push the repo to GitHub (already done if you cloned from it).
2. [vercel.com/new](https://vercel.com/new) → import the repo → framework preset **Vite** → Deploy.
3. **Settings → Environment Variables** → add the same keys as your `.env`:
   `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`,
   `OPENDESIGN_BASE_URL` (+ optional `OPENDESIGN_API_KEY`, `OPENDESIGN_GENERATE_PATH`).
4. Redeploy so the functions pick up the env vars.

The `api/` folder becomes serverless functions automatically; `vercel.json` handles
the SPA rewrites. Nothing else to configure.

> ⚠️ **Access:** Agent 9 has no built-in login. Anyone with the URL can prompt on
> your keys. Before sharing the link beyond yourself, enable **Vercel Deployment
> Protection** (Settings → Deployment Protection) or put it behind your SSO/access
> proxy. Details in the Customer Implementation Guide, §7.

---

## 9. Where your data and keys live

| Thing | Where it lives | Notes |
|---|---|---|
| Provider API keys | Server env vars (`.env` locally, Vercel env in prod) | Never sent to the browser. Recommended home for all keys. |
| Local key overrides | Your browser's localStorage | Convenience for testing. Sent only to your own `/api` proxy, never to third parties directly. |
| Skills | Browser localStorage (seeded from `src/data/seedSkills.js`) | Per-browser. Edit the seed file for a shared library. |
| Run history | Browser localStorage (last 300 runs) | Per-browser. Clear anytime from the Agents board. |
| Prompts/outputs in flight | Streamed through your own serverless proxy to the provider | Subject to each provider's data policy. |

---

## 10. Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `No API key for <provider>…` on a run | The proxy found no key. Set the env var (and restart dev / redeploy), or add a local override in Connections. |
| Test connection fails with `401` | Key is wrong, revoked, or from the wrong product (e.g. an Anthropic Console *admin* key instead of an API key). Re-issue and re-paste. |
| Test connection fails with `429` | Rate limit or no billing/credits on the provider account. Check the provider's billing page. |
| Model dropdown shows only 3–4 models | You haven't run a successful **Test connection** yet — Agent 9 is using its built-in fallback shortlist. Test to pull the live list. |
| Claude rejects `temperature` | Expected — Claude's newest models don't accept sampling parameters, so Agent 9 deliberately hides the slider for Claude and never sends it. |
| OpenAI `gpt-5`/`o*` ignores your temperature | Same story — reasoning models reject it; the proxy strips it automatically. |
| OpenDesign: `not configured` | Base URL missing. Set it in Connections or via `OPENDESIGN_BASE_URL`. |
| OpenDesign: `404` on run | Your instance's generate path differs. Set **Generate endpoint path** in Connections. |
| Streaming stalls mid-answer on Vercel | Confirm the function logs in Vercel; long generations at high max-tokens can hit function duration limits on the Hobby plan — lower max tokens or upgrade the plan. |
| Env var edits not taking effect locally | The dev server reads `.env` at startup — restart `npm run dev`. |
| Fonts look plain / system-default | The Google Fonts CDN is blocked on your network. Cosmetic only; everything works. |

**Still stuck?** Check the terminal running `npm run dev` (locally) or the Vercel
function logs (deployed) — the proxy logs every provider error with the upstream
message.

---

*Agent 9 · Getting Started Guide · v1.0*
