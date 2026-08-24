/**
 * PDF/paste extract — OpenAI-compatible Chat Completions API.
 */

export type LlmExtractConfig = {
  apiKey: string;
  baseURL?: string;
  model: string;
  jsonMode: boolean;
  maxCompletionTokens: number;
  reasoningEffort?: "low" | "medium" | "high";
};

export function loadLlmExtractConfig():
  | { ok: true; config: LlmExtractConfig }
  | { ok: false; error: string } {
  let apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.LLM_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";
    
  // Sanitize accidental paste prefixes (e.g. 'ygsk_' -> 'gsk_')
  if (apiKey.startsWith("ygsk_")) {
    apiKey = apiKey.slice(1);
  }

  if (!apiKey) {
    return {
      ok: false,
      error:
        "No LLM API key. Set GEMINI_API_KEY, LLM_API_KEY or OPENAI_API_KEY in Vercel env (or .env.local). For Groq / NVIDIA / xAI, also set LLM_BASE_URL and LLM_MODEL.",
    };
  }

  let baseURL =
    process.env.LLM_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    undefined;

  let model =
    process.env.LLM_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "";

  // Force Gemini configuration if the Gemini key is present
  if (process.env.GEMINI_API_KEY?.trim()) {
    baseURL = "https://generativelanguage.googleapis.com/v1beta/openai/";
    model = "gemini-2.5-flash";
  }

  // Smart defaults and compatibility fallbacks
  if (baseURL?.includes("groq.com")) {
    if (!model || model === "llama-3.3-70b-versatile" || model === "gpt-4o" || model === "openai/gpt-oss-120b") {
      model = "llama-3.1-8b-instant";
    }
  } else if (!model) {
    model = "gpt-4o";
  }

  const jsonMode = process.env.LLM_JSON_MODE?.trim() !== "false";

  const maxRaw = process.env.LLM_MAX_COMPLETION_TOKENS?.trim();
  const maxCompletionTokens = maxRaw
    ? Math.min(32768, Math.max(256, Number(maxRaw) || 8000))
    : 8000;

  const re = process.env.LLM_REASONING_EFFORT?.trim().toLowerCase();
  const reasoningEffort =
    re === "low" || re === "medium" || re === "high" ? re : undefined;

  return {
    ok: true,
    config: {
      apiKey,
      baseURL,
      model,
      jsonMode,
      maxCompletionTokens,
      reasoningEffort,
    },
  };
}
