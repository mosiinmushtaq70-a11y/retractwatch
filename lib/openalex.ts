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

    const q = cleanQuery;
    const url = buildOpenAlexUrl("works", {
      "filter": `title.search:${q}`,
      "per-page": "3",
    });

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    let data: {
      results?: Array<{ doi?: string | null }>;
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return null;
    }

    const items = data.results;
    if (!Array.isArray(items) || items.length === 0) return null;

    const top = items[0];
    const doiUrl = top.doi;
    if (!doiUrl || typeof doiUrl !== "string") return null;
    
    // OpenAlex returns DOIs as full URLs: "https://doi.org/10.1126/science.1066164"
    return doiUrl.replace("https://doi.org/", "").trim();
  } catch {
    return null;
  }
}

export async function checkOpenAlexRetraction(doi: string): Promise<boolean> {
  try {
    if (!doi || typeof doi !== "string") return false;
    
    const url = buildOpenAlexUrl(`works/https://doi.org/${doi}`, {});
    
    const res = await fetch(url, {
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
