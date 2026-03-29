type Props = { risk: unknown };

const riskColors: Record<string, string> = {
  low: "text-emerald-300",
  moderate: "text-amber-300",
  high: "text-orange-300",
  critical: "text-red-300",
};

function readRecord(x: unknown): Record<string, unknown> | null {
  if (x == null || typeof x !== "object") return null;
  return x as Record<string, unknown>;
}

function readNumber(r: Record<string, unknown>, key: string): number | undefined {
  const v = r[key];
  return typeof v === "number" && !Number.isNaN(v) ? v : undefined;
}

export function DownstreamRisk({ risk }: Props) {
  const r = readRecord(risk);

  if (!r) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-md">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Downstream risk
        </h3>
        <div className="mt-4 space-y-2">
          <div className="rw-shimmer h-6 w-24 rounded-lg bg-slate-700/60" />
          <div className="rw-shimmer h-3.5 w-48 rounded bg-slate-700/40" />
          <div className="rw-shimmer h-3 w-36 rounded bg-slate-700/30" />
        </div>
        <p className="mt-3 text-xs text-blue-300/80">Analyzing…</p>
      </div>
    );
  }

  const level =
    typeof r.riskLevel === "string" ? r.riskLevel : "low";
  const color = riskColors[level] ?? "text-emerald-300";

  const totalReferences = readNumber(r, "totalReferences");
  const retractedCount = readNumber(r, "retractedCount");
  const cascadeCount = readNumber(r, "cascadeCount");
  const flaggedInBibliography = readNumber(r, "flaggedInBibliography");
  const estimatedDownstreamPapers = readNumber(r, "estimatedDownstreamPapers");
  const estimatedDirectCitations = readNumber(r, "estimatedDirectCitations");
  const worst = readNumber(r, "worstCaseDownstream");
  const explanation =
    typeof r.explanation === "string" ? r.explanation : undefined;

  const hasBibliographyMetrics =
    totalReferences != null ||
    retractedCount != null ||
    cascadeCount != null ||
    flaggedInBibliography != null;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Downstream risk
        </h3>
        <span
          className={`rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${color}`}
        >
          {level}
        </span>
      </div>

      {hasBibliographyMetrics ? (
        <dl className="mt-4 grid gap-2 text-sm">
          {totalReferences != null ? (
            <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-slate-500">References analyzed</dt>
              <dd className="tabular-nums font-semibold text-slate-100">
                {totalReferences}
              </dd>
            </div>
          ) : null}
          {retractedCount != null ? (
            <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-slate-500">Retracted in bibliography</dt>
              <dd className="tabular-nums font-semibold text-red-200">
                {retractedCount}
              </dd>
            </div>
          ) : null}
          {cascadeCount != null ? (
            <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-slate-500">Cascade-affected</dt>
              <dd className="tabular-nums font-semibold text-orange-200">
                {cascadeCount}
              </dd>
            </div>
          ) : null}
          {flaggedInBibliography != null ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Total flagged</dt>
              <dd className={`tabular-nums font-bold ${color}`}>
                {flaggedInBibliography}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {estimatedDownstreamPapers != null ? (
        <p className="mt-4 text-2xl font-bold tracking-tight">
          <span className={color}>{estimatedDownstreamPapers}</span>
          <span className="ml-2 text-base font-medium text-slate-400">
            est. downstream papers
          </span>
        </p>
      ) : null}

      {estimatedDirectCitations != null && estimatedDirectCitations > 0 ? (
        <p className="mt-1 text-xs text-slate-500">
          Modeled direct citation load: ~{estimatedDirectCitations} (≈12 cites
          × flagged items)
        </p>
      ) : null}

      {explanation ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {explanation}
        </p>
      ) : null}

      {worst != null ? (
        <p className="mt-3 text-xs text-slate-500">
          Worst-case propagation upper bound:{" "}
          <span className="text-slate-300">{worst}</span> papers
        </p>
      ) : null}
    </div>
  );
}
