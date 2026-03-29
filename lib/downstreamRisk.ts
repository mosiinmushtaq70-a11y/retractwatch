// Downstream risk: bibliography counts (measured) + simple propagation estimates.

import type { Citation } from "./scoring";

export interface DownstreamRisk {
  /** Measured from this run — retracted references in the bibliography. */
  retractedCount: number;
  /** Measured — cascade / cascade-unknown rows. */
  cascadeCount: number;
  /** retractedCount + cascadeCount */
  flaggedInBibliography: number;
  /** Total references analyzed */
  totalReferences: number;
  /** Rough estimate: flagged × avg cites per paper */
  estimatedDirectCitations: number;
  /** Rough estimate of downstream papers that could inherit flags */
  estimatedDownstreamPapers: number;
  worstCaseDownstream: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  explanation: string;
}

const AVG_CITATIONS_PER_PAPER = 12;

const ZERO_RISK: DownstreamRisk = {
  retractedCount: 0,
  cascadeCount: 0,
  flaggedInBibliography: 0,
  totalReferences: 0,
  estimatedDirectCitations: 0,
  estimatedDownstreamPapers: 0,
  worstCaseDownstream: 0,
  riskLevel: "low",
  explanation: "No contamination detected. Zero downstream risk.",
};

function countBibliographyFlags(citations: Citation[]): {
  retractedCount: number;
  cascadeCount: number;
  totalReferences: number;
} {
  let retractedCount = 0;
  let cascadeCount = 0;
  const totalReferences = Array.isArray(citations) ? citations.length : 0;
  if (!Array.isArray(citations)) {
    return { retractedCount: 0, cascadeCount: 0, totalReferences: 0 };
  }
  for (const c of citations) {
    if (!c || typeof c !== "object") continue;
    if (c.status === "retracted") retractedCount++;
    else if (c.status === "cascade" || c.status === "cascade-unknown") {
      cascadeCount++;
    }
  }
  return { retractedCount, cascadeCount, totalReferences };
}

export function calculateDownstreamRisk(citations: Citation[]): DownstreamRisk {
  try {
    if (!Array.isArray(citations)) return { ...ZERO_RISK };

    const { retractedCount, cascadeCount, totalReferences } =
      countBibliographyFlags(citations);
    const flaggedInBibliography = retractedCount + cascadeCount;

    if (flaggedInBibliography === 0) {
      return {
        ...ZERO_RISK,
        totalReferences,
      };
    }

    const estimatedDirectCitations = flaggedInBibliography * AVG_CITATIONS_PER_PAPER;
    const estimatedDownstreamPapers = Math.round(
      flaggedInBibliography * AVG_CITATIONS_PER_PAPER * 2.1,
    );
    const worstCaseDownstream = flaggedInBibliography * 25 * 3;

    let riskLevel: DownstreamRisk["riskLevel"] = "low";
    if (estimatedDownstreamPapers > 300) riskLevel = "critical";
    else if (estimatedDownstreamPapers > 100) riskLevel = "high";
    else if (estimatedDownstreamPapers > 30) riskLevel = "moderate";

    const explanation = `Your bibliography has ${flaggedInBibliography} flagged reference${flaggedInBibliography === 1 ? "" : "s"} (${retractedCount} retracted, ${cascadeCount} cascade). If this work is cited broadly, roughly ${estimatedDownstreamPapers} downstream papers could be exposed along citation chains (illustrative model).`;

    return {
      retractedCount,
      cascadeCount,
      flaggedInBibliography,
      totalReferences,
      estimatedDirectCitations,
      estimatedDownstreamPapers,
      worstCaseDownstream,
      riskLevel,
      explanation,
    };
  } catch {
    return { ...ZERO_RISK };
  }
}
