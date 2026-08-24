export interface Citation {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  doi: string | null;
  status:
    | "pending"
    | "checking"
    | "clean"
    | "retracted"
    | "cascade"
    | "cascade-unknown"
    | "unverified";
  retractionReason?: string;
  retractionDate?: string;
  retractionCountry?: string;
  retractionJournal?: string;
  cascadeDepth?: number;
  cascadeVia?: string;
}

export type RiskLevel = "high" | "medium" | "low" | "none";

export interface IntegritySummary {
  retractedCount: number;
  cascadeCount: number;
  cleanCount: number;
  unverifiedCount: number;
  totalCount: number;
  riskLevel: RiskLevel;
  advice: string;
}

export function generateIntegritySummary(citations: Citation[]): IntegritySummary {
  const summary: IntegritySummary = {
    retractedCount: 0,
    cascadeCount: 0,
    cleanCount: 0,
    unverifiedCount: 0,
    totalCount: 0,
    riskLevel: "none",
    advice: "No citations found.",
  };

  if (!Array.isArray(citations) || citations.length === 0) {
    return summary;
  }

  summary.totalCount = citations.filter((c) => c && typeof c === "object").length;
  if (summary.totalCount === 0) return summary;

  for (const c of citations) {
    if (!c || typeof c !== "object") continue;
    if (c.status === "retracted") {
      summary.retractedCount += 1;
    } else if (c.status === "cascade" || c.status === "cascade-unknown") {
      summary.cascadeCount += 1;
    } else if (c.status === "unverified") {
      summary.unverifiedCount += 1;
    } else if (c.status === "clean") {
      summary.cleanCount += 1;
    }
  }

  if (summary.retractedCount > 0) {
    summary.riskLevel = "high";
    summary.advice = "High Risk: Reject or mandate citation swap. Contains directly retracted citations.";
  } else if (summary.cascadeCount > 0) {
    summary.riskLevel = "medium";
    summary.advice = "Medium Risk: Verify cascaded citations. Dependencies of cited works are retracted.";
  } else if (summary.unverifiedCount > summary.totalCount * 0.5) {
    summary.riskLevel = "medium";
    summary.advice = "Medium Risk: High number of unverified citations. Provenance could not be verified.";
  } else {
    summary.riskLevel = "low";
    summary.advice = "Low Risk: Bibliographic integrity looks solid.";
  }

  return summary;
}
