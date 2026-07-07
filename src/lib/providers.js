export const PROVIDERS = {
  anthropic: {
    key: "anthropic",
    name: "Claude",
    vendor: "Anthropic",
    color: "#E8865A",
    defaultModel: "claude-opus-4-8",
    keyHint: "sk-ant-…  (console.anthropic.com)",
    supportsTemperature: false,
    docs: "https://platform.claude.com",
  },
  openai: {
    key: "openai",
    name: "OpenAI",
    vendor: "OpenAI",
    color: "#4AC48F",
    defaultModel: "gpt-5",
    keyHint: "sk-…  (platform.openai.com)",
    supportsTemperature: true,
    docs: "https://platform.openai.com/docs",
  },
  gemini: {
    key: "gemini",
    name: "Gemini",
    vendor: "Google",
    color: "#6FA1FF",
    defaultModel: "gemini-2.5-pro",
    keyHint: "AIza…  (aistudio.google.com)",
    supportsTemperature: true,
    docs: "https://ai.google.dev",
  },
  opendesign: {
    key: "opendesign",
    name: "OpenDesign",
    vendor: "nexu-io/open-design",
    color: "#C08BF5",
    defaultModel: "open-design",
    keyHint: "optional bearer token",
    supportsTemperature: false,
    docs: "https://github.com/nexu-io/open-design",
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

export const FALLBACK_MODELS = {
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
