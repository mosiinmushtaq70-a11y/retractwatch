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
    await sleep(50);
  } catch {
    /* continue */
  }

  try {
    if (typeof title !== "string" || !title.trim()) return null;

    const q = encodeURIComponent(title.trim());
    let url = `https://api.crossref.org/works?query.title=${q}&rows=5&mailto=${encodeURIComponent(MAILTO)}`;
    if (typeof authors === "string" && authors.trim()) {
      url += `&query.author=${encodeURIComponent(authors.trim())}`;
    }

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;

    let data: {
      message?: { items?: Array<{ score?: number; DOI?: string }> };
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
    if (score < 50) return null;
    const doi = top.DOI;
    if (!doi || typeof doi !== "string") return null;
    return doi.trim();
  } catch {
    return null;
  }
}
