/**
 * Integrity score (0–100): proportion-based penalties with reason/recency weighting,
 * then hard caps by direct retraction count.
 *
 * PRINCIPLE 1 — Proportion-based penalty
 *   Each retracted citation contributes (1/N) × 60 × severityMult × recencyMult.
 *   With uniform multipliers 1.0, total retracted penalty = (retractedCount/N) × 60.
 *   Each cascade contributes via shared term: (cascadeCount/N) × 25.
 *
 * PRINCIPLE 2 — Reason severity (retractionReason text, case-insensitive)
 *   Fraud / data fabrication → 1.5×
 *   Misconduct → 1.4×
 *   Plagiarism / duplication → 1.2×
 *   Error / mistake → 0.8×
 *   Unknown / other → 1.0×
 *
 * PRINCIPLE 3 — Recency (retractionDate; months since retraction vs “now”)
 *   < 2 years  → 0.8× (reduced penalty — harder to have known)
 *   2–5 years  → 1.0×
 *   ≥ 5 years  → 1.3× (should have caught)
 *   Missing/unparseable date → 1.0×
 *
 * PRINCIPLE 4 — Score ceiling by direct retraction count (applied after raw score)
 *   ≥ 1 retraction → final ≤ 85
 *   ≥ 3 retractions → final ≤ 65
 *   ≥ 5 retractions → final ≤ 40
 *
 * PRINCIPLE 5 — getScoreLabel() bands unchanged: 90+, 70–89, 50–69, 0–49
 */

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

export type IntegrityScore = number;

/** Max points attributable to direct retractions if every retracted row had mult 1.0 */
const RETRACTED_WEIGHT = 60;
/** Max points attributable to cascades if spread across the whole bibliography */
const CASCADE_WEIGHT = 25;

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.4375;

function getReasonSeverityMultiplier(reason: string | undefined): number {
  const r = (reason ?? "").toLowerCase();
  if (r.includes("fabricat") || r.includes("fraud")) return 1.5;
  if (r.includes("misconduct")) return 1.4;
  if (r.includes("plagiar") || r.includes("duplicat")) return 1.2;
  if (r.includes("mistake") || /\berror\b/.test(r)) return 0.8;
  return 1.0;
}

function getRecencyMultiplier(retractionDate: string | undefined): number {
  if (!retractionDate?.trim()) return 1.0;
  const t = Date.parse(retractionDate);
  if (Number.isNaN(t)) return 1.0;
  const monthsAgo = (Date.now() - t) / MS_PER_MONTH;
  if (monthsAgo < 24) return 0.8;
  if (monthsAgo < 60) return 1.0;
  return 1.3;
}

function applyRetractionCountCaps(score: number, retractedCount: number): number {
  let out = score;
  if (retractedCount >= 1) out = Math.min(out, 85);
  if (retractedCount >= 3) out = Math.min(out, 65);
  if (retractedCount >= 5) out = Math.min(out, 40);
  return out;
}

export function calculateIntegrityScore(citations: Citation[]): IntegrityScore {
  try {
    if (!Array.isArray(citations) || citations.length === 0) return 100;

    const total = citations.filter((c) => c && typeof c === "object").length;
    if (total === 0) return 100;

    let retractedPenalty = 0;
    let cascadeCount = 0;
    let retractedCount = 0;

    for (const c of citations) {
      if (!c || typeof c !== "object") continue;
      if (c.status === "retracted") {
        retractedCount += 1;
        const sev = getReasonSeverityMultiplier(c.retractionReason);
        const rec = getRecencyMultiplier(c.retractionDate);
        // Per-item share of bibliography × global retracted weight × modifiers
        retractedPenalty += (1 / total) * RETRACTED_WEIGHT * sev * rec;
      } else if (c.status === "cascade" || c.status === "cascade-unknown") {
        cascadeCount += 1;
      }
    }

    const cascadeRatio = cascadeCount / total;
    const cascadePenalty = cascadeRatio * CASCADE_WEIGHT;

    let score = 100 - retractedPenalty - cascadePenalty;
    score = applyRetractionCountCaps(score, retractedCount);
    score = Math.max(0, Math.min(100, score));

    return Math.round(score);
  } catch {
    return 100;
  }
}

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
        description: "No serious integrity flags detected in checked citations.",
      };
    }
    if (s >= 70) {
      return {
        label: "REVIEW RECOMMENDED",
        color: "#f59e0b",
        description: "Some citations need a closer look before you rely on this bibliography.",
      };
    }
    if (s >= 50) {
      return {
        label: "SIGNIFICANT RISK",
        color: "#ef4444",
        description: "Multiple integrity concerns; verify sources before publication or policy use.",
      };
    }
    return {
      label: "CRITICAL",
      color: "#7f1d1d",
      description: "Severe integrity risk—retraction or cascade issues dominate this reference list.",
    };
  } catch {
    return {
      label: "CLEAN",
      color: "#22c55e",
      description: "No serious integrity flags detected in checked citations.",
    };
  }
}
