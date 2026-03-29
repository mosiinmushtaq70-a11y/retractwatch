"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { AnalysisLoadingOverlay } from "@/components/AnalysisLoadingOverlay";
import { hasConvexUrl } from "@/lib/convexEnv";

export default function HomePage() {
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [step, setStep] = useState(0);

  const startIntegrityJob = useCallback(
    async (citations: unknown[], paperTitle?: string) => {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citations, paperTitle }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start integrity scan");
      }
      if (!data.jobId) {
        throw new Error("No job id returned");
      }
      return data.jobId;
    },
    [],
  );

  const runPdfFlow = useCallback(
    async (file: File) => {
      setError("");
      setLoading(true);
      setStep(0);
      setLoadMsg("Extracting references from your PDF…");

      if (!hasConvexUrl()) {
        setLoading(false);
        setError(
          "Add NEXT_PUBLIC_CONVEX_URL to .env.local (your hosted backend) to run a full scan.",
        );
        return;
      }

      try {
        const fd = new FormData();
        fd.append("pdf", file);
        const ex = await fetch("/api/extract", { method: "POST", body: fd });
        const exData = (await ex.json()) as {
          citations?: unknown[];
          error?: string;
          detail?: string;
        };
        if (!ex.ok) {
          const msg = exData.error ?? "PDF extraction failed";
          const hint =
            exData.detail && process.env.NODE_ENV === "development"
              ? ` (${exData.detail})`
              : "";
          throw new Error(`${msg}${hint}`);
        }
        const citations = exData.citations;
        if (!Array.isArray(citations) || citations.length === 0) {
          throw new Error("No citations found in this PDF.");
        }

        setStep(2);
        setLoadMsg("Cross-checking DOIs, retractions, and cascades…");
        const jobId = await startIntegrityJob(citations, file.name);
        setLoadMsg("Opening your results…");
        setStep(3);
        await new Promise((r) => setTimeout(r, 400));
        router.replace(`/results/${jobId}`);
      } catch (e) {
        setLoading(false);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    },
    [router, startIntegrityJob],
  );

  const runPasteFlow = useCallback(async () => {
    setError("");
    const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      setError("Paste at least one reference line, or upload a PDF.");
      return;
    }

    if (!hasConvexUrl()) {
      setError(
        "Add NEXT_PUBLIC_CONVEX_URL to .env.local (your hosted backend) to run a full scan.",
      );
      return;
    }

    setLoading(true);
    setStep(0);
    setLoadMsg("Preparing references…");

    try {
      const citations = lines.map((line) => ({
        title: line.slice(0, 800),
        authors: "Unknown",
        year: null,
        doi: null,
      }));

      setStep(1);
      setLoadMsg("Cross-checking DOIs, retractions, and cascades…");
      const jobId = await startIntegrityJob(citations);
      setLoadMsg("Opening your results…");
      setStep(2);
      await new Promise((r) => setTimeout(r, 400));
      router.replace(`/results/${jobId}`);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, [paste, router, startIntegrityJob]);

  const onFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("PDF must be under 10MB.");
        return;
      }
      void runPdfFlow(file);
    },
    [runPdfFlow],
  );

  return (
    <>
      <AnalysisLoadingOverlay open={loading} message={loadMsg} step={step} />
      <div className="relative min-h-dvh">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
        <SiteHeader />

        <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-12">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-blue-300/80">
            RetractWatch
          </p>
          <h1 className="mt-3 text-center font-[family-name:var(--font-instrument)] text-4xl leading-tight text-white sm:text-5xl">
            Detect retracted science
            <span className="block text-slate-400 sm:mt-1">
              before your reviewers do
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-slate-400">
            Upload a PDF or paste references. We extract the bibliography, resolve
            DOIs via CrossRef, check Retraction Watch data, scan citation cascades
            via Semantic Scholar, and stream progress live from Convex.
          </p>

<<<<<<< HEAD
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Retraction Watch CSV
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Cascade visualization
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Live Convex updates
            </span>
          </div>

=======
          <main className="relative mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
            <section className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300/85">
                RetractWatch
              </p>
              <h1 className="mt-3 font-[family-name:var(--font-instrument)] text-4xl leading-tight text-white sm:text-5xl sm:leading-tight">
                Detect retracted science
                <span className="mt-1 block text-slate-400 sm:mt-2">
                  before your reviewers do
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-slate-300 sm:text-[1.05rem]">
                Upload a PDF or paste references. We extract the bibliography, resolve
                DOIs via CrossRef, match them against the Retraction Watch database
                (tens of thousands of public retraction records), scan cascades via
                Semantic Scholar, and show live progress while the scan runs.
              </p>
            </section>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {[
                "57K+ Retraction Watch records (reference index, not your upload)",
                "Cascade contamination detection",
                "Live scan progress",
              ].map((label) => (
                <span
                  key={label}
                  className="rw-stat-pill rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-xs text-slate-300"
                >
                  {label}
                </span>
              ))}
            </div>

            <section className="mt-12 sm:mt-14">
              <h2 className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                How it works
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
                {[
                  {
                    icon: "📄",
                    title: "Upload your PDF",
                    body: "Drop your manuscript or paste references — we extract the bibliography.",
                  },
                  {
                    icon: "🔍",
                    title: "We scan retraction data",
                    body: "Each resolved reference is checked against the Retraction Watch index plus CrossRef and Semantic Scholar.",
                  },
                  {
                    icon: "📊",
                    title: "Get your integrity score",
                    body: "Direct + cascade detection with replacement suggestions; results save online so you can return to them.",
                  },
                ].map((s) => (
                  <div
                    key={s.title}
                    className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-center backdrop-blur-sm"
                  >
                    <span className="text-xl sm:text-2xl" aria-hidden>
                      {s.icon}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-white">{s.title}</p>
                    <p className="mt-1.5 text-xs leading-snug text-slate-400">{s.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <p className="mt-8 text-center text-xs text-slate-500 sm:mt-10">
              Powered by{" "}
              <span className="text-slate-400">Retraction Watch</span>
              {" · "}
              <span className="text-slate-400">CrossRef</span>
              {" · "}
              <span className="text-slate-400">Semantic Scholar</span>
            </p>

            <section className="mt-6">
>>>>>>> 747d616 (fix: exclude CSV from build bundle)
          <div
            role="button"
            tabIndex={0}
            onClick={() => document.getElementById("pdf-input")?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                document.getElementById("pdf-input")?.click();
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDrag(false);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              onFile(f ?? null);
            }}
            className={`group relative mt-12 cursor-pointer select-none overflow-hidden rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
              drag
                ? "scale-[1.02] border-blue-400 bg-blue-500/10 shadow-[0_0_60px_rgba(59,130,246,0.25)]"
                : "border-slate-600/60 bg-slate-900/40 hover:scale-[1.01] hover:border-blue-400/70 hover:bg-slate-900/60 hover:shadow-[0_0_40px_rgba(59,130,246,0.12)]"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-blue-400/50 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-400/50 to-transparent" />
            </div>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              id="pdf-input"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <span
              className={`mb-3 block text-4xl transition-transform duration-300 ${drag ? "scale-110" : "group-hover:scale-110"}`}
              aria-hidden
            >
              📄
            </span>
            <span className="block font-semibold text-white">
              Drop your PDF here
            </span>
            <span className="mt-1 block text-sm text-slate-500 transition-colors duration-200 group-hover:text-slate-400">
              or click anywhere to browse · text-based PDFs work best
            </span>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-red-300">{error}</p>
          )}

          <div className="relative my-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-700" />
            <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
              or
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-700" />
          </div>

          <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
            Paste references (one per line)
          </label>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={5}
            placeholder="e.g. Smith J. Example study. Nature. 2020; doi:10.xxxx/..."
            className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          <button
            type="button"
            onClick={() => void runPasteFlow()}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-500 hover:to-blue-400"
          >
            Analyze bibliography
          </button>

        </main>

<<<<<<< HEAD
        <footer className="absolute bottom-0 left-0 right-0 border-t border-white/5 py-4 text-center text-xs text-slate-600">
          RetractWatch V2 · Talos
        </footer>
=======
              <div className="rw-demo-frame">
                <div className="rw-demo-frame-inner">
                  <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                      Demo · not your real results
                    </span>
                    <span className="rounded border border-blue-500/20 bg-blue-950/40 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-blue-400/70">
                      Preview
                    </span>
                  </div>

                  <div className="pointer-events-none select-none p-4 text-left sm:p-5">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Integrity</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0 -rotate-90" aria-hidden>
                            <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="5" />
                            <circle cx="24" cy="24" r="18" fill="none" stroke="#f87171" strokeWidth="5" strokeLinecap="round" strokeDasharray="113" strokeDashoffset="44" />
                          </svg>
                          <div>
                            <p className="text-base font-bold leading-none text-white">
                              61<span className="text-[9px] font-normal text-slate-400">/100</span>
                            </p>
                            <p className="mt-0.5 text-[8px] font-semibold uppercase text-red-300">Risk</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-red-300/80">Historical</p>
                        <p className="mt-1.5 text-[9px] font-medium leading-snug text-white">Similar to Surgisphere COVID papers</p>
                        <p className="mt-1 text-[8px] text-red-200/70">Caught after <span className="font-bold text-white">18 mo</span></p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Downstream</p>
                        <p className="mt-1.5 text-xl font-bold leading-none text-orange-300">~340</p>
                        <p className="mt-0.5 text-[8px] text-slate-400">papers at risk</p>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3 sm:gap-3">
                      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Citations</p>
                        <div className="mt-2 space-y-1.5">
                          {sampleCitations.map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.dot}`} />
                              <span className="truncate text-[8px] text-slate-300">{r.title}</span>
                              <span
                                className={`ml-auto shrink-0 rounded px-1 py-0.5 text-[7px] font-semibold uppercase ${
                                  r.label === "retracted"
                                    ? "bg-red-900/60 text-red-200"
                                    : r.label === "cascade"
                                      ? "bg-orange-900/60 text-orange-200"
                                      : "bg-emerald-900/40 text-emerald-300"
                                }`}
                              >
                                {r.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Cascade map</p>
                        <svg viewBox="0 0 120 84" className="mt-1.5 w-full" aria-hidden>
                          <rect x="40" y="3" width="40" height="13" rx="3" fill="rgba(59,130,246,0.2)" stroke="rgba(96,165,250,0.45)" strokeWidth="0.8" />
                          <text x="60" y="12" textAnchor="middle" fontSize="4.5" fill="#e2e8f0" fontWeight="600">Your paper</text>
                          <line x1="60" y1="16" x2="18" y2="34" stroke="rgba(148,163,184,0.2)" strokeWidth="0.8" />
                          <line x1="60" y1="16" x2="60" y2="34" stroke="rgba(148,163,184,0.2)" strokeWidth="0.8" />
                          <line x1="60" y1="16" x2="102" y2="34" stroke="rgba(248,113,113,0.55)" strokeWidth="1" strokeDasharray="2 1.5" />
                          <path d="M60 16 Q34 28 20 48" fill="none" stroke="rgba(251,146,60,0.5)" strokeWidth="1" />
                          <rect x="4" y="34" width="28" height="12" rx="3" fill="rgba(16,185,129,0.12)" stroke="rgba(52,211,153,0.35)" strokeWidth="0.8" />
                          <text x="18" y="42" textAnchor="middle" fontSize="4" fill="#6ee7b7">clean</text>
                          <rect x="46" y="34" width="28" height="12" rx="3" fill="rgba(16,185,129,0.12)" stroke="rgba(52,211,153,0.35)" strokeWidth="0.8" />
                          <text x="60" y="42" textAnchor="middle" fontSize="4" fill="#6ee7b7">clean</text>
                          <rect x="88" y="34" width="28" height="12" rx="3" fill="rgba(185,28,28,0.3)" stroke="rgba(248,113,113,0.55)" strokeWidth="0.8" />
                          <text x="102" y="42" textAnchor="middle" fontSize="4" fill="#fca5a5" fontWeight="600">retracted</text>
                          <rect x="6" y="50" width="28" height="12" rx="3" fill="rgba(194,65,12,0.3)" stroke="rgba(251,146,60,0.55)" strokeWidth="0.8" />
                          <text x="20" y="58" textAnchor="middle" fontSize="4" fill="#fdba74" fontWeight="600">cascade</text>
                          <line x1="34" y1="56" x2="88" y2="50" stroke="rgba(248,113,113,0.25)" strokeWidth="0.7" strokeDasharray="2 1.5" />
                          <circle cx="10" cy="76" r="2" fill="#34d399" />
                          <text x="14" y="78" fontSize="4" fill="#64748b">clean</text>
                          <circle cx="38" cy="76" r="2" fill="#fb923c" />
                          <text x="42" y="78" fontSize="4" fill="#64748b">cascade</text>
                          <circle cx="72" cy="76" r="2" fill="#f87171" />
                          <text x="76" y="78" fontSize="4" fill="#64748b">retracted</text>
                        </svg>
                      </div>
                    </div>

                    <p className="mt-3 text-center text-[9px] text-slate-600">
                      Sample — 12-citation paper · 1 direct retraction · 1 cascade contamination detected
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-12 rounded-2xl border border-red-900/35 bg-gradient-to-b from-red-950/35 to-slate-950/80 p-5 sm:mt-14 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-red-300/90">The stakes</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
                <li>
                  The Wakefield vaccine paper was cited{" "}
                  <strong className="text-white">881 times</strong> after retraction.
                </li>
                <li>
                  The average retracted paper is still being cited{" "}
                  <strong className="text-white">25 times</strong> post-retraction.
                </li>
                <li>
                  Only <strong className="text-white">5.4%</strong> of those citations acknowledge the retraction.
                </li>
              </ul>
            </section>

            <section className="mt-12 sm:mt-14">
              <h2 className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Who is this for</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
                {[
                  { icon: "🎓", title: "PhD students", body: "Check before your defense" },
                  { icon: "📝", title: "Journal authors", body: "Submit with confidence" },
                  { icon: "🔬", title: "Research labs", body: "Audit your team's work" },
                ].map((c) => (
                  <div
                    key={c.title}
                    className="rounded-xl border border-white/10 bg-slate-900/40 p-3.5 text-center sm:p-4"
                  >
                    <span className="text-lg sm:text-xl" aria-hidden>
                      {c.icon}
                    </span>
                    <p className="mt-1.5 text-sm font-semibold text-white">{c.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-400">{c.body}</p>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <footer className="relative z-10 border-t border-white/10 bg-slate-950/90">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
              <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Data sources</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Bibliographies are cross-checked against the public{" "}
                    <span className="text-slate-300">Retraction Watch</span> corpus (
                    <span className="text-slate-300">~57,393</span> retraction records in
                    our index). That count is the size of the reference database — not your
                    upload.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Privacy &amp; methodology</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    We never store your paper. <span className="text-slate-300">Zero retention.</span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Direct + cascade detection — <span className="text-slate-400">2 levels deep</span>.
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Product</p>
                  <p className="mt-2 text-sm text-slate-400">Free. No account required.</p>
                  <p className="mt-1 font-[family-name:var(--font-instrument)] text-base text-slate-300">
                    RetractWatch <span className="text-slate-500">V2</span>
                  </p>
                </div>
              </div>
              <div className="mt-8 flex flex-col items-center gap-2 border-t border-white/[0.06] pt-6 sm:flex-row sm:justify-between">
                <p className="text-center text-[11px] text-slate-600 sm:text-left">
                  © {new Date().getFullYear()} RetractWatch · Talos
                </p>
                <p className="text-center text-[11px] text-slate-600">Built for researchers</p>
              </div>
            </div>
          </footer>
        </div>
>>>>>>> 747d616 (fix: exclude CSV from build bundle)
      </div>
    </>
  );
}
