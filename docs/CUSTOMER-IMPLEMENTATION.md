# ⚡ Agent 9 — Customer Implementation Guide

This is the playbook for rolling **Agent 9** out to a customer, client team, or
business unit: provisioning, provider enablement, OpenDesign integration, skills
curation, access control, training, and ongoing operations.

**Audience:** the person implementing Agent 9 on a customer's behalf (agency,
consultant, internal platform owner). For individual setup, hand end users the
companion **Getting Started Guide** (`docs/GETTING-STARTED.md`).

---

## Contents

1. [Implementation model at a glance](#1-implementation-model-at-a-glance)
2. [Phase 0 — Discovery](#2-phase-0--discovery)
3. [Phase 1 — Provisioning](#3-phase-1--provisioning)
4. [Phase 2 — Provider enablement](#4-phase-2--provider-enablement)
5. [Phase 3 — OpenDesign integration](#5-phase-3--opendesign-integration)
6. [Phase 4 — Skills library rollout](#6-phase-4--skills-library-rollout)
7. [Phase 5 — Access control](#7-phase-5--access-control)
8. [Phase 6 — Training & adoption](#8-phase-6--training--adoption)
9. [Phase 7 — Operations](#9-phase-7--operations)
10. [Security & data summary](#10-security--data-summary)
11. [Master rollout checklist](#11-master-rollout-checklist)
12. [FAQ](#12-faq)

---

## 1. Implementation model at a glance

**One customer = one repo fork/clone + one Vercel project + their own provider keys.**

```
agent9 (template repo)
   │  fork / "Use this template" per customer
   ├── acme-agent9        → Vercel project "acme-agent9"      → agent9.acme.com
   └── globex-agent9      → Vercel project "globex-agent9"    → agent9.globex.io
```

Why per-customer instances rather than multi-tenant:

- **Key isolation** — each customer's provider spend is on their own keys and their own billing.
- **Skill isolation** — each instance ships that customer's seed skill library.
- **Blast-radius** — one customer's config mistake can't touch another.
- **Simple upgrades** — pull from the template repo, resolve, redeploy (see §9.3).

Typical end-to-end timeline: **half a day** of implementer time, spread over a week
(waiting on customer keys is always the long pole).

---

## 2. Phase 0 — Discovery

Run this checklist with the customer before touching anything. Fifteen minutes
here saves days later.

**Providers & keys**

- [ ] Which providers will they use? (Claude / OpenAI / Gemini / OpenDesign — any subset is fine)
- [ ] Who owns each provider account, and who can issue API keys?
- [ ] Are there existing org policies on AI vendors (approved-vendor list, DPA requirements)?
- [ ] Monthly budget per provider? (You'll set spend limits to match, §4.)

**Data**

- [ ] What will users paste into prompts? Any PII / confidential material?
- [ ] Does each provider's data-handling policy pass the customer's bar?
      (All three majors offer no-training-on-API-data terms; link the customer to
      each provider's current policy and get sign-off in writing.)

**Access**

- [ ] Who are the users (names/count)? Champions?
- [ ] What access-control mechanism fits (§7): Vercel Deployment Protection, Cloudflare Access, or existing SSO proxy?
- [ ] Custom domain? (e.g. `agent9.customer.com`)

**OpenDesign**

- [ ] Do they want the design generation lane? If yes: who hosts the
      `nexu-io/open-design` instance — you or them? (§5)

**Success criteria**

- [ ] Define "adopted" — e.g. *10 active users and 200 runs/month by week 4*.
      The Agents board's 24h stats plus provider usage dashboards give you the numbers.

---

## 3. Phase 1 — Provisioning

### 3.1 Create the customer instance

```bash
# From the template repo
git clone https://github.com/dshawlivly-sketch/visual-ai-harness.git acme-agent9
cd acme-agent9
git remote set-url origin https://github.com/<your-org>/acme-agent9.git
git push -u origin main
```

### 3.2 Brand it for the customer (optional, 10 minutes)

| What | Where |
|---|---|
| App name in sidebar | `src/components/Sidebar.jsx` — `brand-name` / `brand-sub` |
| Browser tab title | `index.html` — `<title>` |
| Colors | `src/styles.css` — the `:root` CSS variables (`--accent` is the primary brand lever) |
| Favicon | `index.html` — the inline SVG emoji favicon |
| Seed skills | `src/data/seedSkills.js` (§6) |

### 3.3 Deploy

1. [vercel.com/new](https://vercel.com/new) → import the customer repo → preset **Vite** → Deploy.
2. Add env vars (Settings → Environment Variables) — see the matrix below. Use
   **Production** scope; add **Preview** only if you want branch previews to work
   against real keys (usually you don't).
3. Attach the custom domain (Settings → Domains) and have the customer add the CNAME.
4. Redeploy after env vars are in.

### 3.4 Environment variable matrix

| Variable | Required | Value |
|---|---|---|
| `ANTHROPIC_API_KEY` | If using Claude | Customer-issued key |
| `OPENAI_API_KEY` | If using OpenAI | Customer-issued key |
| `GEMINI_API_KEY` | If using Gemini | Customer-issued key |
| `OPENDESIGN_BASE_URL` | If using OpenDesign | Deployed instance URL |
| `OPENDESIGN_API_KEY` | Optional | Bearer token if the instance requires auth |
| `OPENDESIGN_GENERATE_PATH` | Optional | Only if not `/api/generate` |

**Record who holds each key and when it was issued** — you'll want this at
rotation time (§9.2).

---

## 4. Phase 2 — Provider enablement

For each provider the customer will use:

1. **Customer issues the key** from their own account (never re-use your agency
   keys in a customer instance — billing and data terms must be theirs):
   - Claude → console.anthropic.com → API Keys
   - OpenAI → platform.openai.com → API Keys (issue from a **project** scoped to Agent 9, not the org default)
   - Gemini → aistudio.google.com → API keys
2. **Set a spend limit** matching the Phase-0 budget on the provider's billing page.
3. **Paste into Vercel env**, redeploy.
4. **Verify in the app** — Connections tab → *Test connection* → expect
   `✓ Connected — N models available`. This also pulls the live model list into
   every model dropdown.
5. **Smoke-test a run** — Console → short prompt → confirm streaming reply and a
   `DONE` row on the Agents board.

**Model guidance to give customers** (current defaults are sensible; this is the
"why"):

| Need | Recommend |
|---|---|
| Default writing & reasoning | Claude Opus 4.8 |
| Fast/cheap high-volume drafts | Claude Haiku 4.5 or GPT-5 mini / Gemini Flash |
| Second opinions & bake-offs | Console → **Compare all** |

Note: Agent 9 intentionally does not send `temperature` to Claude 4.7+/5-family or
OpenAI reasoning models — those APIs reject sampling parameters. Users will see the
slider only where it's actually supported. Say this in training so nobody files it
as a bug.

---

## 5. Phase 3 — OpenDesign integration

Skip this section if the customer isn't taking the design lane.

### 5.1 Deploy the instance

```bash
gh repo clone nexu-io/open-design
```

Deploy per that repo's README. Decide with the customer who hosts:

- **Customer-hosted** (preferred): their infra, their assets, their auth.
- **Implementer-hosted**: fine for pilots; plan a handover date.

### 5.2 Wire it to Agent 9

Set `OPENDESIGN_BASE_URL` (+ key/path if applicable) in Vercel and redeploy, or
configure it per-browser in the Connections tab during a pilot.

### 5.3 The endpoint contract

Agent 9 calls the instance like this:

```
POST {OPENDESIGN_BASE_URL}{OPENDESIGN_GENERATE_PATH or /api/generate}
Authorization: Bearer {OPENDESIGN_API_KEY}          # only if set
Content-Type: application/json

{ "prompt": "<user's design brief>", "context": "<system prompt, if any>" }
```

- JSON responses are pretty-printed in the run output.
- **Any image URLs found anywhere in the response render as asset previews** on the
  Agents board (png/jpg/svg/webp/gif).
- If the customer's instance uses a different request/response shape, adapt
  `runOpenDesign()` in `api/_lib/providers.js` (~30 lines) in *their* fork —
  that's the designed extension point.

### 5.4 Validate

Run the seeded **Design Concept (OpenDesign)** skill with a real brief. Confirm the
run completes and assets preview on the Agents board.

---

## 6. Phase 4 — Skills library rollout

Skills are where Agent 9 stops being a chat toy and becomes the customer's tool.

### 6.1 Curate before launch

Workshop 5–10 skills from the customer's actual recurring work. Good sources: any
prompt someone keeps in a doc, any weekly writing task, any "can you make this
sound like us" request. For each:

- **Name** it by outcome (*"Weekly Recap Writer"*, not *"Prompt 7"*)
- Bake the **voice and format rules** into the template so quality doesn't depend on the operator
- Choose the **preferred provider** deliberately (and note why)
- **Tag** by team or workflow — tags drive the filter UI

### 6.2 Ship them as seeds

Edit `src/data/seedSkills.js` in the customer's fork and redeploy. Seeded skills
appear for every user on first load.

**Important mechanics:** skills live in each browser's localStorage after first
load. Users can add/edit their own freely (that's a feature — local
experimentation), but a redeploy with new seeds only reaches **new browsers** —
existing users keep their stored library. For pilot-stage teams the practical
convention is: *the seed file is the source of truth; users rebuild their local
tweaks into the seed file via you.* (See FAQ for the roadmap item on shared
server-side skills.)

### 6.3 Naming & governance conventions

- Prefix experimental skills with `[draft]` so users know what's blessed.
- One owner per skill — name them in the description if helpful.
- Review the library monthly against the Agents board: skills with zero runs get
  fixed or deleted.

---

## 7. Phase 5 — Access control

**Agent 9 ships with no built-in authentication.** Anyone with the URL can prompt
on the customer's keys. Never launch without one of these in front of it:

| Option | Fit | Effort |
|---|---|---|
| **Vercel Deployment Protection** (password or Vercel SSO) | Small teams, fastest path | Minutes — Settings → Deployment Protection |
| **Cloudflare Access** (or similar zero-trust proxy) | Customers with Google/Microsoft SSO who want per-user policy | ~1 hour — put the domain behind Access, allow the customer's email domain |
| **Existing corporate SSO / VPN** | Enterprise customers | Their infra team's standard pattern |

Also set expectations on the **local key override** feature: it lets a user paste a
personal API key in the Connections tab (stored only in their browser, sent only to
the instance's own proxy). For most customers this is a feature (contractor with
their own key); if the customer wants env-only keys as policy, say so in training —
or strip the override inputs from `Connections.jsx` in their fork.

---

## 8. Phase 6 — Training & adoption

### 8.1 The 30-minute launch session

| Minutes | Segment |
|---|---|
| 0–5 | Why Agent 9: one console, all models, everything logged. Tour the four tabs. |
| 5–12 | **Console** live demo: prompt, system prompt, projects — then the wow moment: **Compare all** on a real work prompt. |
| 12–20 | **Skills**: run two of *their* seeded skills end-to-end; create one from scratch live. |
| 20–25 | **Agents board**: find your run, read status/latency/tokens, filter by project. |
| 25–30 | House rules: data policy (what may be pasted), access, who owns keys, where to ask questions. |

### 8.2 Adoption mechanics that actually work

- **Champion per team** — the person who owns the skill library and fields "how do I" questions.
- **Seed real work, not demos** — the first five skills must map to tasks people did *last week*.
- **Weekly 15-min "skill review"** for the first month: what did people run, what failed, what's missing (the Agents board is the agenda).
- **Project tags from day one** — retroactive tagging never happens.

### 8.3 Success metrics

Pull weekly during rollout:

- Runs/week and unique active users (Agents board + a quick localStorage export, or eyeball the 24h tiles at a consistent time)
- Success rate (error rate spikes = key/quota problems — fix fast, they kill trust)
- Provider spend vs. budget (provider dashboards)
- Skill coverage: % of runs that are `skill` kind vs raw `console` — rising skill share means the library matches real work

---

## 9. Phase 7 — Operations

### 9.1 Monitoring

- **In-app:** the Agents board is the first stop for "is it working" — error rows
  carry the upstream provider message verbatim.
- **Vercel:** function logs show every proxy error; set a Vercel log drain or
  alert if the customer wants ops-grade visibility.
- **Provider dashboards:** spend and rate-limit graphs live there; check during
  the weekly review in month one, monthly after.

### 9.2 Key rotation

Quarterly, or immediately on any suspicion of exposure:

1. Customer issues a new key on the provider console.
2. Swap the Vercel env var → redeploy (zero downtime).
3. Revoke the old key.
4. Update your key registry (owner, date, instance).

### 9.3 Upgrades

The customer fork stays connected to the template:

```bash
git remote add upstream https://github.com/dshawlivly-sketch/visual-ai-harness.git
git fetch upstream
git merge upstream/main        # resolve seedSkills/branding conflicts — they're yours
# test locally: npm install && npm run dev
git push                       # Vercel auto-deploys
```

Customer-specific surface area is intentionally tiny (branding strings, seed
skills, possibly `runOpenDesign()`), so merges are usually clean.

### 9.4 Support tiers (suggested)

| Tier | Handled by | Examples |
|---|---|---|
| 1 | Customer champion | "How do I run a skill", "what model should I pick" |
| 2 | Implementer | Key rotation, new skills shipped as seeds, provider errors |
| 3 | Implementer (code) | OpenDesign adapter changes, upgrades, new provider lanes |

---

## 10. Security & data summary

The one-pager to hand the customer's security reviewer:

| Item | Answer |
|---|---|
| Where do API keys live? | Server-side env vars in the customer's own Vercel project. Never delivered to the browser. |
| What does the browser talk to? | Only the instance's own `/api` serverless proxy. |
| Optional local overrides? | A user *may* paste a personal key; it stays in their browser's localStorage and is sent only to the instance's own proxy. Can be disabled by removing the inputs from `Connections.jsx`. |
| Where do prompts/outputs go? | Browser → customer's own proxy → the selected provider. No third-party analytics, no Agent 9 vendor backend, no telemetry. |
| What's stored, where? | Skills and run history (last 300 runs) in each user's browser localStorage. Nothing server-side beyond provider-side retention per their policies. |
| Authentication? | None built in — must deploy behind Deployment Protection / Cloudflare Access / SSO (§7). |
| Codebase | Small, auditable: ~25 files, React + 4 serverless functions, one SDK dependency (`@anthropic-ai/sdk`). |

---

## 11. Master rollout checklist

```
PHASE 0 — DISCOVERY
[ ] Providers selected, key owners named
[ ] Budgets set per provider
[ ] Data policy sign-off
[ ] Access-control mechanism chosen
[ ] Success criteria written down

PHASE 1 — PROVISIONING
[ ] Customer fork created and pushed
[ ] Branding applied (name, colors, title, favicon)
[ ] Vercel project created, preset Vite
[ ] Env vars set (Production scope)
[ ] Custom domain live

PHASE 2 — PROVIDERS
[ ] Keys issued from customer accounts
[ ] Spend limits set
[ ] Test connection ✓ per provider
[ ] Smoke-test run DONE per provider

PHASE 3 — OPENDESIGN (if in scope)
[ ] Instance deployed, hosting owner agreed
[ ] Base URL / auth wired
[ ] Design Concept skill validated, assets preview

PHASE 4 — SKILLS
[ ] 5–10 customer skills workshopped
[ ] Shipped in seedSkills.js, redeployed
[ ] Naming/tagging conventions agreed

PHASE 5 — ACCESS
[ ] Auth in front of the URL — verified from an incognito window
[ ] Local-override policy decided and communicated

PHASE 6 — TRAINING
[ ] 30-min launch session delivered
[ ] Champion named
[ ] House rules distributed

PHASE 7 — OPERATIONS
[ ] Key registry recorded
[ ] Rotation schedule on the calendar
[ ] Weekly review booked for weeks 1–4
```

---

## 12. FAQ

**Can multiple customers share one deployment?**
Not recommended — keys, skills, and run history would be commingled. One fork +
one Vercel project per customer is the model (§1).

**Can we make skills shared/server-side instead of per-browser?**
Today the seed file is the shared layer and localStorage is the personal layer.
A server-side skill store (e.g. Vercel KV or the customer's Notion) is a
straightforward extension — the store interface in `src/store.jsx` is the seam.

**Can we add another provider (Mistral, Azure OpenAI, Bedrock…)?**
Yes — each provider is one adapter function in `api/_lib/providers.js`, an entry
in `src/lib/providers.js`, and a fallback model list. The OpenAI adapter is the
template for anything OpenAI-compatible (Azure needs base-URL + api-version
tweaks).

**What happens when a provider is down or a key hits its limit?**
The run fails fast with the upstream error on the Agents board; other providers
are unaffected. Compare-all is the built-in workaround — users just run the lane
that's up.

**Does Agent 9 phone home?**
No. There's no vendor backend, no analytics, no telemetry. Traffic goes browser →
customer's proxy → providers, full stop.

---

*Agent 9 · Customer Implementation Guide · v1.0*
