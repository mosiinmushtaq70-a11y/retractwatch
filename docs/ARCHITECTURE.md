# RetractWatch Architecture & System Overview

RetractWatch is a modern research integrity and bibliography validation platform designed to detect retracted citations, analyze citation cascades, quantify downstream publication risk, and suggest clean peer-reviewed replacement literature.

## Architecture Layers

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 15 Frontend                  │
│       (App Router, Glassmorphic UI, Lucide Icons)       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    API Gateway Layer                   │
│   /api/extract-pdf  ·  /api/extract-text  ·  /api/run  │
└───────┬───────────────────┬───────────────────┬────────┘
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│    Groq LLM    │  │ CrossRef Works │  │ RetractionWatch│
│ (Llama 3.3 70B)│  │ (DOI Registry) │  │  (57K+ Records)│
└────────────────┘  └───────┬────────┘  └───────┬────────┘
                            │                   │
                    ┌───────▼───────────────────▼────────┐
                    │       Semantic Scholar & Exa       │
                    │   (Cascade Graph & AI Literature)  │
                    └───────────────────┬────────────────┘
                                        │
                    ┌───────────────────▼────────────────┐
                    │      Convex Realtime Database      │
                    │  (Live Jobs, Citations, Mutations) │
                    └────────────────────────────────────┘
```

## Core Pipeline Phases

1. **Phase 1 — DOI Extraction & Normalization**:
   - Regex-based DOI detection (`10.xxxx/...`) from citation text.
   - CrossRef bibliographic search fallback for citations without inline DOIs.
   - LLM-assisted bibliography segment parsing.

2. **Phase 2 — Retraction Watch Cross-Verification**:
   - Direct memory lookup against 57,000+ Retraction Watch database entries.
   - Reason categorization (falsification, ethical compliance, data errors, etc.).

3. **Phase 3 — Upstream Citation Cascade Graph**:
   - Analyzes upstream reference networks via Semantic Scholar Academic Graph and CrossRef Works.
   - Flags non-retracted citations whose foundations rely on retracted upstream studies.

4. **Phase 4 — AI Replacement Literature Engine**:
   - Multi-tier suggestions (Exa AI, Groq LLM, and CrossRef Open Access).
   - Generates clean, verified, non-retracted peer-reviewed substitutes.

5. **Phase 5 — Scoring & Downstream Exposure Risk**:
   - Ratio-based verified clean score (`X / N CLEAN`).
   - Downstream exposure propagation model with upper-bound risk estimation.
