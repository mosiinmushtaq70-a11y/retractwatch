"use client";

import { useMemo, useState, useCallback, memo } from "react";
import type { ReactNode } from "react";
import type { CitationRow } from "@/lib/citationRow";

type Props = {
  citations: CitationRow[] | undefined | null;
  highlightId: string | null;
};

<<<<<<< HEAD
/** Above this count we default to summary cards (faster scan); user can open full graph. */
const SUMMARY_THRESHOLD = 24;
=======
const SUMMARY_THRESHOLD = 10;
/** Cap SVG dot nodes so large bibliographies stay interactive (graph view only). */
const MAX_GRAPH_DOT_NODES = 96;
>>>>>>> 747d616 (fix: exclude CSV from build bundle)

/** Graph layout: ~2× prior spacing (no d3 in project — approximates larger collide radius). */
const COLS_FLAG = 2;
const MARGIN_X = 24;
const ROW_STEP_FLAG = 68;
const NODE_W_FLAG = 156;
const NODE_H_FLAG = 58;
const HUB_BOTTOM = 58;
const DOT_R = 4;
const DOT_GAP = 22;

type LegendKey = "clean" | "retracted" | "cascade" | "unverified";

type BandStyle = {
  fill: string;
  stroke: string;
  text: string;
  subtext: string;
  bus: string;
  drop: string;
};

const STYLES: Record<string, BandStyle> = {
  retracted: {
    fill: "fill-red-950/80",
    stroke: "stroke-red-400/55",
    text: "fill-red-50",
    subtext: "fill-red-200/80",
    bus: "rgba(248,113,113,0.35)",
    drop: "rgba(248,113,113,0.32)",
  },
  cascade: {
    fill: "fill-orange-950/80",
    stroke: "stroke-orange-400/50",
    text: "fill-orange-50",
    subtext: "fill-orange-200/75",
    bus: "rgba(251,146,60,0.32)",
    drop: "rgba(251,146,60,0.28)",
  },
  clean: {
    fill: "fill-emerald-950/55",
    stroke: "stroke-emerald-500/40",
    text: "fill-emerald-50",
    subtext: "fill-emerald-200/70",
    bus: "rgba(52,211,153,0.22)",
    drop: "rgba(148,163,184,0.22)",
  },
  unverified: {
    fill: "fill-amber-950/65",
    stroke: "stroke-amber-400/45",
    text: "fill-amber-50",
    subtext: "fill-amber-200/75",
    bus: "rgba(251,191,36,0.28)",
    drop: "rgba(251,191,36,0.24)",
  },
  other: {
    fill: "fill-slate-800/70",
    stroke: "stroke-slate-500/45",
    text: "fill-slate-100",
    subtext: "fill-slate-400",
    bus: "rgba(148,163,184,0.2)",
    drop: "rgba(148,163,184,0.18)",
  },
};

type RowKind = keyof typeof STYLES;

function rowKind(status: string): RowKind {
  if (status === "retracted") return "retracted";
  if (status === "cascade" || status === "cascade-unknown") return "cascade";
  if (status === "clean") return "clean";
  if (status === "unverified") return "unverified";
  return "other";
}

function legendKeyForRow(status: string): LegendKey | "other" {
  const k = rowKind(status);
  if (k === "other") return "other";
  return k as LegendKey;
}

function passesLegendFilter(status: string, filters: Record<LegendKey, boolean>): boolean {
  const lk = legendKeyForRow(status);
  if (lk === "other") return filters.unverified;
  return filters[lk];
}

/** Two lines at word boundaries when possible. */
function titleTwoLines(raw: string, lineMax = 36): [string, string] {
  const t = (raw ?? "").trim() || "—";
  if (t.length <= lineMax) return [t, ""];
  const slice = t.slice(0, lineMax + 12);
  let cut = slice.lastIndexOf(" ", lineMax);
  if (cut < lineMax * 0.45) cut = lineMax;
  const a = t.slice(0, cut).trim();
  let b = t.slice(cut).trim();
  if (b.length > lineMax) b = `${b.slice(0, lineMax - 1)}…`;
  return [a, b];
}

