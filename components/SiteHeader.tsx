import Link from "next/link";

function TalosLogo() {
  return (
    <span
      className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/15 bg-gradient-to-br from-slate-900 via-blue-950/70 to-slate-900 shadow-[0_0_28px_rgba(37,99,235,0.22)] transition group-hover:border-blue-300/60"
      aria-hidden
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(96,165,250,0.25),transparent_50%)]" />
      <svg viewBox="0 0 24 24" className="relative h-6 w-6" fill="none">
        <circle
          cx="12"
          cy="12"
          r="8.4"
          className="stroke-blue-200/65"
          strokeWidth="1.05"
          strokeDasharray="1.4 1.8"
        />
        <path
          d="M5.2 12a6.8 6.8 0 0 1 13.6 0"
          className="stroke-cyan-300/90"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M12 3.8v4.1M12 16.1v4.1"
          className="stroke-blue-100/70"
          strokeWidth="1.05"
          strokeLinecap="round"
        />
        <path
          d="M12 7.2l4 1.5v3.1c0 3.1-1.7 5.3-4 6.3-2.3-1-4-3.2-4-6.3V8.7l4-1.5z"
          className="fill-blue-300/15 stroke-blue-200/85"
          strokeWidth="1.05"
        />
        <path
          d="M10.2 11.7l1.45 1.45 2.25-2.55"
          className="stroke-emerald-300/95"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-white/[0.06] bg-slate-950/40 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <TalosLogo />
          <div className="min-w-0 text-left">
            <p className="font-[family-name:var(--font-instrument)] text-lg tracking-tight text-white sm:text-xl">
              RetractWatch
            </p>
            <p className="truncate text-[11px] text-slate-500 sm:text-xs">
              Research integrity intelligence
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
          <p className="hidden text-right text-[10px] leading-tight text-slate-500 sm:block sm:max-w-[220px]">
            We cross-check your bibliography against Retraction Watch, CrossRef, and
            Semantic Scholar — not a list you upload.
          </p>
          <div
            className="flex max-w-[140px] flex-col items-end gap-0.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 sm:max-w-none sm:flex-row sm:items-center sm:gap-2 sm:px-3"
            title="Public Retraction Watch index (~57K records). Your references are matched against this database."
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              V2
            </span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" aria-hidden />
            <span className="text-right text-[10px] leading-tight text-slate-500">
              RW index · 57K+ records
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
