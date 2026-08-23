// DOCUMENTATION NOTE: CrossRef resolves titles to DOIs for downstream integrity checks.

const MAILTO = "retractwatch@hackathon.dev";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ResolveDoiFromTitleResult = string | null;

export async function resolveDoiFromTitle(
  title: string,
  authors?: string,
): Promise<ResolveDoiFromTitleResult> {
  try {
    if (typeof title !== "string" || !title.trim()) return null;

    const cleanQuery = title
      .replace(/^\[\d+\]\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .trim();

    if (cleanQuery.length < 5) return null;

    // Jitter to prevent burst rate-limiting when concurrency is used
    await sleep(Math.floor(Math.random() * 200) + 100);

    const q = encodeURIComponent(cleanQuery);
    // Use query.bibliographic for academic references with author/journal/year
    let url = `https://api.crossref.org/works?query.bibliographic=${q}&rows=3&mailto=${encodeURIComponent(MAILTO)}`;
    if (typeof authors === "string" && authors.trim() && authors.toLowerCase() !== "unknown") {
      url += `&query.author=${encodeURIComponent(authors.trim())}`;
    }

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    let data: {
      message?: { items?: Array<{ score?: number; DOI?: string; title?: string[] }> };
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return null;
    }

    const items = data.message?.items;
    if (!Array.isArray(items) || items.length === 0) return null;

    const top = items[0];
    const score = top.score ?? 0;
    // CrossRef typical relevance scores range from 15 to 45
    if (score < 8) return null;
    const doi = top.DOI;
    if (!doi || typeof doi !== "string") return null;
    return doi.trim();
  } catch {
    return null;
  }
}

/**
 * Checks if a DOI has a formal CrossRef retraction notice via the `update-to` field.
 */
export async function checkCrossrefRetraction(doi: string): Promise<boolean> {
  try {
    if (!doi || typeof doi !== "string") return false;
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(MAILTO)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;

    let data: {
      message?: { "update-to"?: Array<{ type?: string; label?: string }> };
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return false;
    }

    const updates = data.message?.["update-to"];
    if (!Array.isArray(updates)) return false;

    for (const update of updates) {
      if (
        update.type === "retraction" ||
        update.label?.toLowerCase().includes("retract")
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
