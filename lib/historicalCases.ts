// DOCUMENTATION NOTE:
// This converts numeric risk into real-world comparison stories.

import historicalCasesJson from "@/data/historical_cases.json";

export type HistoricalCase = {
  name: string;
  year: number;
  severity: string;
  impact: string;
  avgMonthsToCatch: number;
  /** UI headline: "Similar to: {name} ({year})" */
  similarToLabel: string;
};

type HistoricalCaseRow = (typeof historicalCasesJson)[number];

type FieldHint =
  | "cardiology"
  | "oncology"
  | "neurology"
  | "psychology"
  | "physics_chem"
  | "economics"
  | "marine_biology"
  | "immunology"
  | "anesthesiology"
  | "dentistry"
  | "stem_cell"
  | "nutrition"
  | "social_science";

function toCase(row: HistoricalCaseRow): HistoricalCase {
  return {
    name: row.name,
    year: row.year,
    severity: row.severity,
    impact: row.impact,
    avgMonthsToCatch: row.avgMonthsToCatch,
    similarToLabel: `Similar to: ${row.name} (${row.year})`,
  };
}

function rowsForSeverity(comparisonSeverity: ComparisonSeverity): HistoricalCaseRow[] {
  const rows = historicalCasesJson;
  if (comparisonSeverity === "catastrophic") {
    return rows.filter((r) => r.severity === "catastrophic");
  }
  if (comparisonSeverity === "critical") {
    return rows.filter((r) => r.severity === "critical");
  }
  if (comparisonSeverity === "moderate") {
    return rows.filter((r) => r.severity === "high" || r.severity === "moderate");
  }
  return [];
}

function inferPreferredReasonCode(reasonText: string): string | null {
  const t = reasonText.toLowerCase();
  if (/fraud|fabricat/.test(t)) return "fraud";
  if (/plagiar/.test(t)) return "plagiarism";
  if (/\berror\b|unreliab|failed replication|p-hack|overstated/.test(t)) {
    return "error";
  }
  if (/manipulat|falsif|image duplicat|concerns\/issues about image/.test(t)) {
    return "manipulation";
  }
  return null;
}

function inferFieldHint(venueCorpus: string): FieldHint | null {
  const t = venueCorpus.toLowerCase();
  if (/\bphysics\b|superconduct|condensed matter/.test(t)) return "physics_chem";
  if (/\bchemistry\b|biochemistry/.test(t)) return "physics_chem";
  if (/cardio|\bheart\b|cardiac/.test(t)) return "cardiology";
  if (/cancer|tumor|oncol|chemotherapy|genomic.*cancer/.test(t)) return "oncology";
  if (/neuro|alzheimer|\bbrain\b|neurology/.test(t)) return "neurology";
  if (/psychol|psychiatry|cognitive psych|social psych/.test(t)) return "psychology";
  if (
    /\bbehav/i.test(t) &&
    !/(ecology|marine|fish|spider|ocean|coral|acidification|animal behavior)/i.test(t)
  ) {
    return "psychology";
  }
  if (/econom|urban econ|political science|survey.*marriage|same-sex/.test(t)) {
    return "economics";
  }
  if (/marine|fish behavior|coral|ocean acidification|spider|behavioral ecology/.test(t)) {
    return "marine_biology";
  }
  if (/immun|vaccine|hiv|transplant rejection|inflammatory disease/.test(t)) {
    return "immunology";
  }
  if (/anesth|pain management|analges/.test(t)) return "anesthesiology";
  if (/dental|dentistry|oral/.test(t)) return "dentistry";
  if (/stem cell|cloning/.test(t)) return "stem_cell";
  if (/nutrition|diet|food|metabolic|vitamin/.test(t)) return "nutrition";
  if (/political|social science|survey data/.test(t)) return "social_science";
  return null;
}

function rowMatchesFieldHint(row: HistoricalCaseRow, hint: FieldHint): boolean {
  const f = row.field.toLowerCase();
  const sf = (row.subfield ?? "").toLowerCase();
  const name = row.name.toLowerCase();
  switch (hint) {
    case "cardiology":
      return sf.includes("cardio") || /cardiac|heart/.test(name);
    case "oncology":
      return sf.includes("oncol") || /cancer|curcumin|potti|croce/.test(name);
    case "neurology":
      return (
        sf.includes("neurol") ||
        sf.includes("neuroscience") ||
        /alzheimer|amyloid|tessier-lavigne/.test(name)
      );
    case "psychology":
      return f.includes("psychology") || /stapel|cuddy|power pose|social psych/.test(name);
    case "physics_chem":
      return f === "physics" || f === "chemistry";
    case "economics":
      return f === "economics" || /nijkamp|lacour|political science/.test(name + " " + sf);
    case "marine_biology":
      return sf.includes("marine") || sf.includes("behavioral ecology") || /fish|spider|pruitt|dixson/.test(name);
    case "immunology":
      return sf.includes("immun") || /wakefield|vaccine|hiv|melendez|van parijs/.test(name);
    case "anesthesiology":
      return sf.includes("anesthes") || /fujii|reuben/.test(name);
    case "dentistry":
      return sf.includes("dent") || /mori/.test(name);
    case "stem_cell":
      return sf.includes("stem cell") || /hwang|anversa/.test(name);
    case "nutrition":
      return f === "nutrition" || sf.includes("nutrition") || /wansink|chandra/.test(name);
    case "social_science":
      return f.includes("social") || f === "economics" || /lacour|nijkamp/.test(name);
    default:
      return false;
  }
}

