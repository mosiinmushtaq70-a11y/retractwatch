export interface ScoreLabel {
  label: string;
  color: string;
  description: string;
}

export function getScoreLabel(score: number): ScoreLabel {
  try {
    const s = typeof score === "number" && !Number.isNaN(score) ? score : 0;
    if (s >= 90) {
      return {
        label: "CLEAN",
        color: "#22c55e",
        description: "No retraction contamination detected in your bibliography.",
      };
    }
    if (s >= 70) {
      return {
        label: "REVIEW RECOMMENDED",
        color: "#f59e0b",
        description: "Issues worth reviewing before you submit.",
      };
    }
    if (s >= 50) {
      return {
        label: "SIGNIFICANT RISK",
        color: "#ef4444",
        description: "Serious contamination signals — address before submission.",
      };
    }
    return {
      label: "CRITICAL",
      color: "#b91c1c",
      description: "Severe risk profile — major bibliography revision needed.",
    };
  } catch {
    return {
      label: "CLEAN",
      color: "#22c55e",
      description: "No retraction contamination detected in your bibliography.",
    };
  }
}
