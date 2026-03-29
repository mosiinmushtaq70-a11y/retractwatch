"use client";

import { useEffect, useState } from "react";
import { getScoreLabel } from "@/lib/scoreBands";

type Props = {
  score: number | undefined;
  status: string | undefined | null;
};

/** Remount when job phase/score identity changes so gauge state resets without sync setState in an effect. */
export function IntegrityScore(props: Props) {
  const st = props.status ?? "";
  const key = `${st}\u0000${props.score ?? ""}`;
  return <IntegrityScoreInner key={key} {...props} />;
}

function IntegrityScoreInner({ score, status }: Props) {
  const [display, setDisplay] = useState(0);
  const s = score ?? 0;
  const label = getScoreLabel(s);
  const st = status ?? "";

  const isLoading = st !== "complete" && score === undefined;

  useEffect(() => {
    if (isLoading) return;
    const target = score ?? 100;
    const duration = st === "complete" ? 420 : 900;
    const start = performance.now();
    const from = 0;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, st, isLoading]);

  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (display / 100) * c;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--rw-card)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
          Integrity score
        </p>
        <div className="mt-4 flex items-center gap-6">
          <div className="relative h-[120px] w-[120px] shrink-0">
            <svg className="-rotate-90" viewBox="0 0 120 120" aria-hidden>
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke="rgba(148,163,184,0.15)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke="rgba(59,130,246,0.2)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * 0.75}
                className="rw-shimmer-stroke"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="rw-shimmer h-7 w-10 rounded-md bg-slate-700/60" />
              <div className="mt-1 rw-shimmer h-2.5 w-6 rounded bg-slate-700/40" />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="rw-shimmer h-5 w-36 rounded-md bg-slate-700/60" />
            <div className="rw-shimmer h-3.5 w-48 rounded bg-slate-700/40" />
            <div className="rw-shimmer h-3 w-32 rounded bg-slate-700/30" />
            <p className="mt-2 text-xs text-blue-300/80">Calculating…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--rw-card)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl rw-glow-pulse" />
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
        Integrity score
      </p>
      <div className="mt-4 flex items-center gap-6">
        <div className="relative h-[120px] w-[120px] shrink-0">
          <svg className="-rotate-90" viewBox="0 0 120 120" aria-hidden>
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="rgba(148,163,184,0.15)"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={label.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-[family-name:var(--font-instrument)] text-3xl text-white">
              {display}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              / 100
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-lg font-semibold tracking-tight"
            style={{ color: label.color }}
          >
            {label.label}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">
            {label.description}
          </p>
          {st !== "complete" ? (
            <p className="mt-2 text-xs text-blue-300/90">Analyzing…</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
