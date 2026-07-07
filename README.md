# ⚡ Harness — Visual AI Console

One dashboard to drive **Claude (Anthropic)**, **OpenAI**, **Google Gemini**, and
**[OpenDesign](https://github.com/nexu-io/open-design)** — with a prompt console,
reusable skills, and a live agent status board.

## What's inside

| Tab | What it does |
|---|---|
| **Console** | Streaming chat with any connected model. System prompt, temperature, max tokens, project tagging. **Compare all** fans one prompt out to every connected provider side-by-side. |
| **Skills** | Reusable prompt templates with `{{variables}}` — fill the blanks, pick a provider/model, run. Create, edit, and tag your own; seeded with marketing-ready starters. |
| **Agents** | Live status board: active runs, 24h stats (success rate, latency, tokens), full run history with prompt/output/error detail, filterable by provider, status, and project. |
| **Connections** | Wire up each provider, test the connection, and pull its live model list. |

Everything you run — console prompts, skill runs, compare fan-outs — is recorded as a
run and streams onto the Agents board in real time.

## Architecture

- **Frontend:** React 18 + Vite, no framework bloat. State persists in `localStorage`.
- **Backend:** Vercel-style serverless functions in `api/` that proxy each provider and
  normalize all of them to one SSE stream (`delta` → `done`/`error`). Keys never reach
  the browser.
- **Local dev:** a Vite plugin mounts the same `api/` handlers on the dev server, so
  `npm run dev` runs the full stack — no `vercel dev` needed.

```
Browser ──POST /api/chat──▶  api/chat.js ──▶ Anthropic SDK (streaming)
                                        ├──▶ OpenAI chat completions (SSE)
                                        ├──▶ Gemini streamGenerateContent (SSE)
                                        └──▶ OpenDesign instance (REST)
```

## Setup

### 1. Install & run

```bash
npm install
cp .env.example .env   # add your keys
npm run dev            # http://localhost:5173
```

### 2. Keys

Set any of these (all optional — connect only what you use):

| Env var | Provider |
|---|---|
| `ANTHROPIC_API_KEY` | Claude — [console.anthropic.com](https://console.anthropic.com) |
| `OPENAI_API_KEY` | OpenAI — [platform.openai.com](https://platform.openai.com) |
| `GEMINI_API_KEY` | Gemini — [aistudio.google.com](https://aistudio.google.com) |
| `OPENDESIGN_BASE_URL` | Your deployed OpenDesign instance |
| `OPENDESIGN_API_KEY` | Optional bearer token for that instance |

You can also paste keys in the **Connections** tab as browser-local overrides — they're
stored only in your browser's localStorage and only sent to your own `/api` proxy.

### 3. OpenDesign

OpenDesign is self-hosted:

```bash
gh repo clone nexu-io/open-design
# deploy it (see that repo's README), then set:
# OPENDESIGN_BASE_URL=https://your-instance.example.com
```

The harness POSTs `{ prompt, context }` to `/api/generate` on your instance
(path configurable via `OPENDESIGN_GENERATE_PATH` or in Connections) and renders the
response — any image URLs in the reply show up as asset previews on the Agents board.
If your instance uses a different request shape, adjust `runOpenDesign()` in
`api/_lib/providers.js` — it's ~30 lines.

## Deploy to Vercel

1. Push this repo to GitHub and import it into Vercel (framework preset: **Vite**).
2. Add the env vars under Settings → Environment Variables.
3. Deploy. The `api/` folder becomes serverless functions automatically;
   `vercel.json` handles SPA rewrites.

## Notes

- Claude requests use the official `@anthropic-ai/sdk` with streaming and adaptive
  thinking on supported models; temperature is intentionally not sent to Claude 4.7+/5
  models (the API rejects sampling params there).
- OpenAI reasoning models (`o*`, `gpt-5*`) also reject temperature — the proxy handles
  that automatically.
- Run history is capped at the 300 most recent runs.
