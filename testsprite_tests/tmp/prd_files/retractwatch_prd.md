# RetractWatch (Talos Web) — Product Requirements

## Overview
RetractWatch helps researchers detect retracted science in bibliographies before peer review. Users upload a PDF or paste reference lines; the system extracts or parses citations, cross-checks DOIs (CrossRef), Retraction Watch data, citation cascades (Semantic Scholar), and streams progress via Convex.

## Goals
- Accept PDF upload (text-based PDFs, max 10MB) and pasted reference lines.
- Start an integrity scan job and show a live results page per job id.
- Surface citation status, integrity scoring, cascade visualization, and optional report download.

## User flows
1. **PDF flow**: Land on home → upload PDF → wait for extraction → automatic navigation to `/results/{jobId}`.
2. **Paste flow**: Land on home → enter lines in textarea → click "Analyze bibliography" → navigate to `/results/{jobId}`.
3. **Results**: View streamed updates, citation list, risk/score UI, and actions such as recheck cascade where implemented.

## Non-goals
- No email/password login for this MVP; optional Convex URL is an environment prerequisite, not in-app auth.

## APIs (Next.js routes)
- `POST /api/extract` — multipart PDF → citations JSON.
- `POST /api/check` — JSON body with citations and optional paper title → job id.
- `POST /api/extract-text` — text extraction variant.
- `POST /api/recheck-cascade` — refresh cascade data for a citation.

## Acceptance criteria
- Home renders upload zone, textarea, and primary CTA without login.
- Invalid file type or oversize PDF shows a clear error on home.
- Missing `NEXT_PUBLIC_CONVEX_URL` shows explicit message and does not claim success.
- Successful job creation redirects to results route with valid job id format.
