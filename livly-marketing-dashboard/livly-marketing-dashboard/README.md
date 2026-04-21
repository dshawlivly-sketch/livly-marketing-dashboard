# Livly Marketing Dashboard

Q2 2026 marketing operations dashboard. 9 tabs covering Command Center, Action Center, Fyxer Intel, Q2 Tracker, Content Calendar, LinkedIn, Apollo, Prompt Library, and Asset Library.

---

## What's new in this build

- **Branding** — Livly secondary mark (Intelligence Green), Fraunces + Libre Franklin fonts
- **LinkedIn** — rebuilt with persistent week-over-week history, two upload slots (Planable CSV + LinkedIn Posts CSV), manual entry, trend charts, top post tracking, Command Center widget
- **Action Center** — bento box layout synced to Notion (David To-Dos database), status cycling pushes back to Notion instantly
- **Fyxer Intel** — 4-section page: Contracts Awaiting Signature, Meeting Action Items, Meeting Summaries, Conference Follow-Ups (live Notion sync)
- **Global sync** — Pull (↓) and Push (↑) buttons in sidebar affect all Notion sources simultaneously
- **Web notifications** — browser push notifications even when tab is closed; in-app toasts when tab is open

---

## Setup

### 1. Notion integration (required)

Go to [notion.so/profile/integrations](https://notion.so/profile/integrations) → New integration → copy the **Internal Integration Secret**.

Share the integration with:
- Your existing KV store database (for tracker/scorecard sync)
- David To-Dos page: `https://www.notion.so/livly/David-Tasks-3496cc1940228069b8d2d4c4d87d203b`
- Conference Follow-Up database: `https://www.notion.so/3386cc19402280a4972af3f7017d897a`

### 2. Vercel environment variables

| Variable | Value |
|---|---|
| `NOTION_TOKEN` | `secret_...` from Step 1 |
| `NOTION_DATABASE_ID` | Your KV store database ID (32-char UUID) |

No other env vars needed. Conference and task databases are hardcoded in the API functions.

### 3. Optional: Zapier for Fyxer Intel

Set up a Zapier webhook to POST to `https://your-app.vercel.app/api/ingest-fyxer`

Configure your Outlook forward rule to send Fyxer emails through Zapier. The endpoint accepts these payload types:

```json
// Meeting summary
{ "type": "meeting-summary", "date": "YYYY-MM-DD", "title": "...",
  "attendees": ["Name <email@domain.com>"], "summary": "..." }

// Action item
{ "type": "action-item", "meetingTitle": "...", "meetingDate": "YYYY-MM-DD",
  "action": "...", "owner": "...", "dueDate": "YYYY-MM-DD" }

// Contract
{ "type": "contract", "documentName": "...", "sender": "...",
  "executionLink": "https://...", "deadline": "YYYY-MM-DD" }
```

Add `X-Zapier-Secret` header and set `ZAPIER_SECRET` env var for security (optional).

---

## Deploy to Vercel via GitHub

```bash
git add .
git commit -m "Add LinkedIn, Action Center, Fyxer Intel, branding, notifications"
git push
```

Vercel auto-deploys on push. Add env vars in Vercel → Settings → Environment Variables, then redeploy.

---

## LinkedIn data workflow

**Weekly — two uploads:**

1. **Planable CSV** (Cross-Channel Performance export) → Upload in LinkedIn tab → Upload / Add → Planable CSV slot
   - Gets: per-page followers, follower delta, total impressions, engagements, ER
   
2. **LinkedIn Posts CSV** (LinkedIn Analytics → Posts → Export CSV) → Upload in same tab → Posts slot
   - Gets: per-post topic, impressions, engagements — populates top post callout in Command Center

Both uploads are additive — history builds week over week and persists via Notion.

---

## Action Center sync

Tasks live in Notion (David To-Dos database). Workflow:

1. Admin adds tasks to Notion with Priority and Due Date
2. Press ↓ Pull in sidebar or "Sync from Notion" button in Action Center
3. Browser push notification fires when new tasks arrive
4. Click status badge on any task to cycle: Not started → In progress → Done → Blocked
5. Status change pushes to Notion immediately (no batch sync needed)

---

## Fyxer / Conference Follow-Up

Conference Follow-Ups pull directly from the existing Notion database. Press ↓ Pull (global) or the Sync button inside the Conference section. Click any row to open the Notion-style side drawer with full contact detail, copyable notes, and status cycling that syncs back on save.

Archived statuses (Demo Completed, Opportunity Created) move contacts to the Archive tab and count in the weekly recap.

---

## Notifications

On first load, the sidebar shows "Enable notifications." Click it once to grant browser permission. After that:
- New Fyxer items → browser push notification (even with tab closed)  
- New Notion tasks pulled → push notification
- All notifications also show as in-app toasts (top-right, 5s) when the tab is open

---

## Tech stack

- React 18 + Vite
- Recharts (charts)
- Vercel serverless functions (4 API routes)
- Notion as sync backend + KV store
- `localStorage` as instant read cache (hydrates from Notion on mount)
- Service worker for background push notifications
