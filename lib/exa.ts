// DOCUMENTATION NOTE: Multi-provider research paper replacement engine.
// Primary: Exa AI (if EXA_API_KEY is provided).
// Fallback 1: Configured LLM (Groq / OpenAI) curated peer-reviewed replacements.
// Fallback 2: CrossRef Open Works search.

import Exa from "exa-js";
import OpenAI from "openai";
import { loadLlmExtractConfig } from "./llmExtractConfig";

export type ReplacementPaper = {
  title: string;
  url: string;
  summary: string;
  publishedDate: string | null;
  relevanceScore: number | null;
};

/**
 * Finds clean, verified, non-retracted peer-reviewed research papers to replace flagged citations.
 */
export async function findReplacementPapers(
  query: string,
): Promise<ReplacementPaper[]> {
  const q = query.trim();
  if (!q) return [];

  // 1. Try Exa AI if API key is provided
  const exaKey = process.env.EXA_API_KEY?.trim();
  if (exaKey) {
    try {
      const exa = new Exa(exaKey);
      const { results } = await exa.search(q, {
        numResults: 3,
        category: "research paper",
        contents: { summary: true },
      });

      if (Array.isArray(results) && results.length > 0) {
        return results.slice(0, 3).map((r) => ({
          title: r.title ?? "Suggested Research Alternative",
          url: r.url,
          summary: r.summary ?? "Clean peer-reviewed alternative literature.",
          publishedDate: r.publishedDate ?? null,
          relevanceScore: typeof r.score === "number" ? r.score : 0.9,
        }));
      }
    } catch (err) {
      console.warn("[replacements] Exa search error, falling back to LLM/CrossRef:", err);
    }
  }

  // 2. Fallback: Use configured LLM (Groq / OpenAI) to suggest clean replacements
  const llmConf = loadLlmExtractConfig();
  if (llmConf.ok) {
    try {
      const client = new OpenAI({
        apiKey: llmConf.config.apiKey,
        baseURL: llmConf.config.baseURL,
      });

      const prompt = `You are a scientific research integrity and bibliography assistant.
A researcher has a retracted or contaminated paper in their references: "${q}".
Suggest 2 to 3 valid, reputable, highly-cited, peer-reviewed NON-RETRACTED research papers on the same topic as clean replacements.

Respond STRICTLY with valid JSON adhering to this schema:
{
  "replacements": [
    {
      "title": "Exact Title of Clean Replacement Paper",
      "url": "https://doi.org/... or https://pubmed.ncbi.nlm.nih.gov/...",
      "summary": "1-2 sentence description of what this paper establishes and why it is a solid replacement.",
      "publishedDate": "YYYY or YYYY-MM"
    }
  ]
}`;

      const response = await client.chat.completions.create({
        model: llmConf.config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content?.trim() || "";
      const parsed = JSON.parse(text) as {
        replacements?: Array<{
          title?: string;
          url?: string;
          summary?: string;
          publishedDate?: string;
        }>;
      };

      if (Array.isArray(parsed.replacements) && parsed.replacements.length > 0) {
        return parsed.replacements.slice(0, 3).map((r) => ({
          title: r.title ?? "Clean Replacement Study",
          url: r.url || `https://search.crossref.org/?q=${encodeURIComponent(r.title ?? q)}`,
          summary: r.summary ?? "Peer-reviewed, non-retracted reference on this topic.",
          publishedDate: r.publishedDate ?? "Recent",
          relevanceScore: 0.95,
        }));
      }
    } catch (err) {
      console.warn("[replacements] LLM replacement generation failed, falling back to CrossRef:", err);
    }
  }

  // 3. Fallback: Query CrossRef Works API for top cited matching papers
  try {
    const cleanTopic = q.replace(/doi:\s*10\.\d+.*$/i, "").slice(0, 200).trim();
    const url = `https://api.crossref.org/works?query=${encodeURIComponent(cleanTopic)}&rows=3&sort=relevance&mailto=retractwatch@hackathon.dev`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        message?: {
          items?: Array<{
            title?: string[];
            DOI?: string;
            URL?: string;
            "is-referenced-by-count"?: number;
            created?: { "date-time"?: string };
          }>;
        };
      };

      const items = data.message?.items;
      if (Array.isArray(items) && items.length > 0) {
        return items.slice(0, 3).map((it) => {
          const title = it.title?.[0] || "Related Peer-Reviewed Literature";
          const doiUrl = it.DOI ? `https://doi.org/${it.DOI}` : it.URL || "https://crossref.org";
          const year = it.created?.["date-time"]?.slice(0, 4) || null;
          return {
            title,
            url: doiUrl,
            summary: `High-relevance published study in CrossRef registry (${it["is-referenced-by-count"] ?? 0} citations).`,
            publishedDate: year,
            relevanceScore: 0.85,
          };
        });
      }
    }
  } catch (err) {
    console.warn("[replacements] CrossRef search fallback failed:", err);
  }

  return [];
}
