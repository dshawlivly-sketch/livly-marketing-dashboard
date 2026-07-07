// Unified streaming chat proxy: POST /api/chat
// { provider, model, system, messages, temperature, maxTokens, overrides }
// Responds with SSE: {type:"delta",text} ... {type:"done",usage,model} | {type:"error",message}

import {
  readJson,
  sse,
  json,
  getKey,
  streamAnthropic,
  streamOpenAI,
  streamGemini,
  runOpenDesign,
} from "./_lib/providers.js";

export const config = { supportsResponseStreaming: true };

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return json(res, 400, { error: "Invalid JSON body" });
  }

  const { provider, model, system, messages, temperature, maxTokens, overrides } = body;
  if (!provider || !Array.isArray(messages) || messages.length === 0) {
    return json(res, 400, { error: "provider and messages are required" });
  }

  const { send, close } = sse(res);
  const emit = (evt) => send(evt);

  try {
    const apiKey = getKey(provider, overrides);
    if (!apiKey && provider !== "opendesign") {
      throw new Error(
        `No API key for ${provider}. Set ${provider.toUpperCase()}_API_KEY or add one in Connections.`
      );
    }
    const args = { model, system, messages, temperature, maxTokens, apiKey, overrides };
    if (provider === "anthropic") await streamAnthropic(args, emit);
    else if (provider === "openai") await streamOpenAI(args, emit);
    else if (provider === "gemini") await streamGemini(args, emit);
    else if (provider === "opendesign") await runOpenDesign(args, emit);
    else throw new Error(`Unknown provider: ${provider}`);
  } catch (err) {
    emit({ type: "error", message: err.message || String(err) });
  }
  close();
}
