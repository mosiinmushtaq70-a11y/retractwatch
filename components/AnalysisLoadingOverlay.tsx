"use client";

type Props = {
  open: boolean;
  message: string;
  step: number;
};

const steps = [
<<<<<<< HEAD
  "Parsing bibliography…",
  "Resolving identifiers…",
  "Scanning retraction corpus…",
  "Building cascade graph…",
=======
  "Extracting bibliography from PDF…",
  "Cross-checking DOIs against Retraction Watch (~57K public records)…",
  "Detecting cascade contamination…",
  "Calculating integrity score…",
>>>>>>> 747d616 (fix: exclude CSV from build bundle)
];

export function AnalysisLoadingOverlay({ open, message, step }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/85 p-6 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-8 shadow-[0_0_80px_rgba(59,130,246,0.15)]">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/10 rw-float">
          <span className="text-2xl" aria-hidden>
            ⚗️
          </span>
        </div>
        <p className="text-center text-sm font-medium text-white">{message}</p>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, ((step + 1) / steps.length) * 100)}%` }}
          />
        </div>
        <ul className="mt-6 space-y-3 text-xs text-slate-400">
          {steps.map((s, i) => {
            const isDone = i < step;
            const isActive = i === step;
            const isPending = i > step;

            return (
              <li
                key={s}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isDone || isActive ? "text-slate-200" : "text-slate-500"
                }`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                  {isDone && (
                    <span className="block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] rw-step-done" />
                  )}
                  {isActive && (
                    <>
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
                      <span className="relative block h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.9)] rw-step-pulse" />
                    </>
                  )}
                  {isPending && (
                    <span className="block h-1.5 w-1.5 rounded-full bg-slate-600" />
                  )}
                </span>
                <span>{s}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 text-center text-[10px] text-slate-600">
          Large bibliographies may take 1–2 minutes
        </p>
      </div>
    </div>
  );
}
