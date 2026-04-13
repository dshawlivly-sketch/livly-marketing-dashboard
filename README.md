# Livly Marketing Dashboard

Q2 2026 marketing operations dashboard. Tracks rocks, content calendar, LinkedIn performance, Apollo outbound, prompt library, and asset library. Data syncs across all devices via Notion.

---

## Setup (one time, ~5 minutes)

### Step 1 — Create the Notion integration

1. Go to [notion.so/profile/integrations](https://notion.so/profile/integrations)
2. Click **New integration**
3. Name it `Livly Dashboard`, select your workspace, click Save
4. Copy the **Internal Integration Secret** (starts with `secret_...`)

### Step 2 — Create the Notion database

1. Open Notion and create a new **private page** (not in any shared space)
2. Name it `Livly Dashboard Data`
3. On that page, type `/database` → choose **Full page database**
4. Name the database anything (e.g. `Dashboard Store`)
5. The database needs exactly **two properties**:
   - **Key** — type: Title (this is the default first column, just rename it)
   - **Value** — type: Text (rich text)
6. Share the database with your integration: click **Share** (top right) → **Connect to** → select `Livly Dashboard`
7. Copy the **database ID** from the URL: it's the 32-character string between the last `/` and the `?`
   - Example: `notion.so/myworkspace/abc123def456...?v=...` → ID is `abc123def456...`

### Step 3 — Add env vars to Vercel

In your Vercel project → **Settings** → **Environment Variables**, add:

| Name | Value |
|------|-------|
| `NOTION_TOKEN` | `secret_...` (from Step 1) |
| `NOTION_DATABASE_ID` | 32-char ID (from Step 2) |

Redeploy after adding vars.

---

## How sync works

- **Instant load**: data reads from localStorage on every page open (zero latency)
- **On mount**: each tab silently fetches its data from Notion and hydrates localStorage with the latest cross-device state
- **On every write**: data writes to localStorage immediately (UI never waits), then async-syncs to Notion in the background
- **Offline**: falls back gracefully to localStorage if Notion is unreachable

This means: open the app on your phone, it loads instantly from localStorage (may be stale), then syncs with Notion within ~1 second. Any changes you make write through immediately.

---

## Deploy to Vercel via GitHub

```bash
cd livly-marketing-dashboard
git init
git add .
git commit -m "Initial build"
git remote add origin https://github.com/YOUR_USERNAME/livly-marketing-dashboard.git
git push -u origin main
```

Then in Vercel → **Add New Project** → import the repo. Vite auto-detected. Deploy.

Add the two env vars (Step 3 above) after the first deploy, then redeploy.

---

## Local development

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`. Without env vars locally, Notion sync is silently skipped and the app runs on localStorage only. This is fine for development.

---

## Apollo weekly workflow

1. Apollo → Reports → Sequence Engagement Report → Export CSV
2. Apollo Pipeline tab → Add week → upload CSV (metrics auto-fill)
3. Enter demos booked manually
4. Save — syncs to Notion automatically

---

## LinkedIn weekly workflow

1. Export from Planable or LinkedIn Analytics
2. LinkedIn tab → Add week → upload CSV → verify → Save

---

## Tech stack

- React 18 + Vite
- Recharts (charts)
- PapaParse (CSV parsing)
- Vercel serverless function (`/api/data.js`) as Notion proxy
- localStorage as instant cache, Notion as cross-device sync layer
