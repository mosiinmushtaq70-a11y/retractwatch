// DOCUMENTATION NOTE:
// Integrity pipeline: CrossRef → Retraction Watch CSV → Semantic Scholar → Exa.
// Updates are injected (e.g. Convex). Phase 4 also persists replacements via Convex HTTP when URL is set.

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { mapPool } from "./asyncPool";
import { resolveDoiFromTitle } from "./crossref";
import { calculateDownstreamRisk } from "./downstreamRisk";
import { findReplacementPapers } from "./exa";
import { isRetracted } from "./retractionWatch";
import {
  calculateIntegrityScore as scoreFromScoringTable,
  type Citation as ScoringCitation,
} from "./scoring";
import {
  getReferences,
  type GetReferencesResult as ScholarRefsResult,
} from "./semanticScholar";
import type {
  PipelineCitation,
  PipelineUpdateFns,
  ReplacementRow,
  RetractionRecord,
} from "./pipeline-types";

export type {
  PipelineCitation,
  PipelineCitationStatus,
  PipelineUpdateFns,
  ReferenceRow,
  ReplacementRow,
  RetractionRecord,
} from "./pipeline-types";

/** @deprecated Use RetractionRecord */
export type RetractionInfo = RetractionRecord;

/** CrossRef + Semantic Scholar — stay under typical rate limits. */
const POOL_DOI_RESOLVE = 6;
const POOL_RETRACTION = 14;
const POOL_CASCADE_FETCH = 4;
const POOL_REPLACEMENTS = 4;

// -----------------------------------------------------------------------------
// External adapters (try/catch per call; safe fallbacks)
// -----------------------------------------------------------------------------

export async function resolveDoiFromTitleWrapper(
  title: string,
  authors?: string,
): Promise<string | null> {
  try {
    return await resolveDoiFromTitle(title, authors);
  } catch {
    return null;
  }
}

export async function isRetractedWrapper(
  doi: string,
): Promise<RetractionRecord | null> {
  try {
    return isRetracted(doi);
  } catch {
    return null;
  }
}

export async function getReferencesWrapper(
  doi: string,
): Promise<ScholarRefsResult> {
  try {
    return await getReferences(doi);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[pipeline] getReferencesWrapper unexpected error", {
      doi,
      message,
    });
    return { ok: false, message: `Unexpected: ${message}` };
  }
}

export async function findReplacementPapersWrapper(
  title: string,
  year: number | string | undefined,
): Promise<ReplacementRow[]> {
  try {
    const q = [title, year].filter((x) => x !== undefined && x !== "").join(" ").trim();
    if (!q) return [];
    const rows = await findReplacementPapers(q);
    return rows.map((r) => ({
      title: r.title,
      url: r.url,
      summary: r.summary,
      publishedDate: r.publishedDate ?? "",
      relevanceScore: r.relevanceScore ?? 0,
    }));
  } catch {
    return [];
  }
}

function pipelineToScoringCitations(p: PipelineCitation[]): ScoringCitation[] {
  return p.map((c) => {
    let year: number | null = null;
    if (typeof c.year === "number" && !Number.isNaN(c.year)) year = c.year;
    else if (c.year != null && String(c.year).trim() !== "") {
      const n = Number(c.year);
      year = Number.isNaN(n) ? null : n;
    }
    return {
      id: c.id,
      title: c.title,
      authors: c.authors ?? "",
      year,
      doi: c.doi ?? null,
      status: c.status,
      retractionReason: c.retraction?.retractionReason,
      retractionDate: c.retraction?.retractionDate,
      retractionCountry: c.retraction?.retractionCountry,
      retractionJournal: c.retraction?.retractionJournal,
    };
  });
}

/**
 * Phase 1 — Resolve DOIs (CrossRef)
 * Phase 2 — Retractions (local CSV)
 * Phase 3 — Cascade (Semantic Scholar + CSV)
 * Phase 4 — Replacements (Exa)
 * Phase 5 — Score + job metadata
 */
