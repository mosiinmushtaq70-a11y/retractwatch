"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CitationRow } from "@/lib/citationRow";
import { OriginBadge } from "./OriginBadge";

type Props = {
  citations: CitationRow[] | undefined | null;
  /** Keeps contamination map highlight in sync when user picks a row. */
  onSelectedCitationChange?: (id: string | null) => void;
};

const statusStyle: Record<string, string> = {
  pending: "bg-slate-700/50 text-slate-300 ring-slate-500/20",
  checking: "bg-blue-950/60 text-blue-200 ring-blue-500/30",
  clean: "bg-emerald-950/50 text-emerald-200 ring-emerald-500/25",
  retracted: "bg-red-950/60 text-red-200 ring-red-500/35",
  cascade: "bg-orange-950/50 text-orange-200 ring-orange-500/30",
  "cascade-unknown": "bg-violet-950/50 text-violet-200 ring-violet-500/35",
  unverified: "bg-slate-800/60 text-slate-400 ring-slate-500/25",
};

function statusLabel(s: string | undefined | null) {
  const v = s ?? "pending";
  if (v === "cascade") return "CASCADE";
  if (v === "cascade-unknown") return "CASCADE?";
  if (v === "unverified") return "UNVERIFIED ❓";
  return v;
}

export function CitationFeed({
  citations,
  onSelectedCitationChange,
}: Props) {
  const list = useMemo(() => citations ?? [], [citations]);
  const [filter, setFilter] = useState<string | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const flaggedCitations = useMemo(
    () => list.filter((c) => c?.status === "retracted" || c?.status === "cascade"),
    [list],
  );

  const flaggedIds = useMemo(
    () => flaggedCitations.map((c) => c.id) as Id<"citations">[],
    [flaggedCitations],
  );

  const queryCitationId = useMemo(() => {
    if (!selectedId) return null;
    const row = list.find((x) => (x?.id ?? "") === selectedId);
    const st = row?.status ?? "";
    if (st !== "retracted" && st !== "cascade") return null;
    return selectedId;
  }, [selectedId, list]);

  const replacements = useQuery(
    api.replacements.getReplacementsForCitation,
    queryCitationId ? { citationId: queryCitationId as Id<"citations"> } : "skip",
  );

  const allReplacements = useQuery(
    api.replacements.getReplacementsForCitations,
    showAllSuggestions && flaggedIds.length > 0
      ? { citationIds: flaggedIds }
      : "skip",
  );

  const selectRow = (id: string | null) => {
    setSelectedId(id);
    onSelectedCitationChange?.(id);
  };

  const handleToggleAllSuggestions = () => {
    const next = !showAllSuggestions;
    setShowAllSuggestions(next);
    if (next && flaggedCitations.length > 0) {
      selectRow(flaggedCitations[0].id);
    }
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of list) {
      const st = c?.status ?? "pending";
      m[st] = (m[st] ?? 0) + 1;
    }
    return m;
  }, [list]);

  const filtered =
    filter === "all"
      ? list
      : list.filter((c) => (c?.status ?? "pending") === filter);

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-white/10 bg-[var(--rw-card)] backdrop-blur-md">
      <div className="border-b border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Citation feed</h2>
            <p className="text-xs text-slate-400">
              {list.length} reference{list.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", list.length],
                ["retracted", counts.retracted ?? 0],
                ["cascade", counts.cascade ?? 0],
                ["cascade-unknown", counts["cascade-unknown"] ?? 0],
                ["clean", counts.clean ?? 0],
                ["unverified", counts.unverified ?? 0],
              ] as const
            ).map(([key, n]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  filter === key
                    ? "bg-blue-500/25 text-blue-100 ring-1 ring-blue-400/40"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                }`}
              >
                {key === "all"
                  ? "All"
                  : key === "cascade-unknown"
                    ? "Casc.?"
                    : key}{" "}
                <span className="text-slate-500">({n})</span>
              </button>
            ))}
          </div>
        </div>

        {flaggedCitations.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleToggleAllSuggestions}
              className="rounded-md border border-blue-500/50 px-3 py-1.5 text-[11px] font-medium text-blue-400 transition hover:border-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
            >
              {showAllSuggestions
                ? "Hide Suggestions"
                : "🔍 Get All Replacement Suggestions"}
            </button>
          </div>
        )}
      </div>

      {showAllSuggestions && (
        <div className="border-b border-white/10 bg-slate-950/60 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-blue-300/80">
            All Replacement Suggestions · Powered by Exa AI
          </p>
          {allReplacements === undefined ? (
            <p className="text-xs text-slate-500">Loading suggestions…</p>
          ) : flaggedCitations.length === 0 ? (
            <p className="text-xs text-slate-500">No flagged citations to suggest replacements for.</p>
          ) : (
            <div className="space-y-3">
              {flaggedCitations.map((c) => {
                const citReps = (allReplacements ?? []).filter(
                  (r) => r.citationId === c.id,
                );
                return (
                  <div key={c.id}>
                    <p className="text-[11px] font-medium text-slate-300 truncate">
                      {c.title?.trim() ? c.title : "—"}
                    </p>
                    {citReps.length === 0 ? (
                      <p className="ml-3 text-[11px] text-slate-600">└ No replacements found yet.</p>
                    ) : (
                      <div className="ml-3 mt-0.5 space-y-0.5">
                        <span className="text-[10px] text-slate-500">└ Suggested: </span>
                        {citReps.map((r, i) => (
                          <span key={r._id}>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-400 hover:underline"
                            >
                              {r.title}
                            </a>
                            {i < citReps.length - 1 ? (
                              <span className="text-slate-600">, </span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ul className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
        {filtered.map((c, i) => {
          const id = c?.id ?? `row-${i}`;
          const st = c?.status ?? "pending";
          const active = selectedId === id;
          const pillClass = statusStyle[st] ?? statusStyle.pending;
          const showReplacementBlock =
            active && (st === "retracted" || st === "cascade");

          return (
            <li key={id} className="overflow-hidden rounded-xl">
              <button
                type="button"
                onClick={() => selectRow(active ? null : id)}
                className={`w-full rounded-xl border text-left transition ${
                  active
                    ? "border-blue-400/50 bg-blue-500/10 shadow-[0_0_24px_rgba(59,130,246,0.12)]"
                    : "border-white/10 bg-slate-950/40 hover:border-white/20 hover:bg-slate-900/50"
                } ${showReplacementBlock ? "rounded-b-none border-b-0" : ""}`}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <div className="flex gap-3 p-3 sm:p-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-mono text-slate-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${pillClass}`}
                        title={
                          st === "cascade"
                            ? "This citation is clean but cites a retracted paper — indirect contamination detected"
                            : st === "unverified"
                              ? "This citation could not be matched to a DOI. It may still be valid — please verify manually."
                              : undefined
                        }
                      >
                        {statusLabel(st)}
                      </span>
                      {c?.doi ? (
                        <span className="truncate font-mono text-[10px] text-slate-500">
                          {c.doi}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-500/90">
                          No DOI
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-slate-100">
                      {c?.title?.trim() ? c.title : "—"}
                    </p>
                    {st === "unverified" && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Could not verify — no DOI found.{" "}
                        <a
                          href={`https://search.crossref.org/?q=${encodeURIComponent(c?.title ?? "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          Search CrossRef →
                        </a>
                      </p>
                    )}
                    {c?.status === "cascade" && c?.cascadeVia && (
                      <p className="mt-1 text-xs text-orange-400">
                        ↳ Cites retracted: {c.cascadeVia}
                      </p>
                    )}
                    {st === "cascade-unknown" ? (
                      <p className="mt-1 border-l-2 border-violet-600/40 pl-3 text-[11px] leading-snug text-violet-200/80">
                        ↳ Cascade check inconclusive:{" "}
                        <span className="text-violet-100/90">
                          {(c?.cascadeVia ?? "").trim() || "—"}
                        </span>
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {c?.authors?.trim() ? c.authors : "—"}
                      {c?.year != null ? ` · ${c.year}` : ""}
                    </p>
                    {(st === "retracted" || st === "cascade") &&
                    (c?.retractionCountry || c?.retractionJournal) ? (
                      <OriginBadge
                        country={c?.retractionCountry}
                        journal={c?.retractionJournal}
                        reason={
                          c?.retractionReason ??
                          (st === "cascade"
                            ? "Cascade via retracted upstream"
                            : "Retracted")
                        }
                        retractionDate={c?.retractionDate}
                      />
                    ) : null}
                  </div>
                </div>
              </button>
              {selectedId === id &&
                (st === "retracted" || st === "cascade") && (
                  <div className="rounded-b-xl border border-t-0 border-blue-400/40 bg-slate-950/80 px-3 py-2">
                    {replacements === undefined ? (
                      <p className="text-xs text-slate-500">
                        Loading replacements…
                      </p>
                    ) : (
                      <div className="mt-2 border-t border-slate-700 pt-2">
                        <p className="mb-1 text-xs text-slate-400">
                          🔍 Suggested Replacements · Powered by Exa AI
                        </p>
                        {replacements.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No replacements stored yet — wait for analysis to
                            finish or check server / Exa logs.
                          </p>
                        ) : (
                          replacements.map((r) => (
                            <a
                              key={r._id}
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mb-1 block text-xs text-blue-400 hover:underline"
                            >
                              {r.title}
                            </a>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
