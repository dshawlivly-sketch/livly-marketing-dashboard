// POST /api/models — list models for a provider. Doubles as the connection
// test: a successful live fetch proves the key works.
// { provider, overrides } -> { ok, source: "live"|"fallback", models: [{id,label}], error? }

import { readJson, json, getKey } from "./_lib/providers.js";

const FALLBACKS = {
  anthropic: [
    { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { id: "claude-fable-5", label: "Claude Fable 5" },
  ],
  openai: [
    { id: "gpt-5", label: "GPT-5" },
    { id: "gpt-5-mini", label: "GPT-5 mini" },
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o mini" },
  ],
  gemini: [
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  opendesign: [{ id: "open-design", label: "OpenDesign" }],
};

export default async function handler(req, res) {
  let body = {};
  try {
    body = req.method === "POST" ? await readJson(req) : {};
  } catch {
    return json(res, 400, { error: "Invalid JSON body" });
  }
  const provider = body.provider || new URL(req.url, "http://x").searchParams.get("provider");
  const overrides = body.overrides;
  if (!provider || !FALLBACKS[provider]) {
    return json(res, 400, { error: "Unknown provider" });
  }

  try {
    const models = await fetchLive(provider, overrides);
    return json(res, 200, { ok: true, source: "live", models });
  } catch (err) {
    return json(res, 200, {
      ok: false,
      source: "fallback",
      models: FALLBACKS[provider],
      error: err.message,
    });
  }
}

async function fetchLive(provider, overrides) {
  const apiKey = getKey(provider, overrides);

  if (provider === "anthropic") {
    if (!apiKey) throw new Error("No Anthropic API key configured");
    const resp = await fetch("https://api.anthropic.com/v1/models?limit=50", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    });
    if (!resp.ok) throw new Error(`Anthropic ${resp.status}`);
    const data = await resp.json();
    return data.data.map((m) => ({ id: m.id, label: m.display_name || m.id }));
  }

  if (provider === "openai") {
    if (!apiKey) throw new Error("No OpenAI API key configured");
    const resp = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    return data.data
      .filter((m) => /^(gpt-|o\d|chatgpt)/.test(m.id) && !/audio|realtime|image|tts|transcribe|embed/.test(m.id))
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .slice(0, 30)
      .map((m) => ({ id: m.id, label: m.id }));
  }

  if (provider === "gemini") {
    if (!apiKey) throw new Error("No Gemini API key configured");
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=50",
      { headers: { "x-goog-api-key": apiKey } }
    );
    if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
    const data = await resp.json();
    return (data.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => ({ id: m.name.replace(/^models\//, ""), label: m.displayName || m.name }));
  }

  if (provider === "opendesign") {
    const baseUrl = (overrides && overrides.baseUrl) || process.env.OPENDESIGN_BASE_URL;
    if (!baseUrl) throw new Error("No OpenDesign base URL configured");
    const resp = await fetch(baseUrl, { method: "GET" });
    if (!resp.ok && resp.status >= 500) throw new Error(`OpenDesign instance returned ${resp.status}`);
    return FALLBACKS.opendesign;
  }

  throw new Error("Unknown provider");
}
