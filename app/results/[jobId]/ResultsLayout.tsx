"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { IntegrityScore } from "@/components/IntegrityScore";
import { DownstreamRisk } from "@/components/DownstreamRisk";
import { CitationFeed } from "@/components/CitationFeed";
import { CascadeGraph } from "@/components/CascadeGraph";
import { ReportDownload } from "@/components/ReportDownload";
import type { CitationRow } from "@/lib/citationRow";
import type { JobViewModel } from "@/lib/jobViewModel";

type Props = {
  jobId: string;
  job: JobViewModel | null;
  citations: CitationRow[];
  loading?: boolean;
  /** Job row is ready but Convex citations query has not returned yet. */
  citationsLoading?: boolean;
  notFound?: boolean;
  dataSource?: "convex";
};

export function ResultsLayout({
  jobId,
  job,
  citations,
  loading,
  citationsLoading,
  notFound,
  dataSource,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const status = job?.status ?? "";
  const score = job?.integrityScore ?? undefined;

  return (
    <div className="relative min-h-dvh pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
      <SiteHeader />

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Analysis job
            </p>
            <p className="font-mono text-sm text-slate-300">{jobId}</p>
            {dataSource ? (
              <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">
<<<<<<< HEAD
                Live · Convex
=======
                {dataSource === "convex"
                  ? "Full results · saved online"
                  : "Demo · sample data"}
>>>>>>> 747d616 (fix: exclude CSV from build bundle)
              </p>
            ) : null}
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
          >
            ← New upload
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center text-slate-400">
            <p className="text-sm font-medium text-slate-200">
              Loading job…
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Waiting for{" "}
              <code className="text-slate-400">api.jobs.getJob</code>
            </p>
          </div>
        ) : null}

        {notFound ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-10 text-center">
            <p className="text-sm font-medium text-amber-200">Job not found</p>
            <p className="mt-2 text-xs text-amber-200/70">
              No saved analysis was found for this job id.
            </p>
          </div>
        ) : null}

        {!loading && !notFound ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <IntegrityScore score={score} status={status} />
              <DownstreamRisk risk={job?.downstreamRisk ?? undefined} />
            </div>

            {citationsLoading ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center">
                <p className="text-sm font-medium text-slate-200">
                  Loading citations…
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Feed and cascade graph appear when{" "}
                  <code className="text-slate-400">
                    api.citations.getCitationsForJob
                  </code>{" "}
                  finishes.
                </p>
                <div className="mx-auto mt-6 grid max-w-3xl gap-3 lg:grid-cols-2">
                  <div className="h-40 rounded-xl border border-white/5 bg-slate-800/40 rw-shimmer" />
                  <div className="h-40 rounded-xl border border-white/5 bg-slate-800/40 rw-shimmer" />
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <CitationFeed
                  citations={citations}
                  onSelectedCitationChange={setSelectedId}
                />
                <CascadeGraph
                  citations={citations}
                  highlightId={selectedId}
                />
              </div>
            )}

            <div className="mt-6">
              {citationsLoading ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/30 px-5 py-4 text-sm text-slate-500">
                  Export report unlocks after citations load.
                </div>
              ) : (
                <ReportDownload job={job} citations={citations} />
              )}
            </div>
          </>
        ) : null}

        <p className="mt-6 text-center text-xs text-slate-600">
          {notFound || loading
            ? null
            : "Renders backend fields as-is; optional data uses safe fallbacks."}
        </p>
      </div>
    </div>
  );
}
