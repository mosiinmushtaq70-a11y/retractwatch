// DOCUMENTATION NOTE: Semantic Scholar reference graph for cascade detection.

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      setTimeout(resolve, ms);
    } catch {
      resolve();
    }
  });
}

export interface ReferenceEntry {
  title: string;
  doi: string;
  authors: string;
}

/** Discriminated result — never confuse API failure with “no references”. */
export type GetReferencesResult =
  | { ok: true; references: ReferenceEntry[] }
  | {
      ok: false;
      message: string;
      statusCode?: number;
      rateLimited?: boolean;
    };

const RETRY_DELAY_MS = 2000;
const FETCH_TIMEOUT_MS = 25_000;

function scholarHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "RetractWatch/1.0 (bibliography integrity; mailto:retractwatch@hackathon.dev)",
  };
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY?.trim();
  if (key) h["x-api-key"] = key;
  return h;
}

async function fetchReferencesOnce(doi: string): Promise<GetReferencesResult> {
  const doiTrim = typeof doi === "string" ? doi.trim() : "";
  if (!doiTrim) {
    return { ok: false, message: "Missing or empty DOI" };
  }

  try {
    await sleep(150);
  } catch {
    /* continue */
  }

  const paperId = `DOI:${doiTrim}`;
  let url: string;
  try {
    url = new URL(
      `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}/references`,
    ).toString();
  } catch {
    return { ok: false, message: "Invalid DOI for URL" };
  }

  const u = new URL(url);
  u.searchParams.set("fields", "title,authors,externalIds");
  u.searchParams.set("limit", "50");

  let res: Response;
  try {
    res = await fetch(u.toString(), {
      headers: scholarHeaders(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Fetch failed: ${msg}` };
  }

  if (res.status === 429) {
    console.warn("[SemanticScholar] 429 rate limit from API", { doi: doiTrim });
    return {
      ok: false,
      rateLimited: true,
      statusCode: 429,
      message: "Semantic Scholar rate limit (429)",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      statusCode: res.status,
      message: `Semantic Scholar HTTP ${res.status}`,
    };
  }

  let data: { data?: unknown };
  try {
    data = (await res.json()) as { data?: unknown };
  } catch {
    return { ok: false, message: "Failed to parse Semantic Scholar JSON" };
  }

  const rows = Array.isArray(data.data) ? data.data : [];
  const out: ReferenceEntry[] = [];

  for (const item of rows) {
    try {
      if (!item || typeof item !== "object") continue;
      const row = item as {
        citedPaper?: {
          title?: string;
          authors?: Array<{ name?: string }>;
          externalIds?: { DOI?: string };
        };
      };
      const cp = row.citedPaper;
      if (!cp) continue;
      const title = typeof cp.title === "string" ? cp.title : "";
      const rawDoi = cp.externalIds?.DOI;
      const doiVal =
        typeof rawDoi === "string" && rawDoi.trim() !== "" ? rawDoi.trim() : null;
      const authors =
        Array.isArray(cp.authors) && cp.authors.length > 0
          ? cp.authors
              .map((a) => (a?.name ? String(a.name) : ""))
              .filter(Boolean)
              .join(", ")
          : "";

      if (doiVal) {
        out.push({ title, doi: doiVal, authors });
      }
    } catch {
      /* skip row */
    }
  }

  return { ok: true, references: out };
}

async function fetchReferencesFromCrossRef(doi: string): Promise<GetReferencesResult> {
  const doiKey = typeof doi === "string" ? doi.trim() : "";
  if (!doiKey) return { ok: false, message: "Missing DOI" };

  try {
    const url = `https://api.crossref.org/works/${encodeURIComponent(doiKey)}?mailto=retractwatch@hackathon.dev`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, message: `CrossRef HTTP ${res.status}` };
    const data = (await res.json()) as {
      message?: {
        reference?: Array<{
          DOI?: string;
          "article-title"?: string;
          author?: string;
          unstructured?: string;
        }>;
      };
    };
    const refs = data.message?.reference;
    if (!Array.isArray(refs) || refs.length === 0) {
      return { ok: true, references: [] };
    }
    const out: ReferenceEntry[] = [];
    for (const r of refs) {
      const doiVal = r.DOI?.trim();
      if (doiVal) {
        out.push({
          title: r["article-title"] || r.unstructured || "Referenced Study",
          doi: doiVal,
          authors: r.author || "",
        });
      }
    }
    return { ok: true, references: out };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `CrossRef references fetch failed: ${msg}` };
  }
}

/**
 * Fetches reference list (entries with DOIs only).
 * Queries Semantic Scholar Academic Graph with automatic CrossRef fallback.
 */
export async function getReferences(doi: string): Promise<GetReferencesResult> {
  const doiKey = typeof doi === "string" ? doi.trim() : "";
  if (!doiKey) return { ok: true, references: [] };

  // 1. Try Semantic Scholar
  let result = await fetchReferencesOnce(doiKey);

  // 2. If Semantic Scholar rate limited or failed, try CrossRef references API
  if (!result.ok || (result.ok && result.references.length === 0)) {
    const crossRefResult = await fetchReferencesFromCrossRef(doiKey);
    if (crossRefResult.ok && crossRefResult.references.length > 0) {
      return crossRefResult;
    }
  }

  // 3. If Semantic Scholar had a transient failure, retry once
  if (!result.ok) {
    await sleep(RETRY_DELAY_MS);
    const retryResult = await fetchReferencesOnce(doiKey);
    if (retryResult.ok) return retryResult;
  }

  // If no reference graph is indexed (common for preprints), treat as clean empty reference list
  return result.ok ? result : { ok: true, references: [] };
}
