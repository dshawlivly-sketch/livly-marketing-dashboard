export const ROCKS = [
  { id: 'r1', label: 'Apollo', fullName: 'Apollo Outbound Engine', color: '#B07830', n: 1 },
  { id: 'r2', label: 'Assets', fullName: 'Sales Asset Library', color: '#F07B6B', n: 2 },
  { id: 'r3', label: 'Reach', fullName: 'GTM Distribution & Reach', color: '#5abf82', n: 3 },
  { id: 'r4', label: 'Web +', fullName: 'Website Framework (bonus)', color: '#4a90d9', n: 4, bonus: true },
]

export const ITEMS = [
  // ── Rock 1: Apollo Outbound Engine ─────────────────────────────────
  { id:'a01', rock:'r1', cat:'April — build',   text:'Audit domain warmup status and sender reputation' },
  { id:'a02', rock:'r1', cat:'April — build',   text:'Configure sender profile, email signature, and from-name' },
  { id:'a03', rock:'r1', cat:'April — build',   text:'Define ICP segments by portfolio size, PMS, and region' },
  { id:'a04', rock:'r1', cat:'April — build',   text:'Import, clean, and tag ICP contact list in Apollo' },
  { id:'a05', rock:'r1', cat:'April — build',   text:'Write Sequence 1: cold outreach — platform narrative' },
  { id:'a06', rock:'r1', cat:'April — build',   text:'Write Sequence 2: competitive displacement (Yardi / Entrata)' },
  { id:'a07', rock:'r1', cat:'April — build',   text:'Write Sequence 3: warm follow-up and event attendees' },
  { id:'a08', rock:'r1', cat:'April — build',   text:'Build sequence cadence logic — steps, timing, conditions' },
  { id:'a09', rock:'r1', cat:'April — build',   text:'Configure reply detection and out-of-office handling' },
  { id:'a10', rock:'r1', cat:'April — build',   text:'Set up Salesforce CRM sync' },
  { id:'a11', rock:'r1', cat:'April — build',   text:'Test all sequences with internal test accounts' },
  { id:'a12', rock:'r1', cat:'May–June — live', text:'Soft launch: 25 contacts, first live sequence' },
  { id:'a13', rock:'r1', cat:'May–June — live', text:'Monitor Week 1 delivery rate, reply rate, and bounces' },
  { id:'a14', rock:'r1', cat:'May–June — live', text:'Scale to 100 emails per week cadence' },
  { id:'a15', rock:'r1', cat:'May–June — live', text:'Weekly subject line and CTA A/B optimization' },
  { id:'a16', rock:'r1', cat:'May–June — live', text:'Track and attribute demos booked to sequences' },

  // ── Rock 2: Sales Asset Library — P1 (Q2 commit) ───────────────────
  { id:'b01', rock:'r2', cat:'P1 — Q2 commit',   text:'Sales deck (sales version)' },
  { id:'b02', rock:'r2', cat:'P1 — Q2 commit',   text:'One-pager: LivlyOS platform overview' },
  { id:'b03', rock:'r2', cat:'P1 — Q2 commit',   text:'One-pager: AI Concierge / Zero Inbox' },
  { id:'b04', rock:'r2', cat:'P1 — Q2 commit',   text:'One-pager: Staff Key' },
  { id:'b05', rock:'r2', cat:'P1 — Q2 commit',   text:'One-pager: Resident Ambassadors' },
  { id:'b06', rock:'r2', cat:'P1 — Q2 commit',   text:'Solution brief — full platform narrative' },
  { id:'b07', rock:'r2', cat:'P1 — Q2 commit',   text:'Competitive battle cards (Yardi, Entrata, 1Valet)' },
  { id:'b08', rock:'r2', cat:'P1 — Q2 commit',   text:'Pricing sheet — internal' },
  { id:'b09', rock:'r2', cat:'P1 — Q2 commit',   text:'Pricing sheet — customer-facing' },
  { id:'b10', rock:'r2', cat:'P1 — Q2 commit',   text:'ROI / business case calculator' },
  { id:'b11', rock:'r2', cat:'P1 — Q2 commit',   text:'ICP definition document' },
  { id:'b12', rock:'r2', cat:'P1 — Q2 commit',   text:'Discovery question framework' },
  { id:'b13', rock:'r2', cat:'P1 — Q2 commit',   text:'QBR deck' },
  { id:'b14', rock:'r2', cat:'P1 — Q2 commit',   text:'Partner one-pager and co-branded templates' },
  { id:'b15', rock:'r2', cat:'P1 — Q2 commit',   text:'Email nurture sequences (3 tracks)' },

  // ── Rock 2: P2 (head start) ─────────────────────────────────────────
  { id:'b16', rock:'r2', cat:'P2 — head start', text:'Objection handling guide' },
  { id:'b17', rock:'r2', cat:'P2 — head start', text:'Case studies and customer success stories' },
  { id:'b18', rock:'r2', cat:'P2 — head start', text:'Testimonial library' },
  { id:'b19', rock:'r2', cat:'P2 — head start', text:'Demo script and talk track guide' },
  { id:'b20', rock:'r2', cat:'P2 — head start', text:'Demo environment setup guide' },
  { id:'b21', rock:'r2', cat:'P2 — head start', text:'Proposal template' },
  { id:'b22', rock:'r2', cat:'P2 — head start', text:'Onboarding deck' },
  { id:'b23', rock:'r2', cat:'P2 — head start', text:'Customer health scorecard' },
  { id:'b24', rock:'r2', cat:'P2 — head start', text:'Renewal playbook' },
  { id:'b25', rock:'r2', cat:'P2 — head start', text:'Website copy — solution pages and homepage' },
  { id:'b26', rock:'r2', cat:'P2 — head start', text:'Event and conference one-pager' },
  { id:'b27', rock:'r2', cat:'P2 — head start', text:'Product launch kit' },

  // ── Rock 2: P3 (future) ─────────────────────────────────────────────
  { id:'b28', rock:'r2', cat:'P3 — future', text:'Investor pitch deck' },
  { id:'b29', rock:'r2', cat:'P3 — future', text:'Contract and MSA summary sheet' },
  { id:'b30', rock:'r2', cat:'P3 — future', text:'Security and compliance one-pager' },
  { id:'b31', rock:'r2', cat:'P3 — future', text:'Implementation timeline overview' },
  { id:'b32', rock:'r2', cat:'P3 — future', text:'Partner overview deck' },
  { id:'b33', rock:'r2', cat:'P3 — future', text:'Integration and technical spec sheet' },
  { id:'b34', rock:'r2', cat:'P3 — future', text:'LinkedIn content templates' },

  // ── Rock 3: GTM Distribution & Reach ────────────────────────────────
  { id:'c01', rock:'r3', cat:'LinkedIn',  text:'Define Q2 content pillars — 3 core themes' },
  { id:'c02', rock:'r3', cat:'LinkedIn',  text:'Build weekly content calendar cadence and post schedule' },
  { id:'c03', rock:'r3', cat:'LinkedIn',  text:'Set up Planable scheduling workflow' },
  { id:'c04', rock:'r3', cat:'LinkedIn',  text:'Define ICP connection request strategy (Dave and Will)' },
  { id:'c05', rock:'r3', cat:'LinkedIn',  text:'Launch weekly impression and follower tracking' },
  { id:'c06', rock:'r3', cat:'LinkedIn',  text:'Test video vs text content — benchmark performance delta' },
  { id:'c07', rock:'r3', cat:'LinkedIn',  text:'Establish weekly post-performance review cadence' },
  { id:'c08', rock:'r3', cat:'Email',     text:'Build content-to-demo attribution tracking' },
  { id:'c09', rock:'r3', cat:'Email',     text:'Launch first email campaign to ICP list' },
  { id:'c10', rock:'r3', cat:'Email',     text:'Track inbound content-attributed demo requests' },
  { id:'c11', rock:'r3', cat:'Reporting', text:'Monthly scorecard: impressions, followers, and demos' },
  { id:'c12', rock:'r3', cat:'Reporting', text:'Mid-quarter pivot assessment by May 15' },

  // ── Rock 4: Website Framework (Bonus) ───────────────────────────────
  { id:'d01', rock:'r4', cat:'Discovery', text:'Audit current website vs ICP messaging needs' },
  { id:'d02', rock:'r4', cat:'Strategy',  text:'Define sitemap and page hierarchy' },
  { id:'d03', rock:'r4', cat:'Strategy',  text:'Write messaging hierarchy document' },
  { id:'d04', rock:'r4', cat:'Strategy',  text:'Define lead-gen conversion points and CTA strategy' },
  { id:'d05', rock:'r4', cat:'Brief',     text:'Create wireframe brief for each key page' },
  { id:'d06', rock:'r4', cat:'Brief',     text:'Define SEO strategy and keyword targets' },
  { id:'d07', rock:'r4', cat:'Handoff',   text:'Get stakeholder approval on framework' },
  { id:'d08', rock:'r4', cat:'Handoff',   text:'Brief design and dev team — ready for build handoff' },
]

export const SORDER = ['todo', 'doing', 'done', 'blocked']
export const SCFG = {
  todo:    { label: 'To do',       bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' },
  doing:   { label: 'In progress', bg: 'rgba(176,120,48,0.22)',  color: '#c8922a' },
  done:    { label: 'Done',        bg: 'rgba(90,191,130,0.22)',  color: '#5abf82' },
  blocked: { label: 'Blocked',     bg: 'rgba(209,80,67,0.22)',   color: '#e05a4a' },
}
