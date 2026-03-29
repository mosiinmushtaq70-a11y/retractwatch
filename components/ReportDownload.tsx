"use client";

import { useCallback, useMemo } from "react";
import type { CitationRow } from "@/lib/citationRow";
import type { JobViewModel } from "@/lib/jobViewModel";
import { getScoreLabel } from "@/lib/scoreBands";

type Props = {
  job: JobViewModel | null | undefined;
  citations: CitationRow[] | undefined | null;
};

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildReportHtml(
  list: CitationRow[],
  score: number,
  label: ReturnType<typeof getScoreLabel>,
): string {
  const rows = list
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c?.title ?? "")}</td><td>${escapeHtml(c?.status ?? "")}</td><td>${escapeHtml(c?.doi ?? "—")}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>RetractWatch Report</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 22px; }
        .meta { color: #444; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; }
      </style></head><body>
      <h1>RetractWatch — Integrity report</h1>
      <p class="meta">Score: <strong>${score}</strong> — ${escapeHtml(label.label)} · ${list.length} citations · Generated ${escapeHtml(new Date().toLocaleString())}</p>
      <table><thead><tr><th>Title</th><th>Status</th><th>DOI</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
}

/** Print via hidden iframe (avoids popup blockers breaking window.open). */
function printReportHtml(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "RetractWatch report print");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    downloadReportHtml(html);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  const runPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      downloadReportHtml(html);
    }
    setTimeout(cleanup, 60_000);
  };

  requestAnimationFrame(() => {
    setTimeout(runPrint, 150);
  });
}

function downloadReportHtml(html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retractwatch-report-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.html`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Print-friendly summary — iframe print + HTML download fallback. */
export function ReportDownload({ job, citations }: Props) {
  const list = useMemo(() => citations ?? [], [citations]);
  const score = job?.integrityScore ?? 0;

  const html = useMemo(() => {
    const label = getScoreLabel(score);
    return buildReportHtml(list, score, label);
  }, [list, score]);

  const handlePrint = useCallback(() => {
    printReportHtml(html);
  }, [html]);

  const handleDownload = useCallback(() => {
    downloadReportHtml(html);
  }, [html]);

  if (!job && list.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/40 px-5 py-4">
      <div>
        <p className="text-sm font-medium text-white">Export report</p>
        <p className="text-xs text-slate-400">
          Opens the system print dialog (save as PDF). If nothing happens, use
          Download HTML and open the file, then print.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
        >
          Print / Save as PDF
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
        >
          Download HTML
        </button>
      </div>
    </div>
  );
}
