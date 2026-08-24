// DOCUMENTATION NOTE:
// Extracts structured citations from an uploaded PDF via unpdf and OpenAI-compatible Chat API.

import { loadLlmExtractConfig } from "@/lib/llmExtractConfig";
import { validateLlmCitations } from "@/lib/validateCitations";
import { NextResponse } from "next/server";
import OpenAI, { APIError } from "openai";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 15 * 1024 * 1024;
const MIN_TEXT_LEN = 50;
const BIB_FALLBACK_CHARS = 12000;
const BIB_MAX_CHARS = 16000;

const BIB_REGEX =
  /(?:references|bibliography|works cited|literature cited)\s*\n([\s\S]+?)(?:\n\s*(?:appendix|supplementary)|$)/i;

const SYSTEM_PROMPT =
  "You are a scientific bibliography parser. Extract all references from the provided bibliography text. Return ONLY a valid JSON object matching {\"citations\": [{\"title\": string, \"authors\": string, \"year\": number | null, \"doi\": string | null}]}. If DOI is not present, set to null. Return ONLY the raw JSON object.";

function stripMarkdownFencesAndThinking(raw: string): string {
  let s = raw.trim();
  // Strip <think>...</think> reasoning blocks if present
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip markdown code fences
  s = s.replace(/^```(?:json)?\s*/i, "");
  s = s.replace(/\s*```\s*$/i, "");
  // Try to find the JSON object boundaries { ... }
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
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

// Quick heuristic fallback if LLM times out or is unreachable
function extractCitationsViaRegex(text: string): Array<{
  title: string;
  authors: string;
  year: number | null;
  doi: string | null;
}> {
  const citations: Array<{
    title: string;
    authors: string;
    year: number | null;
    doi: string | null;
  }> = [];

  // Merge lines that don't start with a number or bracketed number
  // Require a space after the dot to prevent splitting at DOIs like "10.1126..."
  const mergedText = text.replace(/\n(?!\s*(?:\[\d+\]|\d+\.\s+))/g, " ");

  const lines = mergedText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 20);

  const doiRegex = /(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/;
  const yearRegex = /\b(19\d{2}|20\d{2})\b/;

  for (const line of lines) {
    const doiMatch = line.match(doiRegex);
    const yearMatch = line.match(yearRegex);
    
    // Clean citation line
    const cleanLine = line.replace(/^\[\d+\]\s*/, "").replace(/^\d+\.\s*/, "");
    if (cleanLine.length < 15) continue;

    citations.push({
      title: cleanLine,
      authors: "Unknown",
      year: yearMatch ? parseInt(yearMatch[1], 10) : null,
      doi: doiMatch ? doiMatch[1].replace(/[.,;)]+$/, "") : null,
    });
  }

  return citations.slice(0, 100);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("pdf");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No PDF file received" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "PDF too large. Please upload under 15MB." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const extracted = await extractText(pdf, { mergePages: true });
      text = extracted.text.trim();
    } catch (pdfErr) {
      console.error("[extract] unpdf extraction failed", pdfErr);
      return jsonErrorBody(
        "Could not read this PDF. Try another file or a text-based (not scanned image) PDF.",
        400,
        pdfErr instanceof Error ? pdfErr.message : String(pdfErr),
      );
    }

    if (text.length < MIN_TEXT_LEN) {
      return NextResponse.json(
        {
          error:
            "This PDF appears to be empty or a scanned image without selectable text.",
        },
        { status: 400 },
      );
    }

    const match = text.match(BIB_REGEX);
    let bibliographyText = match?.[1]?.trim() ?? "";
    if (!bibliographyText) {
      // If no explicit 'References' header, grab the latter half of the manuscript
      bibliographyText = text.slice(-BIB_FALLBACK_CHARS);
    }
    bibliographyText = bibliographyText.slice(0, BIB_MAX_CHARS);

    const llm = loadLlmExtractConfig();
    if (!llm.ok) {
      // If LLM config is missing, fall back to regex extraction so users are never hard-blocked
      const fallbackCitations = extractCitationsViaRegex(bibliographyText);
      if (fallbackCitations.length > 0) {
        return NextResponse.json({
          citations: fallbackCitations,
          totalFound: fallbackCitations.length,
          note: "Extracted via pattern matching (LLM key not configured).",
        });
      }
      return jsonErrorBody(llm.error, 503);
    }

    const {
      apiKey,
      baseURL,
      model,
      maxCompletionTokens,
    } = llm.config;

    const openai = new OpenAI({ apiKey, baseURL });
    let rawContent: string | null = null;
    try {
      const completion = await openai.chat.completions.create({
        model,
        temperature: 0,
        max_tokens: maxCompletionTokens,
        ...(llm.config.jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extract all references from this bibliography:\n\n${bibliographyText}`,
          },
        ],
      });
      rawContent = completion.choices[0]?.message?.content ?? null;
    } catch (openaiErr) {
      console.error("[extract] LLM request failed", openaiErr);
      
      // Fall back to regex parser on LLM error
      const fallbackCitations = extractCitationsViaRegex(bibliographyText);
      if (fallbackCitations.length > 0) {
        return NextResponse.json({
          citations: fallbackCitations,
          totalFound: fallbackCitations.length,
          note: "Extracted via pattern matching fallback.",
        });
      }

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
      const fallbackCitations = extractCitationsViaRegex(bibliographyText);
      return NextResponse.json({
        citations: fallbackCitations,
        totalFound: fallbackCitations.length,
      });
    }

    let parsed: { citations?: unknown } = {};
    try {
      const jsonStr = stripMarkdownFencesAndThinking(rawContent);
      parsed = JSON.parse(jsonStr) as { citations?: unknown };
    } catch (parseErr) {
      console.warn("[extract] JSON parse warning, attempting fallback", parseErr);
      const fallbackCitations = extractCitationsViaRegex(bibliographyText);
      return NextResponse.json({
        citations: fallbackCitations,
        totalFound: fallbackCitations.length,
      });
    }

    const rawCitations = Array.isArray(parsed.citations) ? parsed.citations : [];
    const citations = validateLlmCitations(rawCitations);

    return NextResponse.json({
      citations: citations.length > 0 ? citations : extractCitationsViaRegex(bibliographyText),
      totalFound: citations.length,
    });
  } catch (e) {
    console.error("[extract] unexpected", e);
    return jsonErrorBody(
      "An unexpected error occurred while processing the PDF.",
      500,
      e instanceof Error ? e.message : String(e),
    );
  }
}
