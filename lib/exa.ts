// DOCUMENTATION NOTE: Exa finds replacement research papers.

import Exa from "exa-js";

export type ReplacementPaper = {
  title: string;
  url: string;
  summary: string;
  publishedDate: string | null;
  relevanceScore: number | null;
};

export async function findReplacementPapers(
  query: string,
): Promise<ReplacementPaper[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey?.trim()) {
    return [];
  }

  const q = query.trim();
  if (!q) {
    return [];
  }

  try {
    const exa = new Exa(apiKey);
    const { results } = await exa.search(q, {
      numResults: 3,
      category: "research paper",
      contents: { summary: true },
    });

    return results.slice(0, 3).map((r) => ({
      title: r.title ?? "",
      url: r.url,
      summary: r.summary ?? "",
      publishedDate: r.publishedDate ?? null,
      relevanceScore: typeof r.score === "number" ? r.score : null,
    }));
  } catch {
    return [];
  }
}
