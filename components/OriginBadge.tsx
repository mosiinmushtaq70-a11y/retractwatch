type Props = {
  country?: string | null;
  journal?: string | null;
  reason?: string | null;
  retractionDate?: string | null;
};

function reasonClass(reason: string) {
  const r = reason.toLowerCase();
  if (r.includes("fabricat") || r.includes("fraud")) {
    return "bg-red-950/80 text-red-200 ring-red-500/30";
  }
  if (r.includes("plagiar")) {
    return "bg-orange-950/80 text-orange-200 ring-orange-500/30";
  }
  if (r.includes("error")) {
    return "bg-amber-950/80 text-amber-200 ring-amber-500/30";
  }
  return "bg-slate-800/90 text-slate-200 ring-white/10";
}

export function OriginBadge({
  country,
  journal,
  reason,
  retractionDate,
}: Props) {
  const c = country?.trim() || "Unknown";
  const j = journal?.trim() || "—";
  const rawReason = reason?.trim() || "—";
  // Add space after semicolons if missing for better text wrapping
  const rs = rawReason.replace(/;(?!\s)/g, "; ");
  const d = retractionDate?.trim() || "—";

  return (
    <div className="mt-2 flex flex-wrap gap-2 min-w-0 max-w-full">
      <span className="inline-flex items-center rounded-lg bg-slate-800/80 px-2 py-1 text-[11px] text-slate-300 ring-1 ring-white/10 break-words [overflow-wrap:anywhere]">
        {c}
      </span>
      <span className="inline-flex items-center rounded-lg bg-slate-800/80 px-2 py-1 text-[11px] text-slate-300 ring-1 ring-white/10 break-words [overflow-wrap:anywhere]">
        {j}
      </span>
      <span
        className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-medium ring-1 break-words [overflow-wrap:anywhere] ${reasonClass(rawReason)}`}
      >
        {rs}
      </span>
      <span className="inline-flex items-center rounded-lg bg-slate-800/80 px-2 py-1 text-[11px] text-slate-400 ring-1 ring-white/10 break-words [overflow-wrap:anywhere]">
        Retracted {d}
      </span>
    </div>
  );
}
