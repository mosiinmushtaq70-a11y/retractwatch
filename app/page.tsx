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

        <footer className="absolute bottom-0 left-0 right-0 border-t border-white/5 py-4 text-center text-xs text-slate-600">
          RetractWatch V2 · Talos
        </footer>
      </div>
    </>
  );
}
