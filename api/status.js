// GET /api/status — which providers are configured server-side (booleans only,
// never key material).

import { json, ENV_KEYS } from "./_lib/providers.js";

export default async function handler(req, res) {
  json(res, 200, {
    anthropic: { configured: Boolean(process.env[ENV_KEYS.anthropic]) },
    openai: { configured: Boolean(process.env[ENV_KEYS.openai]) },
    gemini: { configured: Boolean(process.env[ENV_KEYS.gemini]) },
    opendesign: {
      configured: Boolean(process.env.OPENDESIGN_BASE_URL),
      baseUrlSet: Boolean(process.env.OPENDESIGN_BASE_URL),
      keySet: Boolean(process.env[ENV_KEYS.opendesign]),
    },
  });
}