export async function runPipeline(
  jobId: string,
  citations: PipelineCitation[],
  fns: PipelineUpdateFns,
): Promise<{ citations: PipelineCitation[]; integrityScore: number }> {
  const { updateCitation, updateJob } = fns;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  const convexClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;

  const emitCitation = async (
    phase: string,
    data: Record<string, unknown> & { id: string },
  ) => {
    try {
      await Promise.resolve(updateCitation(data.id, { phase, ...data }));
    } catch {
      /* sink */
    }
  };

  const emitJob = async (payload: Record<string, unknown>) => {
    try {
      await Promise.resolve(updateJob({ jobId, ...payload }));
    } catch {
      /* sink */
    }
  };

  for (const c of citations) {
    if (!c.status) {
      c.status = "pending";
    }
  }

  await emitJob({
    event: "pipeline_started",
    total: citations.length,
    status: "running",
    processedCount: 0,
  });

  let integrityScore = 100;

  const commitFinalJob = async (): Promise<number> => {
    await emitJob({ phase: 5, name: "score_calculation" });
    let score = 100;
    try {
      score = scoreFromScoringTable(pipelineToScoringCitations(citations));
    } catch {
      score = 0;
    }

    const scoringRows = pipelineToScoringCitations(citations);
    const hist = compareToHistoricalCases(
      citations.map((c) => ({
        retracted: c.status === "retracted",
        cascade: c.status === "cascade" || c.status === "cascade-unknown",
        retractionReason: c.retraction?.retractionReason,
        journal: c.retraction?.retractionJournal,
        title: c.title,
        cascadeVia: c.cascadeVia,
      })),
      score,
    );
    const downstream = calculateDownstreamRisk(scoringRows);
    const histPayload = historicalPayloadForJob(hist);

    await emitJob({
      phase: 5,
      integrityScore: score,
      processedCount: citations.length,
      status: "complete",
      historicalComparison: histPayload,
      downstreamRisk: downstream,
      perCitation: citations.map((x) => ({
        id: x.id,
        status: x.status,
        doi: x.doi,
      })),
    });

    await emitJob({
      event: "pipeline_complete",
      integrityScore: score,
      status: "complete",
      processedCount: citations.length,
      historicalComparison: histPayload,
      downstreamRisk: downstream,
    });

    return score;
  };

  try {
    // Phase 1 — Resolve DOIs (parallel CrossRef)
    await emitJob({ phase: 1, name: "resolve_dois" });
    await mapPool(citations, POOL_DOI_RESOLVE, async (c) => {
      try {
        c.status = "checking";
        await emitCitation("doi_resolve_started", {
          id: c.id,
          title: c.title,
          status: c.status,
        });

        let doi = c.doi?.trim() || null;
        if (!doi) {
          doi = await resolveDoiFromTitleWrapper(c.title, c.authors);
        }

        if (!doi) {
          c.status = "unverified";
          await emitCitation("doi_unresolved", {
            id: c.id,
            title: c.title,
            status: c.status,
          });
          return;
        }

        c.doi = doi;
        c.status = "pending";
        await emitCitation("doi_resolved", {
          id: c.id,
          title: c.title,
          doi: c.doi,
          status: c.status,
        });
      } catch {
        c.status = "unverified";
        await emitCitation("doi_error", {
          id: c.id,
          title: c.title,
          status: c.status,
        });
      }
    });

    // Phase 2 — Retraction Watch (parallel; CSV is in-memory after first load)
    await emitJob({ phase: 2, name: "retraction_check" });
    const phase2Targets = citations.filter(
      (c) => c.status !== "unverified" && Boolean(c.doi?.trim()),
    );
    await mapPool(phase2Targets, POOL_RETRACTION, async (c) => {
      try {
        c.status = "checking";
        await emitCitation("retraction_check_started", {
          id: c.id,
          status: c.status,
        });

        const info = await isRetractedWrapper(c.doi!);

        if (info) {
          c.retraction = info;
          c.status = "retracted";
          await emitCitation("retracted", {
            id: c.id,
            retraction: info,
            status: c.status,
          });
        } else {
          c.retraction = null;
          c.status = "clean";
          await emitCitation("not_retracted", {
            id: c.id,
            status: c.status,
          });
        }
      } catch {
        c.retraction = null;
        c.status = "unverified";
        await emitCitation("retraction_check_error", {
          id: c.id,
          status: c.status,
        });
      }
    });

    // Phase 3 — Cascade (parallel S2 fetches; parallel RW checks per paper)
    await emitJob({ phase: 3, name: "cascade_detection" });
    const phase3Targets = citations.filter(
      (c) =>
        c.status !== "retracted" &&
        c.status !== "unverified" &&
        Boolean(c.doi?.trim()),
    );
    await mapPool(phase3Targets, POOL_CASCADE_FETCH, async (c) => {
      try {
        c.status = "checking";
        await emitCitation("cascade_check_started", {
          id: c.id,
          status: c.status,
        });

        const scholar = await getReferencesWrapper(c.doi!);

        if (!scholar.ok) {
          c.references = [];
          c.status = "cascade-unknown";
          c.cascadeVia =
            "Semantic Scholar reference list could not be loaded; cascade status unknown.";
          console.log("[pipeline] cascade-unknown (API did not return usable data)", {
            citationId: c.id,
            paperTitle: c.title,
            doi: c.doi,
            message: scholar.message,
            rateLimited: scholar.rateLimited,
            statusCode: scholar.statusCode,
          });
          await emitCitation("cascade_unknown", {
            id: c.id,
            status: c.status,
            cascadeVia: c.cascadeVia,
          });
          return;
        }

        const refs = scholar.references;
        c.references = refs;

        const refChecks = await Promise.all(
          refs.map(async (ref) => ({
            ref,
            ret: await isRetractedWrapper(ref.doi),
          })),
        );
        const hit = refChecks.find((x) => x.ret);

        if (hit?.ret) {
          const cascadeViaRef = hit.ref;
          c.status = "cascade";
          const viaLabel =
            cascadeViaRef.title?.trim() ||
            cascadeViaRef.doi ||
            "retracted upstream reference";
          c.cascadeVia = viaLabel;
          console.log("[pipeline] cascade detected", {
            citationId: c.id,
            paperTitle: c.title,
            citingDoi: c.doi,
            upstreamRetractedDoi: cascadeViaRef.doi,
            upstreamTitle: cascadeViaRef.title,
            refsChecked: refs.length,
          });
          await emitCitation("cascade", {
            id: c.id,
            references: refs,
            status: c.status,
            cascadeVia: c.cascadeVia,
          });
        } else {
          c.status = "clean";
          c.cascadeVia = undefined;
          await emitCitation("no_cascade", { id: c.id, status: c.status });
        }
      } catch {
        c.status = "unverified";
        await emitCitation("cascade_check_error", {
          id: c.id,
          status: c.status,
        });
      }
    });

    // Phase 4 — Replacement suggestions (parallel Exa)
    await emitJob({ phase: 4, name: "replacement_suggestions" });
    const phase4Targets = citations.filter(
      (c) => c.status === "retracted" || c.status === "cascade",
    );
    await mapPool(phase4Targets, POOL_REPLACEMENTS, async (c) => {
      try {
        const replacements = await findReplacementPapersWrapper(c.title, c.year);
        c.replacements = replacements;
        if (convexClient) {
          for (const r of replacements) {
            try {
              await convexClient.mutation(api.replacements.createReplacement, {
                citationId: c.id as Id<"citations">,
                title: r.title,
                url: r.url,
                summary: r.summary ?? "",
                publishedDate: r.publishedDate?.trim() || "Unknown",
                relevanceScore: r.relevanceScore ?? 0.5,
              });
            } catch (err) {
              console.error("[pipeline] createReplacement failed", c.id, err);
            }
          }
        }
        await emitCitation("replacements", {
          id: c.id,
          replacements,
          status: c.status,
        });
      } catch {
        c.replacements = [];
        await emitCitation("replacements_error", { id: c.id, status: c.status });
      }
    });
  } catch (fatal) {
    console.error("[pipeline] fatal error mid-run — still finalizing job", fatal);
  } finally {
    try {
      integrityScore = await commitFinalJob();
    } catch (finalizeErr) {
      console.error("[pipeline] commitFinalJob failed", finalizeErr);
    }
  }

<<<<<<< HEAD
=======
  // Phase 5 — Score calculation + analytics for job row
  await emitJob({ phase: 5, name: "score_calculation" });
  let integrityScore = 100;
  try {
    integrityScore = scoreFromScoringTable(pipelineToScoringCitations(citations));
  } catch {
    integrityScore = 0;
  }

  const scoringRows = pipelineToScoringCitations(citations);
  const downstream = calculateDownstreamRisk(scoringRows);

  await emitJob({
    phase: 5,
    integrityScore,
    processedCount: citations.length,
    status: "complete",
    downstreamRisk: downstream,
    perCitation: citations.map((x) => ({
      id: x.id,
      status: x.status,
      doi: x.doi,
    })),
  });

  await emitJob({
    event: "pipeline_complete",
    integrityScore,
    status: "complete",
    processedCount: citations.length,
    downstreamRisk: downstream,
  });

>>>>>>> 747d616 (fix: exclude CSV from build bundle)
  return { citations, integrityScore };
}

