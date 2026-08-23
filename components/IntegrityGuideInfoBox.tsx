"use client";

import { useState } from "react";

export function IntegrityGuideInfoBox() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--rw-card)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-sm font-semibold text-blue-400">
            ℹ️
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-white">
              Understanding Integrity Statuses & Downstream Risk
            </h3>
            <p className="text-xs text-slate-400">
              How RetractWatch classifies citations and citation propagation in your bibliography
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          {isOpen ? "Collapse guide" : "Expand guide"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 grid gap-3 pt-3 border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Retracted */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 transition hover:border-red-500/35 hover:bg-red-500/10">
            <div className="flex items-center gap-1.5 font-semibold text-red-400 text-xs uppercase tracking-wider">
              <span>🔴</span>
              <span>Retracted Citation</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Formally retracted or withdrawn by the journal/publisher due to data fabrication, ethical non-compliance, or major errors. Should be removed or cited only in historical/corrective context.
            </p>
          </div>

          {/* Cascade */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 transition hover:border-amber-500/35 hover:bg-amber-500/10">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400 text-xs uppercase tracking-wider">
              <span>🟠</span>
              <span>Cascade Risk</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              The paper itself is not retracted, but builds directly upon an upstream retracted study in its references. Citing it carries risk of inheriting flawed evidence or tainted methodology.
            </p>
          </div>

          {/* Unverified */}
          <div className="rounded-xl border border-slate-600/30 bg-slate-800/30 p-3.5 transition hover:border-slate-500/40 hover:bg-slate-800/50">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-xs uppercase tracking-wider">
              <span>⚪</span>
              <span>Unverified (No DOI)</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Could not be matched to an official CrossRef registry entry (e.g. non-indexed report, book chapter, or missing DOI). Check the CrossRef search link to verify manually.
            </p>
          </div>

          {/* Clean */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 transition hover:border-emerald-500/35 hover:bg-emerald-500/10">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400 text-xs uppercase tracking-wider">
              <span>🟢</span>
              <span>Clean Verified</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Matched in the CrossRef scientific registry with 0 retractions in the Retraction Watch index and no detected upstream citation contamination. Safe to cite.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
