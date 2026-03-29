// DOCUMENTATION NOTE:
// Creates Convex job + citations, returns immediately, runs pipeline in background.

import { ConvexHttpClient } from "convex/browser";
import { after, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  runPipeline,
  type PipelineCitation,
  type RetractionRecord,
} from "@/lib/pipeline";

export const runtime = "nodejs";
/**
 * Integrity pipeline (CrossRef, RW CSV, Semantic Scholar, optional Exa).
 * Requires Vercel Pro (or Fluid / high duration) for large bibliographies — Hobby often caps at 60s.
 */
export const maxDuration = 300;

function coerceYear(y: unknown): number | undefined {
  if (y == null) return undefined;
  if (typeof y === "number" && !Number.isNaN(y)) return y;
  const n = Number(y);
  return Number.isNaN(n) ? undefined : n;
}

type IncomingRow = {
  title: string;
  authors: string;
  year?: number;
  doi?: string;
};

function normalizeBodyCitations(raw: unknown): IncomingRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const o = item as Record<string, unknown>;
    const title =
      typeof o.title === "string" && o.title.trim()
        ? o.title.trim()
        : `Untitled reference ${i + 1}`;
    const authors =
      typeof o.authors === "string" && o.authors.trim()
        ? o.authors.trim()
        : "Unknown";
    return {
      title,
      authors,
      year: coerceYear(o.year),
      doi: typeof o.doi === "string" && o.doi.trim() ? o.doi.trim() : undefined,
    };
  });
}

export async function POST(request: Request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl?.trim()) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_URL is not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const citationsRaw =
    body && typeof body === "object" && body !== null && "citations" in body
      ? (body as { citations: unknown }).citations
      : undefined;

  if (!Array.isArray(citationsRaw) || citationsRaw.length === 0) {
    return NextResponse.json(
      { error: "Expected JSON body: { citations: [...] } with at least one row" },
      { status: 400 },
    );
  }

  const rows = normalizeBodyCitations(citationsRaw);
  const paperTitle =
    body && typeof body === "object" && body !== null && "paperTitle" in body
      ? String((body as { paperTitle?: unknown }).paperTitle ?? "").trim() ||
        undefined
      : undefined;

  const client = new ConvexHttpClient(convexUrl);

  // Each POST creates a new Convex job id — there is no reuse/cache by PDF content.
  let convexJobId: Id<"jobs">;
  try {
    convexJobId = await client.mutation(api.jobs.createJob, {
      status: "running",
      totalCitations: rows.length,
      processedCount: 0,
      createdAt: Date.now(),
      paperTitle,
    });
  } catch (e) {
    console.error("[check] createJob failed", e);
    return NextResponse.json(
      { error: "Failed to create analysis job" },
      { status: 500 },
    );
  }

  const pipelineCitations: PipelineCitation[] = [];

  for (const row of rows) {
    try {
      const citationId = await client.mutation(api.citations.createCitation, {
        jobId: convexJobId,
        title: row.title,
        authors: row.authors,
        year: row.year,
        doi: row.doi,
        status: "pending",
      });

      pipelineCitations.push({
        id: String(citationId),
        title: row.title,
        authors: row.authors,
        year: row.year,
        doi: row.doi,
        status: "pending",
      });
    } catch (e) {
      console.error("[check] createCitation failed", e);
      return NextResponse.json(
        { error: "Failed to save citations" },
        { status: 500 },
      );
    }
  }

  const jobIdStr = String(convexJobId);

  after(async () => {
    try {
      await runPipeline(jobIdStr, pipelineCitations, {
        updateCitation: async (citationId, updates) => {
      const u = updates as Record<string, unknown>;
      try {
        const patch: {
          citationId: Id<"citations">;
          title?: string;
          authors?: string;
          year?: number;
          doi?: string;
          status?: string;
          retractionReason?: string;
          retractionDate?: string;
          retractionCountry?: string;
          retractionJournal?: string;
          cascadeVia?: string;
        } = { citationId: citationId as Id<"citations"> };

        if (typeof u.status === "string") patch.status = u.status;
        if (typeof u.doi === "string") patch.doi = u.doi;
        if (typeof u.title === "string") patch.title = u.title;
        if (typeof u.authors === "string") patch.authors = u.authors;
        if (typeof u.cascadeVia === "string") patch.cascadeVia = u.cascadeVia;

        const ret = u.retraction;
        if (ret && typeof ret === "object") {
          const r = ret as RetractionRecord;
          patch.retractionReason = r.retractionReason;
          patch.retractionDate = r.retractionDate;
          patch.retractionCountry = r.retractionCountry;
          patch.retractionJournal = r.retractionJournal;
        }

        await client.mutation(api.citations.updateCitation, patch);
      } catch (err) {
        console.error("[check] updateCitation", citationId, err);
      }
    },
    updateJob: async (payload) => {
      const u = payload as Record<string, unknown>;
      try {
        const patch: {
          jobId: Id<"jobs">;
          status?: string;
          totalCitations?: number;
          processedCount?: number;
          integrityScore?: number;
          paperTitle?: string;
          downstreamRisk?: unknown;
        } = { jobId: convexJobId };

        if (typeof u.status === "string") patch.status = u.status;
        if (typeof u.totalCitations === "number") {
          patch.totalCitations = u.totalCitations;
        }
        if (typeof u.processedCount === "number") {
          patch.processedCount = u.processedCount;
        }
        if (typeof u.integrityScore === "number") {
          patch.integrityScore = u.integrityScore;
        }
        if (typeof u.paperTitle === "string") patch.paperTitle = u.paperTitle;
        if (u.downstreamRisk !== undefined) {
          patch.downstreamRisk = u.downstreamRisk;
        }

        await client.mutation(api.jobs.updateJob, patch);
      } catch (err) {
        console.error("[check] updateJob", err);
      }
    },
      });
    } catch (err) {
      console.error("[check] pipeline", jobIdStr, err);
    }
  });

  return NextResponse.json({ jobId: jobIdStr });
}
