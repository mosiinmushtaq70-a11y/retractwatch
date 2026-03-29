/**
 * UI-facing citation shape — accepts Convex docs (`_id`) or plain objects with `id`.
 * Does not rename backend field names on the wire; only normalizes missing values.
 */

export type CitationRow = {
  id: string;
  title: string;
  authors: string;
  year: number | null | undefined;
  doi: string | null | undefined;
  status: string;
  retractionReason?: string | null;
  retractionDate?: string | null;
  retractionCountry?: string | null;
  retractionJournal?: string | null;
  cascadeDepth?: number | null;
  cascadeVia?: string | null;
};

export function normalizeCitation(doc: unknown): CitationRow | null {
  if (doc == null || typeof doc !== "object") return null;
  const d = doc as Record<string, unknown>;
  const rawId = d._id ?? d.id;
  const id = rawId != null ? String(rawId) : "";
  if (!id) return null;

  const yearVal = d.year;
  let year: number | null | undefined;
  if (yearVal == null) year = null;
  else if (typeof yearVal === "number" && !Number.isNaN(yearVal)) year = yearVal;
  else {
    const n = Number(yearVal);
    year = Number.isNaN(n) ? null : n;
  }

  return {
    id,
    title: d.title != null ? String(d.title) : "",
    authors: d.authors != null ? String(d.authors) : "",
    year,
    doi: d.doi != null ? String(d.doi) : null,
    status: typeof d.status === "string" ? d.status : "pending",
    retractionReason:
      d.retractionReason != null ? String(d.retractionReason) : undefined,
    retractionDate:
      d.retractionDate != null ? String(d.retractionDate) : undefined,
    retractionCountry:
      d.retractionCountry != null ? String(d.retractionCountry) : undefined,
    retractionJournal:
      d.retractionJournal != null ? String(d.retractionJournal) : undefined,
    cascadeDepth:
      typeof d.cascadeDepth === "number" ? d.cascadeDepth : undefined,
    cascadeVia: d.cascadeVia != null ? String(d.cascadeVia) : undefined,
  };
}

export function normalizeCitations(docs: unknown[] | undefined | null): CitationRow[] {
  if (!docs?.length) return [];
  return docs
    .map((x) => normalizeCitation(x))
    .filter((x): x is CitationRow => x != null);
}
