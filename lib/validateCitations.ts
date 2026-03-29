/**
 * Normalize LLM citation rows for /api/extract-text responses.
 */

export type ValidatedLlmCitation = {
  title: string;
  authors: string;
  year: number | null;
  doi: string | null;
};

function coerceYear(y: unknown): number | null {
  if (y == null) return null;
  if (typeof y === "number" && !Number.isNaN(y)) return y;
  const n = Number(y);
  return Number.isNaN(n) ? null : n;
}

export function validateLlmCitations(raw: unknown[]): ValidatedLlmCitation[] {
  return raw.map((item, i) => {
    const o = item as Record<string, unknown>;
    const title =
      typeof o.title === "string" && o.title.trim()
        ? o.title.trim()
        : `Untitled reference ${i + 1}`;
    const authors =
      typeof o.authors === "string" && o.authors.trim()
        ? o.authors.trim()
        : "Unknown";
    const doi =
      typeof o.doi === "string" && o.doi.trim() ? o.doi.trim() : null;
    return {
      title,
      authors,
      year: coerceYear(o.year),
      doi,
    };
  });
}
