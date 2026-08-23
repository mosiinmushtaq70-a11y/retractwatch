# RetractWatch — Feature Blueprint & Implementation Roadmap

> **Purpose**: This is the authoritative engineering blueprint for all 14 planned feature expansions of RetractWatch. Each entry covers what the feature is, why researchers need it, the best technical integration strategy, data sources, and implementation notes. This is the long-term development guide.

---

## Table of Contents

1. [BibTeX / RIS / Zotero File Upload](#1-bibtex--ris--zotero-file-upload)
2. [Post-Publication Retraction Alerts (Email Watch)](#2-post-publication-retraction-alerts-email-watch)
3. [Shareable Report Links](#3-shareable-report-links)
4. [Expression of Concern & Corrections Flagging](#4-expression-of-concern--corrections-flagging)
5. [Author-Level Retraction History](#5-author-level-retraction-history)
6. [Journal Integrity Score](#6-journal-integrity-score)
7. [Preprint Flagging](#7-preprint-flagging)
8. [Retraction Timeline Context](#8-retraction-timeline-context)
9. [Clean Bibliography Export (BibTeX)](#9-clean-bibliography-export-bibtex)
10. [Shareable Co-Author Report with Collaboration Mode](#10-shareable-co-author-report-with-collaboration-mode)
11. [Public REST API for Developers](#11-public-rest-api-for-developers)
12. [Browser Extension (Chrome & Firefox)](#12-browser-extension-chrome--firefox)
13. [Field-Specific Risk Severity Scoring](#13-field-specific-risk-severity-scoring)
14. [Persistent "My Bibliography" Dashboard](#14-persistent-my-bibliography-dashboard)

---

## 1. BibTeX / RIS / Zotero File Upload

### What It Is
Allows researchers to directly upload their reference manager export files (`.bib`, `.ris`, `.enl`) instead of copy-pasting or uploading a PDF. These are the native formats used by LaTeX/Overleaf (BibTeX), Zotero, Mendeley, and EndNote.

### Why Researchers Need It
The vast majority of serious academic researchers maintain their bibliography in a reference manager (Zotero, Mendeley, EndNote). Currently, RetractWatch forces them to either upload a PDF (which requires LLM extraction) or paste raw text. Supporting `.bib` and `.ris` files means:
- **Zero extraction errors** — DOIs are already structured in the file
- **10x faster** — no LLM extraction needed, DOIs are directly parseable
- **Works for every researcher** regardless of PDF availability

### Best Integration Strategy

**Library**: `@citation-js/core` + `@citation-js/plugin-bibtex` + `@citation-js/plugin-ris`
- Industry standard. Handles BibTeX, RIS, Zotero RDF, and CSL-JSON
- Parses directly to structured JSON with DOIs, titles, authors, and years
- TypeScript compatible

```bash
npm install @citation-js/core @citation-js/plugin-bibtex @citation-js/plugin-ris
```

**Parsing Example**:
```typescript
import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-ris';

const cite = new Cite(bibtexString);
const references = cite.format('data'); // Returns CSL-JSON array
// Each entry has: DOI, title, author[], year, journal, etc.
```

### Implementation Plan

**Backend** (`app/api/parse-bib/route.ts`):
1. Accept `.bib` or `.ris` file via multipart form upload
2. Use Citation.js to parse into CSL-JSON entries
3. Return structured `{ doi, title, authors, year }[]` array
4. Feed directly into existing pipeline Phase 1 (skipping LLM extraction entirely)

**Frontend** (`app/page.tsx`):
- Add a third tab: **"Upload .bib / .ris"**
- Drag & drop zone for reference manager exports
- Show parsed citation count before running analysis

**Estimated Effort**: Medium (2-3 days)
**Impact**: Very High — opens the tool to 90% of serious researchers who use LaTeX/Overleaf

---

## 2. Post-Publication Retraction Alerts (Email Watch)

### What It Is
A persistent **citation monitoring service**. After running an analysis, researchers can opt in with their email. The system stores their DOI list and runs a daily background check. If any previously-cited paper gets newly added to the Retraction Watch database, it sends an automated email alert.

### Why Researchers Need It
This is the **most critical missing feature** for research integrity. If you published a paper in 2022 citing a work that gets retracted in 2024, you would never know. In medical or clinical research this can cause serious harm if follow-on work cites the retracted chain without correction. No existing free tool provides this.

### Best Integration Strategy

**Email Service**: Resend via `@convex-dev/resend`
- Convex has a native Resend component with built-in retry, deduplication, and delivery tracking
- Free tier: 3,000 emails/month

**Backend** (`convex/` folder):
1. **New Convex table**: `watchlists` `{ email: string, dois: string[], createdAt: number, lastChecked: number }`
2. **Convex Cron** (`convex/crons.ts`): Runs daily at 08:00 UTC — checks all watchlist DOI sets against latest Retraction Watch CSV
3. **Convex Action** (`convex/alerts.ts`): For each newly retracted DOI, send personalized email via Resend with:
   - Paper title, retraction reason, retraction date
   - Link to the RetractWatch analysis result
   - Direct link to retraction notice

**Frontend**:
- After analysis completes, show an opt-in banner: "Watch this bibliography — get emailed if any citation gets retracted"
- Email input + subscribe button stores DOI set in Convex `watchlists` table

```typescript
// convex/crons.ts
crons.cron("daily-retraction-check", "0 8 * * *", internal.alerts.checkWatchlists);
```

**Estimated Effort**: High (4-6 days)
**Impact**: Very High — flagship differentiating feature, no other free tool offers this

---

## 3. Shareable Report Links

### What It Is
Every completed analysis job already has a unique URL (`/results/[jobId]`). This feature makes those URLs **publicly shareable** with a clean, read-only view for co-authors and collaborators who don't need to re-run the scan.

### Why Researchers Need It
Researchers collaborate. When a PI runs a bibliography check, they need to share it with co-authors, or submit it as supplementary material. Currently results require Convex to be live and the job data to still exist.

### Best Integration Strategy

**Implementation**:
1. **Convex**: Add `isPublic: boolean` and `expiresAt: number` (default: 30 days) to `jobs` table
2. **Snapshot on completion**: When job status becomes `complete`, write a lightweight `snapshots` document with denormalized citation summary
3. **URL**: Keep existing `/results/[jobId]` — add `?share=1` query param for read-only mode that hides "New Upload" and shows "Fork this analysis" CTA
4. **Open Graph tags**: Add dynamic `<meta property="og:title">` with the job summary (e.g., "RetractWatch: 2 retractions found in 15 citations — 87% clean")
5. **"Copy share link" button** in the results UI

**Estimated Effort**: Low-Medium (1-2 days)
**Impact**: High — dramatically improves collaboration and virality

---

## 4. Expression of Concern & Corrections Flagging

### What It Is
Beyond full retractions, journals issue other types of notices researchers should know about:
- **Expression of Concern (EOC)** — Publisher has doubts but hasn't retracted yet. Often precedes retraction.
- **Correction / Erratum** — Key results, figures, or data were wrong and have been formally corrected.
- **Reinstatement** — A previously retracted paper has been officially reinstated.

### Why Researchers Need It
An **Expression of Concern** is one of the most important early-warning signals in research. Citing a paper with an active EOC is a significant risk. Corrections can also fundamentally change the validity of conclusions.

### Best Integration Strategy

**Data Source**: The Retraction Watch database CSV already contains a `ReasonCode` field that includes EOC and Correction entries. The current pipeline only flags papers with "Retraction" in the reason field.

**Implementation**:
1. In `lib/retractionWatch.ts`, extend `isRetracted()` to return notice type: `retracted | expression-of-concern | correction | reinstatement`
2. Update `PipelineCitationStatus` type in `lib/pipeline-types.ts`
3. Add new UI badges in `components/CitationFeed.tsx`:
   - EXPRESSION OF CONCERN — amber badge
   - CORRECTION — blue badge
   - REINSTATED — green with note
4. Update `IntegrityScore.tsx` to show EOC as its own category
5. Update `scoreBands.ts` to weight EOC differently (-20 pts vs -40 pts for full retraction)

**Crossref API supplement**:
```
GET https://api.crossref.org/works?filter=update-type:expression-of-concern
```

**Estimated Effort**: Medium (2-3 days)
**Impact**: High — significant research integrity value, low effort since CSV data already contains it

---

## 5. Author-Level Retraction History

### What It Is
When a citation is flagged as retracted, show not just that paper's retraction — but also **how many total papers this author has had retracted**, their retraction rate, and whether they are a repeat offender.

### Why Researchers Need It
A single retraction by a distinguished researcher due to an honest error is very different from an author with 7 retractions due to repeated fabrication. This context helps researchers evaluate the trustworthiness of an author's broader body of work.

### Best Integration Strategy

**Data Sources**:
1. **Retraction Watch CSV**: Contains `Authors` field — query for all papers by the same author
2. **OpenAlex API** (`https://api.openalex.org/authors?filter=display_name.search:[name]`): Author profiles with ORCID linkage and total publication counts
3. **Semantic Scholar Author API** (`/graph/v1/author/{id}/papers`): All papers for a resolved author ID

**Implementation**:
1. When a citation is confirmed `retracted`, extract author names from the citation
2. Query the Retraction Watch CSV in-memory for all entries sharing the same author names
3. Call OpenAlex to enrich with total publication count → calculate retraction rate
4. Store enriched author summary in a new Convex `authorStats` table (cache to avoid re-querying)
5. Display in citation card UI:
   ```
   A.J. Wakefield — 8 total retractions in RW database
   Published ~40 papers · Retraction rate: ~20%
   ```

**Key Challenges**:
- Author name disambiguation ("J. Smith" appears thousands of times)
- Use ORCID when available in citation metadata for precise matching
- Fall back to fuzzy name matching with institution filtering from CrossRef

**Estimated Effort**: Medium-High (3-4 days)
**Impact**: Medium-High — adds critical context but name disambiguation is complex

---

## 6. Journal Integrity Score

### What It Is
For each citation, show the **retraction rate and integrity profile of the journal** it was published in. A paper from The Lancet (retraction rate < 0.1%) carries different inherent credibility than a paper from a known predatory or high-retraction journal.

### Why Researchers Need It
Researchers should know if they're disproportionately citing a journal with a track record of retractions. It also helps identify papers from predatory journals that may not appear in Retraction Watch yet.

### Best Integration Strategy

**Data Sources**:
1. **Crossref API**: Query total works count per ISSN: `GET /journals/{issn}/works?rows=0`
2. **Retraction Watch CSV**: Filter all entries by journal ISSN or name → count retractions
3. **DOAJ (Directory of Open Access Journals)**: Verify if a journal is legitimate open-access
4. **Beall's List** (archived): Known predatory publishers list for flagging

**Calculation**:
```
Journal Retraction Rate = (Retracted papers in journal / Total papers in journal) x 1000
```
Expressed as "retractions per 1,000 papers" to match standard academic reporting.

**Implementation**:
1. Build `lib/journalIntegrity.ts` — takes an ISSN, queries Crossref + RW CSV
2. Add a Convex `journalCache` table to store computed scores (TTL: 7 days)
3. Display journal score pill on each citation card:
   - Low risk (0-1/1000)
   - Moderate (1-5/1000)
   - High retraction rate journal (>5/1000)
4. Add DOAJ check: show "DOAJ Listed" or "Not DOAJ Listed" for open access claims

**Estimated Effort**: Medium (2-3 days)
**Impact**: Medium — valuable context, especially for medical/clinical researchers

---

## 7. Preprint Flagging

### What It Is
Automatically detect when a cited paper is a **preprint** (not yet peer-reviewed) from ArXiv, bioRxiv, medRxiv, SSRN, or other preprint servers — and flag it with a clear visual warning.

### Why Researchers Need It
Preprints are not in the Retraction Watch database because they haven't been formally published. The current tool shows them as `UNVERIFIED` which is confusing — a preprint is fundamentally different from an unverifiable citation. Many researchers don't realize they're citing preprints.

### Best Integration Strategy

**Detection Logic** (`lib/preprintDetector.ts`):
1. **DOI prefix detection**: ArXiv DOIs start with `10.48550/arXiv.*`, bioRxiv/medRxiv start with `10.1101/`
```typescript
const PREPRINT_DOI_PREFIXES = [
  '10.48550',  // ArXiv
  '10.1101',   // bioRxiv / medRxiv
  '10.2139',   // SSRN
  '10.21203',  // Research Square
];
```
2. **URL pattern matching**: Reference URL contains `arxiv.org`, `biorxiv.org`, `medrxiv.org`, `ssrn.com`
3. **CrossRef type field**: CrossRef returns `"type": "posted-content"` for preprints

**New Citation Status**: `preprint` — separate from `unverified`

**UI Treatment**:
- Purple badge: "PREPRINT"
- Tooltip: "This is a preprint — not peer-reviewed. No retraction data applies."
- Auto-search CrossRef for published version: "A published version may exist: [DOI link]"

**Estimated Effort**: Low (1-2 days)
**Impact**: High — very common source of confusion, easy to implement

---

## 8. Retraction Timeline Context

### What It Is
Show **when** a paper was retracted relative to the scan date. This answers: "When this paper was retracted, could the researcher have known?"

### Why Researchers Need It
Academic accountability requires temporal context. Citing a paper in 2021 that wasn't retracted until 2023 is understandable. Citing in 2024 a paper retracted in 2019 is negligent. Currently the tool shows retraction date but doesn't contextualize it.

### Best Integration Strategy

**Data Available**: The Retraction Watch CSV includes `RetractionDate` for every retracted record.

**Implementation**:
1. Parse `RetractionDate` from the RW CSV for each flagged citation
2. Store on the `citations` Convex document as `retractionDate: string`
3. In the citation card UI, show a timeline badge:
   - Retracted > 3 years before scan — Red ("Should have been caught")
   - Retracted < 1 year before scan — Amber ("Understandable")
   - Retracted after scan date — Blue ("New retraction — good you're monitoring!")

**New field in Convex `citations` table**:
```typescript
retractionDate: v.optional(v.string()), // ISO date string from RW CSV
```

**Estimated Effort**: Low (1 day — data already in CSV)
**Impact**: High — critical accountability context at near-zero implementation cost

---

## 9. Clean Bibliography Export (BibTeX)

### What It Is
After analysis, offer a **downloadable, processed `.bib` file** where:
- Retracted entries are commented out with `%% RETRACTED` prefix and a note
- Cascade-flagged entries are annotated with a warning comment
- Replacement paper suggestions are automatically substituted as new `@article` entries
- Clean entries are preserved unchanged

### Why Researchers Need It
The entire point of finding retracted citations is to fix the bibliography. Currently the tool shows problems but makes you fix them manually. A clean `.bib` export closes the loop — the researcher can drop it back into their LaTeX document and be done.

### Best Integration Strategy

**Library**: `@citation-js/core` for generating BibTeX output from CSL-JSON

**Implementation** (`lib/exportBibtex.ts`):
```typescript
function generateCleanBibtex(citations: CitationRow[], replacements: ReplacementRow[]): string {
  let output = '';
  for (const cit of citations) {
    if (cit.status === 'retracted') {
      output += `%% RETRACTED — ${cit.retractionReason}\n`;
      output += `%% Original: ${cit.title}\n`;
      const rep = replacements.find(r => r.citationId === cit.id);
      output += `%% Suggested replacement: ${rep?.title ?? 'None'}\n\n`;
    }
    // Generate @article entry with warning prefix if cascade...
  }
  return output;
}
```

**Frontend**:
- Add "Download .bib" button in export section (next to "Print / Save as PDF")
- Generate file client-side using `Blob` + `URL.createObjectURL`
- Also offer "Download .ris" for Mendeley/Zotero users

**Estimated Effort**: Medium (2 days)
**Impact**: Very High — closes the researcher's workflow loop completely

---

## 10. Shareable Co-Author Report with Collaboration Mode

### What It Is
A dedicated **read-only sharing mode** for completed analysis jobs, optimized for sending to co-authors or journal editors. Includes a unique shareable URL with clean Open Graph social preview and a "Fork this analysis" CTA.

### Why Researchers Need It
Multi-author papers are the norm in academia. When a corresponding author runs the integrity check, all co-authors need to see it. Journal editors increasingly require integrity attestations at submission.

### Best Integration Strategy

**Implementation**:
1. **Convex schema update**: `jobs` table gets `shareToken: string` (nanoid) and `isShared: boolean`
2. **New public route**: `/share/[shareToken]` — read-only version of results
3. **Share button in UI**: "Generate Share Link" → calls Convex mutation to set `isShared: true`
4. **Open Graph metadata** (`app/share/[shareToken]/page.tsx`):
```html
<meta property="og:title" content="RetractWatch Analysis: 2 Retractions in 15 Citations" />
<meta property="og:description" content="87% clean — 2 retracted, 1 cascade risk detected." />
<meta property="og:image" content="/api/og?token=xxx" />
```
5. Dynamic OG image generation via `@vercel/og` showing the integrity gauge

**Estimated Effort**: Medium (2-3 days)
**Impact**: High — massively improves shareability and use in academic workflows

---

## 11. Public REST API for Developers

### What It Is
A documented, public HTTP API that allows developers, reference managers, publishers, and university library systems to integrate RetractWatch's integrity checking into their own tools.

### Why Researchers Need It
Zotero plugins, manuscript submission portals (Editorial Manager, ScholarOne), and university library dashboards all need programmatic access. An API turns RetractWatch from a web tool into infrastructure.

### Best Integration Strategy

**Endpoints** (`app/api/v1/`):
```
POST /api/v1/check
  Body: { dois: string[] }  // Up to 50 DOIs per request
  Returns: { doi, status, retractionDate, retractionReason, replacements[] }[]

GET /api/v1/check/:doi
  Returns: { doi, status, retractionReason, retractionDate, cascadeRisk }

POST /api/v1/analyze
  Body: { bibliography: string }  // Raw text
  Returns: { jobId: string }

GET /api/v1/jobs/:jobId
  Returns: { status, citations[], score, downstreamRisk }
```

**Authentication**: API key via `Authorization: Bearer <key>` header
- Free tier: 100 requests/day
- Store API keys in Convex `apiKeys` table with rate limiting

**Documentation**: Self-hosted Swagger/OpenAPI spec at `/api/v1/docs`

**Estimated Effort**: High (5-7 days including documentation)
**Impact**: Very High — opens ecosystem integrations and drives massive adoption

---

## 12. Browser Extension (Chrome & Firefox)

### What It Is
A lightweight browser extension that automatically detects when a researcher is viewing a paper on PubMed, a journal website, or a DOI landing page — and shows an instant warning banner if that paper has been retracted.

### Why Researchers Need It
Most citation errors happen at the point of reading — when a researcher discovers a paper and decides to cite it. A browser extension prevents citation at the source, before the paper is added to a reference manager.

### Best Integration Strategy

**Tech Stack**: Chrome Extension Manifest V3 (compatible with Chrome, Edge, Brave, Firefox)

**Content Script Logic**:
```javascript
// content.js
function extractDOI() {
  // 1. Look for <meta name="citation_doi"> (standard academic metadata)
  // 2. Look for DOI pattern in URL (doi.org/10.xxxx)
  // 3. Scan page text for DOI patterns
}

async function checkRetraction(doi) {
  const res = await fetch(`https://retractwatch.vercel.app/api/v1/check/${doi}`);
  return await res.json();
}
```

**UI Banners injected into page**:
- Red banner: "RETRACTED — This paper was retracted on [date]. Reason: [reason]. Do not cite."
- Amber banner: "Expression of Concern — Publisher has flagged concerns about this paper."
- Green badge: "Verified Clean — No retractions detected in RetractWatch database."

**Supported Sites**: PubMed, Nature, Science, Lancet, Cell, Springer, Wiley, Taylor & Francis, Google Scholar

**Distribution**: Chrome Web Store + Firefox Add-ons Marketplace

**Estimated Effort**: High (5-7 days for extension + API dependency)
**Impact**: Very High — most high-visibility feature, massive discoverability and virality

---

## 13. Field-Specific Risk Severity Scoring

### What It Is
Adjust the severity weighting of retractions based on the **research domain** of the paper being checked. A retracted clinical trial methodology paper is far more dangerous than a retracted visualization technique paper in a CS survey.

### Why Researchers Need It
Current scoring treats all retractions equally. A biomedical researcher needs to know that a retraction in their core methodology is a critical integrity failure. Domain-aware scoring gives accurate risk signals.

### Best Integration Strategy

**Domain Detection via OpenAlex API**:
```
GET https://api.openalex.org/works/doi:{doi}?select=topics
```
OpenAlex classifies papers into a 4-level hierarchy: domain → field → subfield → topic.

**Risk Multiplier Map**:
```typescript
const DOMAIN_RISK_MULTIPLIERS: Record<string, number> = {
  'Medicine':        1.5,  // Clinical impact — highest stakes
  'Public Health':   1.5,
  'Psychology':      1.3,  // Replication crisis domain
  'Biochemistry':    1.2,
  'Computer Science': 1.0, // Baseline
  'Mathematics':     0.8,  // Theoretical, less downstream impact
  'Humanities':      0.7,
};
```

**Score Adjustment**:
```
Adjusted Score = Base Score x (1 - (retractedCount x domainMultiplier x 0.1))
```

**UI**: Show field tag on citation card: "Medicine · High-stakes domain"

**Estimated Effort**: Medium (2-3 days)
**Impact**: Medium — meaningful for high-stakes domains, adds significant sophistication

---

## 14. Persistent "My Bibliography" Dashboard

### What It Is
A user account system allowing researchers to save past analysis scans, organize them by project/paper, and receive the post-publication alert service (Feature 2) tied to their account. Includes a personal integrity statistics dashboard.

### Why Researchers Need It
Currently every scan is ephemeral. Researchers working on long-term projects (PhD theses, systematic reviews, grant applications) need a persistent workspace. An account also enables the email monitoring service and makes RetractWatch a long-term research tool rather than a one-off utility.

### Best Integration Strategy

**Auth**: Convex Auth with GitHub OAuth + magic-link email sign-in
```bash
npm install @convex-dev/auth
```

**Convex Schema additions**:
```typescript
// users table (created by Convex Auth)
users: defineTable({
  email: v.optional(v.string()),
  name: v.optional(v.string()),
}).index("by_email", ["email"]);

// jobs table — add userId linkage
jobs: defineTable({
  ...existingFields,
  userId: v.optional(v.id("users")),
  projectName: v.optional(v.string()),
  isStarred: v.optional(v.boolean()),
});
```

**Dashboard Route** (`/dashboard`):
- List of past analyses sorted by date
- Rename, star, or delete past jobs
- Global integrity stats: "You've analyzed 127 citations · Caught 8 retractions · 94% clean rate"
- Watchlist management for email alerts (Feature 2)

**Sign-in**: Prioritize "Continue with GitHub" for open-source community alignment + magic-link email

**Estimated Effort**: High (5-7 days for full auth + dashboard)
**Impact**: Very High — transforms RetractWatch from a utility into a platform

---

## Feature Priority Matrix

| # | Feature | Researcher Impact | Dev Effort | Build Order |
|---|---------|-------------------|------------|-------------|
| 3 | Shareable Report Links | High | Low | **1st — Quick Win** |
| 7 | Preprint Flagging | High | Low | **2nd — Quick Win** |
| 8 | Retraction Timeline Context | High | Low | **3rd — Quick Win** |
| 4 | Expression of Concern Flagging | High | Medium | **4th** |
| 1 | BibTeX / RIS Upload | Very High | Medium | **5th** |
| 9 | Clean BibTeX Export | Very High | Medium | **6th** |
| 2 | Post-Publication Alerts | Very High | High | **7th** |
| 6 | Journal Integrity Score | Medium | Medium | **8th** |
| 5 | Author Retraction History | Medium | Medium | **9th** |
| 10 | Collaboration Mode | High | Medium | **10th** |
| 13 | Field-Specific Risk Scoring | Medium | Medium | **11th** |
| 11 | Public REST API | Very High | High | **12th** |
| 14 | My Bibliography Dashboard | Very High | High | **13th** |
| 12 | Browser Extension | Very High | High | **14th** |

---

## Data Sources Reference

| Source | What It Provides | Access | Rate Limit |
|--------|-----------------|--------|------------|
| Retraction Watch CSV | Full retraction database, EOC, corrections | Free (GitLab) | N/A (local file) |
| CrossRef REST API | DOI metadata, journal data, EOC via API | Free | 50 req/s polite pool |
| Semantic Scholar Graph | Citation networks, author profiles, references | Free (API key recommended) | 1 req/s public |
| OpenAlex API | Author disambiguation, field classification, OA status | Free (API key) | 10 req/s |
| Exa AI | Replacement literature search, semantic search | Paid ($0.01/req) | None |
| DOAJ API | Legitimate open-access journal verification | Free | Generous |
| Groq / OpenAI | LLM bibliography extraction from PDF/text | Paid per token | Provider limits |
| Resend (via Convex) | Transactional email delivery | Free (3K/month) | Provider limits |

---

## Tech Stack Additions Required

| Feature | New Packages |
|---------|-------------|
| BibTeX/RIS parsing | `@citation-js/core` `@citation-js/plugin-bibtex` `@citation-js/plugin-ris` |
| Email alerts | `@convex-dev/resend` |
| Auth / Dashboard | `@convex-dev/auth` |
| Browser extension | None (vanilla JS + Manifest V3) |
| BibTeX export | `@citation-js/core` (shared with parsing) |
| Open Graph images | `@vercel/og` |
| OpenAlex integration | `fetch` only (REST API, no SDK) |

---

*Last updated: August 2026 — RetractWatch V2 Feature Blueprint*
*This document should be updated as features are shipped and new insights emerge from real-world usage.*