export async function testPipeline(): Promise<void> {
  const jobId = "test-job-" + Date.now();
  console.log("\n========== testPipeline() ==========\n");

  const citations: PipelineCitation[] = [
    { id: "c1", title: "Neural correlates of attention", year: 2019, status: "pending" },
    { id: "c2", title: "Diet and metabolic syndrome", year: 2021, status: "pending" },
    { id: "c3", title: "Vaccine immunogenicity trial", year: 2018, status: "pending" },
    { id: "c4", title: "Climate models regional bias", year: 2020, status: "pending" },
    { id: "c5", title: "CRISPR off-target effects", year: 2022, status: "pending" },
    { id: "c6", title: "Social cognition in adolescents", year: 2017, status: "pending" },
  ];

  console.log("[updateJob]", jobId, {
    event: "test_run_start",
    citations: citations.length,
  });

  const fns: PipelineUpdateFns = {
    updateCitation: (id, updates) =>
      console.log("[updateCitation]", id, updates),
    updateJob: (updates) => console.log("[updateJob]", updates),
  };

  const result = await runPipeline(jobId, citations, fns);

  console.log("\n--- Final citations (summary) ---");
  console.log(JSON.stringify(result.citations, null, 2));
  console.log("\n========== end testPipeline ==========\n");
}