function truncateOneLine(raw: string, max = 80): string {
  const t = (raw ?? "").trim() || "—";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Visible label for cascade upstream title (contamination map). */
function truncateVia(raw: string | null | undefined, max = 40): string {
  const t = (raw ?? "").trim();
  if (!t) return "—";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function originLine(c: CitationRow, kind: "retracted" | "cascade"): string {
  if (kind === "retracted") {
    const country = c.retractionCountry?.trim() || "—";
    const reason = c.retractionReason?.trim() || "Retraction recorded";
    return `${country} · ${reason}`;
  }
  const country = c.retractionCountry?.trim() || "—";
  const via = c.cascadeVia?.trim() || "Downstream of retracted literature";
  return `${country} · ${via}`;
}

type PlacedFlagged = {
  citation: CitationRow;
  x: number;
  y: number;
  kind: "retracted" | "cascade";
};

type PlacedDot = {
  citation: CitationRow;
  x: number;
  y: number;
  kind: RowKind;
};

function layoutFlaggedBand(
  items: { citation: CitationRow; kind: "retracted" | "cascade" }[],
  startY: number,
  viewW: number,
  hubCx: number,
): { nodes: PlacedFlagged[]; bandBottom: number; busY: number; busLeft: number; busRight: number } {
  const innerW = viewW - 2 * MARGIN_X;
  const cellW = innerW / COLS_FLAG;
  const busY = startY - 8;
  const nodes: PlacedFlagged[] = items.map(({ citation, kind }, i) => {
    const col = i % COLS_FLAG;
    const row = Math.floor(i / COLS_FLAG);
    const x = MARGIN_X + col * cellW + cellW / 2;
    const y = startY + row * ROW_STEP_FLAG;
    return { citation, x, y, kind };
  });
  const xs = nodes.map((n) => n.x);
  const busLeft = Math.min(...xs, hubCx) - 12;
  const busRight = Math.max(...xs, hubCx) + 12;
  const rows = Math.ceil(items.length / COLS_FLAG) || 1;
  const bandBottom = startY + rows * ROW_STEP_FLAG + 8;
  return { nodes, bandBottom, busY, busLeft, busRight };
}

function layoutDots(
  items: CitationRow[],
  kinds: RowKind[],
  startY: number,
  viewW: number,
): { dots: PlacedDot[]; bottom: number } {
  if (items.length === 0) return { dots: [], bottom: startY };
  const perRow = Math.max(1, Math.floor((viewW - 2 * MARGIN_X) / DOT_GAP));
  const dots: PlacedDot[] = [];
  items.forEach((citation, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const rowW = Math.min(perRow, items.length - row * perRow) * DOT_GAP;
    const offsetX = (viewW - rowW) / 2 + DOT_GAP / 2;
    const x = offsetX + col * DOT_GAP;
    const y = startY + row * DOT_GAP;
    dots.push({ citation, x, y, kind: kinds[i]! });
  });
  const rows = Math.ceil(items.length / perRow);
  return { dots, bottom: startY + rows * DOT_GAP + 12 };
}

const DEFAULT_FILTERS: Record<LegendKey, boolean> = {
  clean: true,
  retracted: true,
  cascade: true,
  unverified: true,
};

function LegendBar(props: {
  counts: Record<LegendKey, number>;
  filters: Record<LegendKey, boolean>;
  onToggle: (k: LegendKey) => void;
}) {
  const { counts, filters, onToggle } = props;
  const chips: { key: LegendKey; dot: string; label: string }[] = [
    { key: "clean", dot: "🟢", label: "Clean" },
    { key: "retracted", dot: "🔴", label: "Retracted" },
    { key: "cascade", dot: "🟠", label: "Cascade" },
    { key: "unverified", dot: "⚪", label: "Unverified" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Filter
      </span>
      {chips.map(({ key, dot, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          className={`rounded-lg border px-2.5 py-1 text-left text-[11px] transition-colors ${
            filters[key]
              ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
              : "border-white/5 bg-transparent text-slate-500 opacity-60 line-through decoration-slate-500"
          }`}
          aria-pressed={filters[key]}
        >
          <span className="mr-1">{dot}</span>
          {label}{" "}
          <span className="text-slate-400">({counts[key]})</span>
        </button>
      ))}
    </div>
  );
}

function SummaryView(props: {
  clean: CitationRow[];
  retracted: CitationRow[];
  cascade: CitationRow[];
  unverified: CitationRow[];
  filters: Record<LegendKey, boolean>;
  onToggle: (k: LegendKey) => void;
  onRequestGraph?: () => void;
}) {
  const { clean, retracted, cascade, unverified, filters, onToggle, onRequestGraph } =
    props;

  const flaggedRows = useMemo(() => {
    const rows: { c: CitationRow; kind: "retracted" | "cascade" }[] = [];
    if (filters.retracted) retracted.forEach((c) => rows.push({ c, kind: "retracted" }));
    if (filters.cascade) cascade.forEach((c) => rows.push({ c, kind: "cascade" }));
    return rows;
  }, [retracted, cascade, filters.retracted, filters.cascade]);

  const counts: Record<LegendKey, number> = {
    clean: clean.length,
    retracted: retracted.length,
    cascade: cascade.length,
    unverified: unverified.length,
  };

  return (
    <>
      {onRequestGraph ? (
        <div className="flex justify-center border-b border-white/5 px-4 py-3">
          <button
            type="button"
            onClick={onRequestGraph}
            className="rounded-lg border border-blue-500/40 bg-blue-950/30 px-4 py-2 text-xs font-medium text-blue-200 transition hover:border-blue-400/60 hover:bg-blue-950/50"
          >
            Show hub-and-spoke graph
          </button>
        </div>
      ) : null}
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-4">
          <div className="text-2xl">🟢</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-100">
            {clean.length}
          </div>
          <div className="text-xs font-medium text-emerald-200/80">Clean</div>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-950/45 px-4 py-4">
          <div className="text-2xl">🔴</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-red-100">
            {retracted.length}
          </div>
          <div className="text-xs font-medium text-red-200/80">Retracted</div>
        </div>
        <div className="rounded-xl border border-orange-500/30 bg-orange-950/40 px-4 py-4">
          <div className="text-2xl">🟠</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-orange-100">
            {cascade.length}
          </div>
          <div className="text-xs font-medium text-orange-200/80">Cascade</div>
        </div>
      </div>

      <div className="px-4 pb-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Flagged citations
        </h3>
        {flaggedRows.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            No flagged citations match the current filters.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {flaggedRows.map(({ c, kind }) => (
              <li
                key={c.id}
                className={`rounded-lg border border-white/10 bg-slate-900/50 py-2.5 pl-3 pr-3 ${
                  kind === "retracted"
                    ? "border-l-4 border-l-red-500"
                    : "border-l-4 border-l-orange-500"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      kind === "retracted"
                        ? "bg-red-500/20 text-red-200"
                        : "bg-orange-500/20 text-orange-200"
                    }`}
                  >
                    {kind === "retracted" ? "Retracted" : "Cascade"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium leading-snug text-slate-100">
                  {truncateOneLine(c.title, 100)}
                </p>
                {kind === "cascade" ? (
                  <p
                    className="mt-1 text-[10px] text-slate-500"
                    title={
                      c.cascadeVia?.trim()
                        ? `Via: ${c.cascadeVia.trim()}`
                        : undefined
                    }
                  >
                    Via: {truncateVia(c.cascadeVia, 40)}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-slate-400">
                  <span className="text-slate-500">Origin: </span>
                  {originLine(c, kind)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-center text-[11px] text-slate-500">
          {clean.length} clean {clean.length === 1 ? "citation" : "citations"} not shown — view in
          citation feed
        </p>
      </div>

      <LegendBar counts={counts} filters={filters} onToggle={onToggle} />
    </>
  );
}

function listSecondaryLine(c: CitationRow): string {
  const k = rowKind(c.status);
  if (k === "retracted")
    return originLine(c, "retracted");
  if (k === "cascade") return originLine(c, "cascade");
  if (k === "unverified" || k === "other")
    return "Metadata or DOI could not be fully verified";
  return "No integrity flags";
}

function SmallCitationList(props: {
  citations: CitationRow[];
  filters: Record<LegendKey, boolean>;
}) {
  const rows = useMemo(
    () => props.citations.filter((c) => passesLegendFilter(c.status, props.filters)),
    [props.citations, props.filters],
  );

  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-xs text-slate-500">
        No citations match the current filters.
      </p>
    );
  }

  return (
    <ul className="max-h-[min(420px,55vh)] space-y-2 overflow-y-auto px-4 py-3">
      {rows.map((c) => {
        const k = rowKind(c.status);
        const border =
          k === "retracted"
            ? "border-l-red-500"
            : k === "cascade"
              ? "border-l-orange-500"
              : k === "unverified" || k === "other"
                ? "border-l-amber-500/80"
                : "border-l-emerald-600/70";
        const badge =
          k === "retracted"
            ? "bg-red-500/20 text-red-200"
            : k === "cascade"
              ? "bg-orange-500/20 text-orange-200"
              : k === "unverified" || k === "other"
                ? "bg-amber-500/20 text-amber-200"
                : "bg-emerald-500/15 text-emerald-200";
        const label =
          k === "retracted"
            ? "Retracted"
            : k === "cascade"
              ? "Cascade"
              : k === "unverified"
                ? "Unverified"
                : k === "other"
                  ? "Other"
                  : "Clean";
        return (
          <li
            key={c.id}
            className={`rounded-lg border border-white/10 border-l-4 bg-slate-900/50 py-2.5 pl-3 pr-3 ${border}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badge}`}
              >
                {label}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium leading-snug text-slate-100">
              {truncateOneLine(c.title, 96)}
            </p>
            {k === "cascade" ? (
              <p
                className="mt-1 text-[10px] text-slate-500"
                title={
                  c.cascadeVia?.trim() ? `Via: ${c.cascadeVia.trim()}` : undefined
                }
              >
                Via: {truncateVia(c.cascadeVia, 40)}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-slate-400">
              <span className="text-slate-500">Origin: </span>
              {listSecondaryLine(c)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

const CompactGraphView = memo(function CompactGraphView(props: {
  retracted: CitationRow[];
  cascade: CitationRow[];
  clean: CitationRow[];
  unverified: CitationRow[];
  other: CitationRow[];
  filters: Record<LegendKey, boolean>;
  highlightId: string | null;
}) {
  const { retracted, cascade, clean, unverified, other, filters, highlightId } = props;

  const graph = useMemo(() => {
    const viewW = 560;
    const hubCx = viewW / 2;

    const flaggedItems: { citation: CitationRow; kind: "retracted" | "cascade" }[] = [];
    if (filters.retracted) retracted.forEach((c) => flaggedItems.push({ citation: c, kind: "retracted" }));
    if (filters.cascade) cascade.forEach((c) => flaggedItems.push({ citation: c, kind: "cascade" }));

    const dotItems: CitationRow[] = [];
    const dotKinds: RowKind[] = [];
    const pushDots = (arr: CitationRow[], kind: RowKind) => {
      arr.forEach((c) => {
        dotItems.push(c);
        dotKinds.push(kind);
      });
    };
    if (filters.clean) pushDots(clean, "clean");
    if (filters.unverified) {
      pushDots(unverified, "unverified");
      pushDots(other, "other");
    }

    const totalDotSources = dotItems.length;
    let dotsOverflow = 0;
    if (dotItems.length > MAX_GRAPH_DOT_NODES) {
      dotsOverflow = dotItems.length - MAX_GRAPH_DOT_NODES;
      dotItems.length = MAX_GRAPH_DOT_NODES;
      dotKinds.length = MAX_GRAPH_DOT_NODES;
    }

    const startFlaggedY = 96;
    let cursorY = startFlaggedY;
    let busGeom: {
      busY: number;
      busLeft: number;
      busRight: number;
      nodes: PlacedFlagged[];
    } | null = null;

    if (flaggedItems.length > 0) {
      const laid = layoutFlaggedBand(flaggedItems, cursorY, viewW, hubCx);
      busGeom = {
        busY: laid.busY,
        busLeft: laid.busLeft,
        busRight: laid.busRight,
        nodes: laid.nodes,
      };
      cursorY = laid.bandBottom + 20;
    }

    const dotsLabelY = cursorY - 10;
    const { dots: placedDots, bottom } = layoutDots(dotItems, dotKinds, cursorY, viewW);
    const footerPad = 20;
    const viewH = Math.max(200, bottom + footerPad);

    const segs: ReactNode[] = [];
    if (busGeom && busGeom.nodes.length > 0) {
      segs.push(
        <line
          key="spine"
          x1={hubCx}
          y1={HUB_BOTTOM}
          x2={hubCx}
          y2={busGeom.busY}
          stroke="rgba(148,163,184,0.4)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />,
      );
      segs.push(
        <line
          key="bus"
          x1={busGeom.busLeft}
          y1={busGeom.busY}
          x2={busGeom.busRight}
          y2={busGeom.busY}
          stroke="rgba(251,191,36,0.35)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />,
      );
      busGeom.nodes.forEach((n) => {
        const st = STYLES[n.kind];
        const midY = n.y + NODE_H_FLAG / 2;
        const hi = highlightId === n.citation.id;
        segs.push(
          <line
            key={`drop-${n.citation.id}`}
            x1={n.x}
            y1={busGeom.busY}
            x2={n.x}
            y2={midY}
            stroke={st.drop}
            strokeWidth={hi ? 2.4 : 1.5}
            strokeLinecap="round"
            opacity={hi ? 1 : 0.92}
          />,
        );
      });
    }

    const dotCircles = placedDots.map((d) => {
      const hi = highlightId === d.citation.id;
      return (
        <circle
          key={`dot-${d.citation.id}`}
          cx={d.x}
          cy={d.y}
          r={hi ? DOT_R + 1.5 : DOT_R}
          className={
            hi
              ? "fill-sky-400/80 stroke-sky-200/60"
              : "fill-slate-500/55 stroke-slate-400/35"
          }
          strokeWidth={hi ? 1.25 : 0.75}
        />
      );
    });

    const flaggedGroups =
      busGeom && busGeom.nodes.length > 0
        ? busGeom.nodes.map((n) => {
            const st = STYLES[n.kind];
            const cid = n.citation.id;
            const hi = highlightId === cid;
            const nx = n.x - NODE_W_FLAG / 2;
            const [line1, line2] = titleTwoLines(n.citation.title);
            const viaFull = (n.citation.cascadeVia ?? "").trim();
            const viaTip = viaFull ? `Via: ${viaFull}` : "Via: unknown upstream";
            return (
              <g key={cid} filter="url(#cg-node-shadow)">
                {n.kind === "cascade" ? <title>{viaTip}</title> : null}
                <rect
                  x={nx}
                  y={n.y}
                  width={NODE_W_FLAG}
                  height={NODE_H_FLAG}
                  rx="10"
                  className={`${st.fill} ${st.stroke} ${hi ? "stroke-white/55" : ""}`}
                  strokeWidth={hi ? 2.4 : 1.2}
                />
                <text
                  x={n.x}
                  y={n.y + 14}
                  textAnchor="middle"
                  className={`${st.text} text-[8.5px] leading-tight`}
                >
                  {line1}
                </text>
                {line2 ? (
                  <text
                    x={n.x}
                    y={n.y + 25}
                    textAnchor="middle"
                    className={`${st.text} text-[8.5px] leading-tight`}
                  >
                    {line2}
                  </text>
                ) : null}
                {n.kind === "cascade" ? (
                  <text
                    x={n.x}
                    y={n.y + (line2 ? 36 : 28)}
                    textAnchor="middle"
                    className="fill-orange-200/75 text-[6.5px] leading-tight"
                  >
                    {`Via: ${truncateVia(n.citation.cascadeVia, 40)}`}
                  </text>
                ) : null}
                <text
                  x={n.x}
                  y={n.y + (n.kind === "cascade" ? 50 : 46)}
                  textAnchor="middle"
                  className={`${st.subtext} text-[7px] font-bold uppercase tracking-wide`}
                >
                  {n.kind === "retracted" ? "Retracted" : "CASCADE"}
                </text>
              </g>
            );
          })
        : null;

    const otherDotsLabel =
      placedDots.length > 0 ? (
        <text
          x={MARGIN_X}
          y={dotsLabelY}
          className="fill-slate-500 text-[9px] font-semibold uppercase tracking-[0.12em]"
        >
          Other citations ({placedDots.length}
          {dotsOverflow > 0 ? ` of ${totalDotSources}` : ""})
          {dotsOverflow > 0 ? " — cap for performance" : ""}
        </text>
      ) : null;

    const flaggedLabel =
      busGeom && busGeom.nodes.length > 0 ? (
        <text
          x={MARGIN_X}
          y={busGeom.busY - 14}
          className="fill-slate-400 text-[9px] font-semibold uppercase tracking-[0.12em]"
        >
          Flagged ({busGeom.nodes.length})
        </text>
      ) : null;

    return {
      viewW,
      viewH,
      hubCx,
      segs,
      dotCircles,
      flaggedGroups,
      otherDotsLabel,
      flaggedLabel,
    };
  }, [
    retracted,
    cascade,
    clean,
    unverified,
    other,
    filters,
    highlightId,
  ]);

  return (
    <div className="relative overflow-auto p-2 sm:p-4">
      <svg
        viewBox={`0 0 ${graph.viewW} ${graph.viewH}`}
        className="min-h-[280px] w-full"
        preserveAspectRatio="xMidYMin meet"
        role="img"
        aria-label="Citation contamination graph"
      >
        <defs>
          <filter id="cg-node-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="2"
              floodColor="#000"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        <g filter="url(#cg-node-shadow)">
          <rect
            x={graph.hubCx - 72}
            y="10"
            width="144"
            height="48"
            rx="14"
            className="fill-amber-50/[0.12] stroke-amber-200/55"
            strokeWidth="1.5"
          />
          <text
            x={graph.hubCx}
            y="38"
            textAnchor="middle"
            className="fill-amber-50 text-[12px] font-semibold"
          >
            Your manuscript
          </text>
        </g>

        <g>{graph.segs}</g>

        {graph.flaggedLabel}
        {graph.otherDotsLabel}
        {graph.dotCircles}
        {graph.flaggedGroups}
      </svg>
    </div>
  );
});

export function CascadeGraph({ citations, highlightId }: Props) {
  const list = useMemo(() => citations ?? [], [citations]);
  const [panel, setPanel] = useState<"graph" | "list">("graph");
  const [showGraphDespiteSummary, setShowGraphDespiteSummary] = useState(false);
  const [filters, setFilters] = useState<Record<LegendKey, boolean>>(() => ({
    ...DEFAULT_FILTERS,
  }));

  const toggleFilter = useCallback((k: LegendKey) => {
    setFilters((f) => ({ ...f, [k]: !f[k] }));
  }, []);

  const { retracted, cascade, clean, unverified, other } = useMemo(() => {
    const r: CitationRow[] = [];
    const c: CitationRow[] = [];
    const cl: CitationRow[] = [];
    const u: CitationRow[] = [];
    const o: CitationRow[] = [];
    for (const row of list) {
      const s = row?.status ?? "";
      if (s === "retracted") r.push(row);
      else if (s === "cascade" || s === "cascade-unknown") c.push(row);
      else if (s === "clean") cl.push(row);
      else if (s === "unverified") u.push(row);
      else o.push(row);
    }
    return { retracted: r, cascade: c, clean: cl, unverified: u, other: o };
  }, [list]);

  const legendCounts: Record<LegendKey, number> = useMemo(
    () => ({
      clean: clean.length,
      retracted: retracted.length,
      cascade: cascade.length,
      unverified: unverified.length + other.length,
    }),
    [clean, retracted, cascade, unverified, other],
  );

  const isLargeList = list.length > SUMMARY_THRESHOLD;
  const isSummary = isLargeList && !showGraphDespiteSummary;

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-md">
      <div className="border-b border-white/10 p-4">
        <h2 className="text-sm font-semibold text-white">Contamination map</h2>
        <p className="text-xs text-slate-400">
          {isSummary
            ? "Summary for large reference lists — key counts and flagged items only."
            : "Hub links only to retracted or cascade citations; other references appear as dots."}
        </p>
        {!isSummary && list.length > 0 ? (
          <div className="mt-3 inline-flex rounded-lg border border-white/10 bg-slate-900/60 p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setPanel("graph")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                panel === "graph"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Graph view
            </button>
            <button
              type="button"
              onClick={() => setPanel("list")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                panel === "list"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              List view
            </button>
          </div>
        ) : null}
      </div>

      {list.length === 0 ? (
        <p className="flex-1 px-4 py-8 text-center text-sm text-slate-500">No citations yet.</p>
      ) : isSummary ? (
        <SummaryView
          clean={clean}
          retracted={retracted}
          cascade={cascade}
          unverified={unverified}
          filters={filters}
          onToggle={toggleFilter}
          onRequestGraph={() => setShowGraphDespiteSummary(true)}
        />
      ) : panel === "graph" ? (
        <CompactGraphView
          retracted={retracted}
          cascade={cascade}
          clean={clean}
          unverified={unverified}
          other={other}
          filters={filters}
          highlightId={highlightId}
        />
      ) : (
        <SmallCitationList citations={list} filters={filters} />
      )}

      {!isSummary && list.length > 0 ? (
        <LegendBar counts={legendCounts} filters={filters} onToggle={toggleFilter} />
      ) : null}
    </div>
  );
}
