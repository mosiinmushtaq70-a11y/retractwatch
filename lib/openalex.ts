// DOCUMENTATION NOTE: OpenAlex resolves titles to DOIs and checks retraction status.

const MAILTO = "retractwatch@hackathon.dev";

function getOpenAlexKey(): string {
  return process.env.OPENALEX_API_KEY?.trim() || "";
}

function buildOpenAlexUrl(endpoint: string, queryParams: Record<string, string>): string {
  const params = new URLSearchParams(queryParams);
  params.append("mailto", MAILTO);
  const key = getOpenAlexKey();
  if (key) {
    params.append("api_key", key);
  }
  return `https://api.openalex.org/${endpoint}?${params.toString()}`;
}

let globalWaitPromise: Promise<void> = Promise.resolve();

async function openAlexFetch(url: string, init: RequestInit): Promise<Response> {
  const p = globalWaitPromise.then(() => new Promise<void>((resolve) => setTimeout(resolve, 120)));
  globalWaitPromise = p.catch(() => {});
  await p;
  return fetch(url, init);
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
      .replace(/\s*\(doi:\s*10\.\d{4,9}\/[^\s)]+\)/i, "")
      .trim();

    if (cleanQuery.length < 5) return null;

    // Helper to query OpenAlex
    const queryOpenAlex = async (filterExpr: string) => {
      const url = buildOpenAlexUrl("works", {
        filter: filterExpr,
        "per-page": "3",
      });
      const res = await openAlexFetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        results?: Array<{ doi?: string | null; title?: string | null }>;
      };
      return data.results && data.results.length > 0 ? data.results : null;
    };

    // Strategy 1: Title search (exact phrase match in title)
    let results = await queryOpenAlex(`title.search:${cleanQuery}`);

    // Strategy 2: Default fulltext search fallback
    if (!results || results.length === 0) {
      results = await queryOpenAlex(`default.search:${cleanQuery}`);
    }

    if (!results || results.length === 0) return null;

    const top = results[0];
    const doiUrl = top.doi;
    if (!doiUrl || typeof doiUrl !== "string") return null;

    // OpenAlex returns DOIs as full URLs: "https://doi.org/10.1126/science.1066164"
    return doiUrl.replace(/^https?:\/\/doi\.org\//i, "").trim();
  } catch {
    return null;
  }
}

export async function checkOpenAlexRetraction(doi: string): Promise<boolean> {
  try {
    if (!doi || typeof doi !== "string") return false;
    const cleanDoi = doi.trim().replace(/^https?:\/\/doi\.org\//i, "");
    if (!cleanDoi) return false;

    const url = buildOpenAlexUrl(`works/https://doi.org/${encodeURIComponent(cleanDoi)}`, {});

    const res = await openAlexFetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return false;

    let data: {
      is_retracted?: boolean;
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return false;
    }

    return data.is_retracted === true;
  } catch {
    return false;
  }
}
