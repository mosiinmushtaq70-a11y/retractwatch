"use client";

import Link from "next/link";
import { ResultsConvexView } from "./ResultsConvexView";
import { hasConvexUrl } from "@/lib/convexEnv";

type Props = { jobId: string };

export function ResultsPageClient({ jobId }: Props) {
<<<<<<< HEAD
=======
  if (jobId === "demo") {
    const citations = normalizeCitations(MOCK_CITATIONS as unknown[]);
    const job: JobViewModel = {
      status: MOCK_JOB?.status ?? undefined,
      integrityScore: MOCK_JOB?.integrityScore ?? undefined,
      downstreamRisk: MOCK_JOB?.downstreamRisk,
    };
    return (
      <ResultsLayout
        jobId="demo"
        job={job}
        citations={citations}
        dataSource="demo"
      />
    );
  }

>>>>>>> 747d616 (fix: exclude CSV from build bundle)
  const convexConfigured = hasConvexUrl();

  if (!convexConfigured) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <p className="text-slate-200">Saved results need the app backend URL.</p>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Set{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">
            NEXT_PUBLIC_CONVEX_URL
          </code>{" "}
<<<<<<< HEAD
          to <code className="text-slate-400">.env.local</code>, restart the dev
          server, then open this job again.
=======
          in <code className="text-slate-400">.env.local</code> (your hosted backend),
          restart the dev server, then run an analysis again.
>>>>>>> 747d616 (fix: exclude CSV from build bundle)
        </p>
        {jobId ? (
          <p className="mt-4 font-mono text-xs text-slate-600">Job: {jobId}</p>
        ) : null}
        <Link
          href="/"
          className="mt-8 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300"
        >
          ← Home
        </Link>
      </div>
    );
  }

  return <ResultsConvexView jobId={jobId} />;
}
