export function getScoreLabel(score: number) {
  if (score >= 90) {
    return {
      label: "CLEAN",
      color: "#34d399",
      description:
        "No retraction contamination detected in your bibliography.",
    };
  }
  if (score >= 70) {
    return {
      label: "REVIEW RECOMMENDED",
      color: "#fbbf24",
      description: "Issues worth reviewing before you submit.",
    };
  }
  if (score >= 50) {
    return {
      label: "SIGNIFICANT RISK",
      color: "#f87171",
      description: "Serious contamination signals — address before submission.",
    };
  }
  return {
    label: "CRITICAL",
    color: "#b91c1c",
    description: "Severe risk profile — major bibliography revision needed.",
  };
}