function isMedicineBiologyHeavyRow(row: HistoricalCaseRow): boolean {
  const f = row.field.toLowerCase();
  if (f === "physics" || f === "chemistry") return false;
  if (f === "economics" && row.subfield?.toLowerCase().includes("urban")) return false;
  return (
    f === "medicine" ||
    f === "biology" ||
    f === "nutrition" ||
    f === "psychology" ||
    f === "multiple" ||
    f === "social science"
  );
}

function narrowPool(
  pool: HistoricalCaseRow[],
  preferredCode: string | null,
  fieldHint: FieldHint | null,
): HistoricalCaseRow[] {
  let p = pool;
  if (preferredCode) {
    const withCode = p.filter((r) => r.retractionReasonCode === preferredCode);
    if (withCode.length) p = withCode;
  }
  if (fieldHint) {
    const withField = p.filter((r) => rowMatchesFieldHint(r, fieldHint));
    if (withField.length) p = withField;
  } else {
    const med = p.filter(isMedicineBiologyHeavyRow);
    if (med.length) p = med;
  }
  return p;
}

function pickMatchedCase(
  comparisonSeverity: ComparisonSeverity,
  citations: CitationForComparison[],
): HistoricalCase | null {
  const pool = rowsForSeverity(comparisonSeverity);
  if (!pool.length) return null;

  const flagged = citations.filter((c) => c.retracted === true || c.cascade === true);
  const reasonBlob = flagged
    .filter((c) => c.retracted && c.retractionReason)
    .map((c) => c.retractionReason!)
    .join(" ");

  const venueBlob = flagged
    .map((c) =>
      [c.journal, c.title, c.cascadeVia].filter(Boolean).join(" "),
    )
    .join(" ");

  const preferredCode = inferPreferredReasonCode(reasonBlob);
  const fieldHint = inferFieldHint(venueBlob);

  const narrowed = narrowPool(pool, preferredCode, fieldHint);
  const pick = narrowed[0] ?? pool[0];
  return pick ? toCase(pick) : null;
}

export type ComparisonSeverity =
  | "catastrophic"
  | "critical"
  | "moderate"
  | "clean";

export type CitationForComparison = {
  retracted?: boolean;
  cascade?: boolean;
  /** Retraction Watch reason text when this citation is retracted */
  retractionReason?: string;
  /** Venue string (e.g. retraction journal) for field hints */
  journal?: string;
  /** Title of the citing reference (keyword hints) */
  title?: string;
  /** Label for upstream retracted work when status is cascade */
  cascadeVia?: string;
};

export type HistoricalComparison = {
  matchedCase: HistoricalCase | null;
  similarity: number;
  avgMonthsToCatch: number | null;
  impactDescription: string;
  severity: ComparisonSeverity;
};

function countFlags(
  citations: CitationForComparison[],
  key: "retracted" | "cascade",
): number {
  return citations.filter((c) => c[key] === true).length;
}

function similarityScore(
  severity: ComparisonSeverity,
  score: number,
  retracted: number,
  cascade: number,
): number {
  switch (severity) {
    case "catastrophic":
      return Math.min(
        100,
        Math.round(78 + retracted * 4 + Math.max(0, 49 - score) * 0.6),
      );
    case "critical":
      return Math.min(
        100,
        Math.round(55 + retracted * 12 + Math.max(0, 69 - score) * 0.5),
      );
    case "moderate":
      return Math.min(100, Math.round(40 + cascade * 14));
    default:
      return Math.max(0, Math.min(30, Math.round((score - 85) * 0.5 + 10)));
  }
}

export function compareToHistoricalCases(
  citations: CitationForComparison[],
  score: number,
): HistoricalComparison {
  const retracted = countFlags(citations, "retracted");
  const cascade = countFlags(citations, "cascade");

  let severity: ComparisonSeverity;
  let matchedCase: HistoricalCase | null;

  if (score < 50 || retracted >= 3) {
    severity = "catastrophic";
    matchedCase = pickMatchedCase("catastrophic", citations);
  } else if (score < 70 || retracted >= 1) {
    severity = "critical";
    matchedCase = pickMatchedCase("critical", citations);
  } else if (cascade > 0) {
    severity = "moderate";
    matchedCase = pickMatchedCase("moderate", citations);
  } else {
    severity = "clean";
    matchedCase = null;
  }

  const similarity = similarityScore(severity, score, retracted, cascade);
  const avgMonthsToCatch = matchedCase?.avgMonthsToCatch ?? null;
  const impactDescription = matchedCase
    ? matchedCase.impact
    : "No strong parallel to major known retraction scandals in this scan.";

  return {
    matchedCase,
    similarity,
    avgMonthsToCatch,
    impactDescription,
    severity,
  };
}
