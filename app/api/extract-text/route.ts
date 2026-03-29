// DOCUMENTATION NOTE:
// Extracts structured citations from pasted bibliography text via the same LLM contract as /api/extract.

import {
  BIBLIOGRAPHY_EXTRACT_SYSTEM_PROMPT,
  bibliographyExtractUserContent,
} from "@/lib/bibliographyExtractPrompt";
import { loadLlmExtractConfig } from "@/lib/llmExtractConfig";
import { validateLlmCitations } from "@/lib/validateCitations";
import { NextResponse } from "next/server";
import OpenAI, { APIError } from "openai";

export const runtime = "nodejs";
export const maxDuration = 120;

const BIB_MAX_CHARS = 8000;
const MIN_PASTE_LEN = 50;

function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "");
  s = s.replace(/\s*```\s*$/i, "");
  return s.trim();
}

function jsonErrorBody(
  error: string,
  status: number,
  detail?: string,
): NextResponse {
  const body: { error: string; detail?: string } = { error };
  if (process.env.NODE_ENV === "development" && detail) {
    body.detail = detail;
  }
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body. Send { \"text\": \"...\" }." },
        { status: 400 },
      );
    }

    const raw =
      body &&
      typeof body === "object" &&
      body !== null &&
      "text" in body &&
      typeof (body as { text: unknown }).text === "string"
        ? (body as { text: string }).text
        : "";

    const bibliographyText = raw.trim().slice(0, BIB_MAX_CHARS);

    if (bibliographyText.length < MIN_PASTE_LEN) {
      return NextResponse.json(
        {
          error:
            "Paste at least a short bibliography block (50+ characters), or upload a PDF.",
        },
        { status: 400 },
      );
    }

    const llm = loadLlmExtractConfig();
    if (!llm.ok) {
      return jsonErrorBody(llm.error, 503);
    }
    const {
      apiKey,
      baseURL,
      model,
      jsonMode,
      maxCompletionTokens,
      reasoningEffort,
    } = llm.config;

    const openai = new OpenAI({ apiKey, baseURL });
    let rawContent: string | null;
    try {
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0,
        max_completion_tokens: maxCompletionTokens,
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
        ...(reasoningEffort
          ? { reasoning_effort: reasoningEffort }
          : {}),
        messages: [
          { role: "system", content: BIBLIOGRAPHY_EXTRACT_SYSTEM_PROMPT },
          {
            role: "user",
            content: bibliographyExtractUserContent(bibliographyText),
          },
        ],
      });
      rawContent = completion.choices[0]?.message?.content ?? null;
    } catch (openaiErr) {
      console.error("[extract-text] LLM request failed", openaiErr);
      if (openaiErr instanceof APIError) {
        return jsonErrorBody(
          openaiErr.message ||
            "The LLM API returned an error. Check your key, model name, and provider dashboard.",
          openaiErr.status && openaiErr.status >= 400 && openaiErr.status < 600
            ? openaiErr.status
            : 502,
          openaiErr.message,
        );
      }
      return jsonErrorBody(
        "The citation extraction service failed. Try again in a moment.",
        502,
        openaiErr instanceof Error ? openaiErr.message : String(openaiErr),
      );
    }

    if (!rawContent) {
      return jsonErrorBody("Empty response from the model.", 502);
    }

    let parsed: { citations?: unknown };
    try {
      const jsonStr = stripMarkdownFences(rawContent);
      parsed = JSON.parse(jsonStr) as { citations?: unknown };
    } catch (parseErr) {
      console.error(
        "[extract-text] JSON parse failed",
        parseErr,
        rawContent.slice(0, 500),
      );
      return jsonErrorBody(
        "The model returned invalid JSON. Try again or shorten the pasted text.",
        502,
        parseErr instanceof Error ? parseErr.message : String(parseErr),
      );
    }

    const rawCitations = Array.isArray(parsed.citations) ? parsed.citations : [];
    const citations = validateLlmCitations(rawCitations);

    return NextResponse.json({
      citations,
      totalFound: citations.length,
    });
  } catch (e) {
    console.error("[extract-text] unexpected", e);
    return jsonErrorBody(
      "An unexpected error occurred while processing pasted text.",
      500,
      e instanceof Error ? e.message : String(e),
    );
  }
}
