import Link from "next/link";

function RetractWatchLogo() {
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
          <RetractWatchLogo />
          <div className="min-w-0 text-left">
            <p className="font-[family-name:var(--font-instrument)] text-lg tracking-tight text-white sm:text-xl">
              RetractWatch
            </p>
            <p className="truncate text-[11px] text-slate-500 sm:text-xs">
              Research integrity intelligence
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <p className="hidden text-right text-xs leading-tight text-slate-400 sm:block">
            Free & Open Source
            <span className="block text-[11px] text-slate-500">Contributions & PRs welcome</span>
          </p>
          <a
            href="https://github.com/mosinmushtaq/retractwatch"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white shadow-sm transition hover:border-blue-400/50 hover:bg-blue-500/10 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]"
          >
            <svg
              className="h-4 w-4 fill-current text-slate-300 transition group-hover:text-white"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span className="flex items-center gap-1 font-semibold text-slate-200 group-hover:text-white">
              <span>⭐ Star & Contribute</span>
              <span className="text-[10px] text-slate-400 group-hover:text-blue-300">↗</span>
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}
