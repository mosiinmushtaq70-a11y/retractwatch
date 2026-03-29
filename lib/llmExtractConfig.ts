/**
 * PDF/paste extract — OpenAI-compatible Chat Completions API.
 * Keep in sync with `Talos/lib/llmExtractConfig.ts` (monorepo sibling).
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
  const apiKey =
    process.env.LLM_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    "";
  if (!apiKey) {
    return {
      ok: false,
      error:
        "No LLM API key. Set LLM_API_KEY or OPENAI_API_KEY in Vercel env (or .env.local). For Groq / NVIDIA / xAI, also set LLM_BASE_URL and LLM_MODEL.",
    };
  }

  const baseRaw =
    process.env.LLM_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    "";
  const baseURL = baseRaw || undefined;

  const model =
    process.env.LLM_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o";

  const jsonMode = process.env.LLM_JSON_MODE?.trim() !== "false";

  const maxRaw = process.env.LLM_MAX_COMPLETION_TOKENS?.trim();
  const maxCompletionTokens = maxRaw
    ? Math.min(32768, Math.max(256, Number(maxRaw) || 8192))
    : 8192;

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
