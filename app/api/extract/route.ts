// DOCUMENTATION NOTE:
// Extracts structured citations from an uploaded PDF via an OpenAI-compatible Chat API.

import { loadLlmExtractConfig } from "@/lib/llmExtractConfig";
import { NextResponse } from "next/server";
import OpenAI, { APIError } from "openai";
import * as pdfParseModule from "pdf-parse";

export const runtime = "nodejs";
/** Vercel / long PDF extract — raise on Pro if scans time out (Hobby max is lower). */
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;
const MIN_TEXT_LEN = 100;
const BIB_FALLBACK_CHARS = 6000;
const BIB_MAX_CHARS = 8000;

const BIB_REGEX =
  /(?:references|bibliography|works cited|literature cited)\s*\n([\s\S]+?)(?:\n\s*appendix|\n\s*supplementary|\Z)/i;

const SYSTEM_PROMPT =
  "You are a scientific bibliography parser. Extract all references from the provided bibliography text. Return ONLY a valid JSON object with a 'citations' array. Each citation must have: { title: string, authors: string, year: number | null, doi: string | null }. If DOI not present, set to null. Return nothing except the JSON object.";

type LegacyPdfParseFn = (buffer: Buffer) => Promise<{ text?: string }>;
type ModernPdfParser = {
  getText: () => Promise<{ text?: string }>;
  destroy: () => Promise<void>;
};
type ModernPdfParseCtor = new (opts: { data: Buffer }) => ModernPdfParser;

async function extractPdfText(buffer: Buffer): Promise<string> {
  const mod = pdfParseModule as unknown as {
    default?: LegacyPdfParseFn;
    PDFParse?: ModernPdfParseCtor;
  };

  if (typeof mod.default === "function") {
    const pdfData = await mod.default(buffer);
    return (pdfData.text ?? "").trim();
  }

  if (typeof mod.PDFParse === "function") {
    const parser = new mod.PDFParse({ data: buffer });
    try {
      const pdfData = await parser.getText();
      return (pdfData.text ?? "").trim();
    } finally {
      await parser.destroy();
    }
  }

  throw new Error("Unsupported pdf-parse module format");
}

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
        { error: "PDF too large. Please upload under 10MB." },
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

    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;
    try {
      text = await extractPdfText(buffer);
    } catch (pdfErr) {
      console.error("[extract] pdf-parse failed", pdfErr);
      return jsonErrorBody(
        "Could not read this PDF. Try another file or a text-based (not scanned) PDF.",
        400,
        pdfErr instanceof Error ? pdfErr.message : String(pdfErr),
      );
    }

    if (text.length < MIN_TEXT_LEN) {
      return NextResponse.json(
        {
          error:
            "This PDF appears to be a scanned image. Please use a text-based PDF.",
        },
        { status: 400 },
      );
    }

    const match = text.match(BIB_REGEX);
    let bibliographyText = match?.[1]?.trim() ?? "";
    if (!bibliographyText) {
      bibliographyText = text.slice(-BIB_FALLBACK_CHARS);
    }
    bibliographyText = bibliographyText.slice(0, BIB_MAX_CHARS);

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
      console.error("[extract] JSON parse failed", parseErr, rawContent.slice(0, 500));
      return jsonErrorBody(
        "The model returned invalid JSON. Try again or use a smaller PDF.",
        502,
        parseErr instanceof Error ? parseErr.message : String(parseErr),
      );
    }

    const citations = Array.isArray(parsed.citations) ? parsed.citations : [];

    return NextResponse.json({
      citations,
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
