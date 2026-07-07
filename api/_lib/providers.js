// Shared provider adapters used by the api/ routes.
// Works both on Vercel (Node serverless functions) and under the Vite dev
// middleware, so it only relies on vanilla req/res.

import Anthropic from "@anthropic-ai/sdk";

export const ENV_KEYS = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  opendesign: "OPENDESIGN_API_KEY",
};

export function getKey(provider, overrides) {
  return (overrides && overrides.apiKey) || process.env[ENV_KEYS[provider]] || "";
}

export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function sse(res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  return {
    send(obj) {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    },
    close() {
      res.end();
    },
  };
}

export function json(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Anthropic (Claude) — official SDK, streaming
// ---------------------------------------------------------------------------

// Models where adaptive thinking is supported (4.6+ family and Fable/Mythos).
const ADAPTIVE_THINKING = /^claude-(opus-4-[678]|sonnet-5|sonnet-4-6|fable-5|mythos)/;

export async function streamAnthropic({ model, system, messages, maxTokens, apiKey }, emit) {
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens || 16000,
    ...(system ? { system } : {}),
    ...(ADAPTIVE_THINKING.test(model) ? { thinking: { type: "adaptive" } } : {}),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      emit({ type: "delta", text: event.delta.text });
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    emit({ type: "error", message: "Claude declined this request (safety refusal)." });
    return;
  }
  emit({
    type: "done",
    model: final.model,
    stopReason: final.stop_reason,
    usage: {
      input: final.usage.input_tokens,
      output: final.usage.output_tokens,
    },
  });
}

// ---------------------------------------------------------------------------
// OpenAI — chat completions, streaming SSE
// ---------------------------------------------------------------------------

export async function streamOpenAI(
  { model, system, messages, temperature, maxTokens, apiKey },
  emit
) {
  const body = {
    model,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      ...(system ? [{ role: "system", content: system }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };
  // Reasoning models (o-series, gpt-5 family) reject custom temperature.
  if (temperature != null && !/^(o\d|gpt-5)/.test(model)) body.temperature = temperature;
  if (maxTokens) body.max_completion_tokens = maxTokens;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${extractErr(errText)}`);
  }

  let usage = null;
  let servedModel = model;
  for await (const data of sseLines(resp)) {
    if (data === "[DONE]") break;
    const chunk = JSON.parse(data);
    servedModel = chunk.model || servedModel;
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) emit({ type: "delta", text: delta });
    if (chunk.usage) {
      usage = { input: chunk.usage.prompt_tokens, output: chunk.usage.completion_tokens };
    }
  }
  emit({ type: "done", model: servedModel, usage });
}

// ---------------------------------------------------------------------------
// Google Gemini — streamGenerateContent with alt=sse
// ---------------------------------------------------------------------------

export async function streamGemini(
  { model, system, messages, temperature, maxTokens, apiKey },
  emit
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
  const body = {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      ...(temperature != null ? { temperature } : {}),
      ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
    },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${extractErr(errText)}`);
  }

  let usage = null;
  for await (const data of sseLines(resp)) {
    let chunk;
    try {
      chunk = JSON.parse(data);
    } catch {
      continue;
    }
    const parts = chunk.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) emit({ type: "delta", text: part.text });
    }
    if (chunk.usageMetadata) {
      usage = {
        input: chunk.usageMetadata.promptTokenCount,
        output: chunk.usageMetadata.candidatesTokenCount,
      };
    }
  }
  emit({ type: "done", model, usage });
}

// ---------------------------------------------------------------------------
// OpenDesign (nexu-io/open-design) — generic REST adapter.
// Point OPENDESIGN_BASE_URL at your deployed instance; the harness POSTs the
// prompt to its generate endpoint and renders whatever comes back.
// ---------------------------------------------------------------------------

export async function runOpenDesign({ messages, system, overrides }, emit) {
  const baseUrl = (overrides && overrides.baseUrl) || process.env.OPENDESIGN_BASE_URL;
  const apiKey = getKey("opendesign", overrides);
  const genPath =
    (overrides && overrides.generatePath) ||
    process.env.OPENDESIGN_GENERATE_PATH ||
    "/api/generate";
  if (!baseUrl) {
    throw new Error(
      "OpenDesign is not configured. Deploy nexu-io/open-design and set OPENDESIGN_BASE_URL (or add a base URL in Connections)."
    );
  }
  const prompt = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");

  const resp = await fetch(new URL(genPath, baseUrl).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ prompt, ...(system ? { context: system } : {}) }),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`OpenDesign ${resp.status}: ${extractErr(text)}`);

  let pretty = text;
  let assets;
  try {
    const parsed = JSON.parse(text);
    assets = collectUrls(parsed);
    pretty = JSON.stringify(parsed, null, 2);
  } catch {
    // plain text response — render as-is
  }
  emit({ type: "delta", text: pretty });
  emit({ type: "done", model: "open-design", ...(assets?.length ? { assets } : {}) });
}

function collectUrls(obj, out = []) {
  if (typeof obj === "string") {
    if (/^https?:\/\/\S+\.(png|jpe?g|svg|webp|gif)(\?|$)/i.test(obj)) out.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach((v) => collectUrls(v, out));
  } else if (obj && typeof obj === "object") {
    Object.values(obj).forEach((v) => collectUrls(v, out));
  }
  return out;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// Async-iterate the `data:` payloads of an SSE fetch Response.
async function* sseLines(resp) {
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split(/\r?\n\r?\n/);
    buf = events.pop();
    for (const evt of events) {
      for (const line of evt.split(/\r?\n/)) {
        if (line.startsWith("data:")) yield line.slice(5).trim();
      }
    }
  }
}

function extractErr(text) {
  try {
    const parsed = JSON.parse(text);
    return (
      parsed.error?.message ||
      parsed.message ||
      (Array.isArray(parsed) && parsed[0]?.error?.message) ||
      text.slice(0, 300)
    );
  } catch {
    return text.slice(0, 300);
  }
}
