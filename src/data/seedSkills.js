// Starter skills — reusable prompt templates with {{variables}}.
// Fully editable in the Skills tab; stored in localStorage after first load.

export const SEED_SKILLS = [
  {
    id: "skill-linkedin-post",
    name: "LinkedIn Post Draft",
    description: "Draft an on-brand LinkedIn post from a rough idea.",
    tags: ["marketing", "social"],
    provider: "anthropic",
    template:
      "You are a B2B social media strategist. Draft a LinkedIn post about: {{topic}}.\n\nAudience: {{audience}}\nTone: confident, warm, no hashtag spam (max 3), no emoji walls.\nInclude a strong hook in the first line and a clear CTA at the end.\nGive 2 variants: one punchy (<80 words), one narrative (~150 words).",
  },
  {
    id: "skill-weekly-recap",
    name: "Weekly Recap Writer",
    description: "Turn bullet notes into a polished weekly recap.",
    tags: ["marketing", "reporting"],
    provider: "anthropic",
    template:
      "Turn these raw notes into a crisp weekly marketing recap for leadership.\n\nNotes:\n{{notes}}\n\nFormat: 3 sections — Wins, In Flight, Blockers/Asks. Lead each section with the single most important item. Keep it under 250 words, plain language, no fluff.",
  },
  {
    id: "skill-subject-lines",
    name: "Email Subject Lines",
    description: "Generate and rank subject line options for a campaign.",
    tags: ["marketing", "email"],
    provider: "openai",
    template:
      "Generate 10 email subject lines for this campaign:\n\n{{campaign_description}}\n\nMix styles: curiosity, benefit-led, urgency (only if honest), question. Max 55 characters each. Then rank the top 3 with one-line reasoning, and suggest a preview-text pairing for the winner.",
  },
  {
    id: "skill-campaign-brief",
    name: "Campaign Brief Builder",
    description: "Expand a one-liner into a structured campaign brief.",
    tags: ["marketing", "planning"],
    provider: "anthropic",
    template:
      "Expand this into a one-page campaign brief:\n\nIdea: {{idea}}\nGoal metric: {{goal}}\n\nSections: Objective, Audience & Insight, Key Message, Channels & Assets, Timeline (assume 4 weeks), Success Criteria. Be specific and opinionated — make the calls, don't list options.",
  },
  {
    id: "skill-design-concept",
    name: "Design Concept (OpenDesign)",
    description: "Send a creative brief to your OpenDesign instance.",
    tags: ["design"],
    provider: "opendesign",
    template:
      "Design request: {{brief}}\n\nFormat: {{format}}\nBrand constraints: {{constraints}}",
  },
  {
    id: "skill-prompt-improver",
    name: "Prompt Improver",
    description: "Rewrite a rough prompt into a high-quality one.",
    tags: ["meta"],
    provider: "gemini",
    template:
      "Rewrite this rough prompt into a high-quality prompt for an LLM. Keep the user's intent, add missing context requirements, specify format and constraints, and remove ambiguity.\n\nRough prompt:\n{{prompt}}\n\nReturn only the improved prompt, ready to paste.",
  },
  {
    id: "skill-cross-check",
    name: "Cross-Model Sanity Check",
    description: "A question worth asking every model — run with Compare mode.",
    tags: ["meta", "research"],
    provider: "anthropic",
    template:
      "{{question}}\n\nAnswer directly and concisely. If you are uncertain, say what you'd need to verify and how.",
  },
];
