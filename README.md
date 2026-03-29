# RetractWatch (Talos web)

Next.js app + Convex backend. Deploy this directory (`Talos/web`) to Vercel; root `Talos/` also contains legacy paths—use **`web` as the project root**.

## Setup

1. `npm install`
2. Copy [`.env.local.example`](./.env.local.example) to `.env.local` and set variables.
3. Run Convex: `npm run convex` (or link a deployed Convex project).
4. **Production hardening (optional):** You can add Convex-side auth for mutations (e.g. `INTERNAL_JOB_SECRET` in Convex env + checks in functions). This repo’s Next.js routes use the public Convex URL with the default generated API; lock down in Convex dashboard / custom mutations if you expose the project publicly.

## Data & privacy

- **LLM:** Bibliography text (PDF references block or pasted text, max ~8,000 characters) is sent to your configured LLM provider for citation extraction—not the full manuscript. Do not upload confidential work if your provider policy does not allow it.
- **Retraction Watch:** Retraction checks use a **bundled CSV snapshot** under `data/retraction_watch.csv`, not a live API. Results can miss very recent retractions; treat the tool as indicative, not authoritative for compliance or publication decisions.

## Limits

- Up to **200 citations** per scan (`/api/check`).
- **Rate limits** (per IP, per minute, plus a per-instance global cap): `/api/check` 10, `/api/extract` 15, `/api/extract-text` 15, `/api/recheck-cascade` 5. Unidentified clients (no `x-forwarded-for` / `cf-connecting-ip`) share a stricter bucket. Set `RATE_LIMIT_DISABLED=1` locally to turn off. For production-scale abuse protection, use a shared store (e.g. Vercel KV / Upstash); see comments in `middleware.ts`.

## Pre-deployment verification (localhost:3011)

1. **Build:** `npm run build` must complete with no ESLint errors.
2. **Smoke (HTTP):** With Next.js on port **3011** (`npm run dev -- -p 3011` or `start-all.bat`), run:
   ```bash
   npm run smoke
   ```
   This hits `GET /`, `GET /results/…`, negative cases on `/api/check` and `/api/extract-text`, a happy-path LLM extract, and `/api/check` with a sample citation (marks **SKIP** if Convex is not reachable).
3. **Manual E2E (browser):** Upload a PDF or paste a bibliography, confirm redirect to `/results/{jobId}`, watch live Convex updates until the job completes, try **Report download**, and **cascade retry** if a row is `cascade-unknown`.

## Deploy to Vercel

### 1. Convex production

From **`Talos/web`** (Convex project must match this app):

```bash
npx convex deploy -y
```

Copy the deployment URL (e.g. `https://your-deployment.convex.cloud`).

### 2. Import the repo in Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import your Git repo.
2. Set **Root Directory** to `Talos/web` (or `web` if the repo root is already `Talos`).
3. Framework: **Next.js**. Build command: `npm run build`, output: default.

### 3. Environment variables (Production)

Add these in **Project → Settings → Environment Variables** (Production; add Preview if you want preview deploys):

| Name | Notes |
|------|--------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex production URL from step 1 |
| `LLM_API_KEY` or `OPENAI_API_KEY` | Required for PDF/paste extraction |
| `SEMANTIC_SCHOLAR_API_KEY` | Strongly recommended — avoids 429s on cascade checks |
| `EXA_API_KEY` | Optional — replacement suggestions |
| `NEXT_PUBLIC_APP_URL` | Your live site URL, no trailing slash (e.g. `https://your-app.vercel.app`) if you add same-origin checks later |

Optional: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_JSON_MODE`, `LLM_MAX_COMPLETION_TOKENS`.

Redeploy after changing any `NEXT_PUBLIC_*` variable so the client bundle picks it up.

### 4. Function duration

`/api/check` sets **`maxDuration = 300`** (seconds). **Vercel Hobby** often limits serverless time to **~60s** unless Fluid Compute / a higher plan applies. Large bibliographies may need **Pro** or a shorter reference list. See [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration).

### 5. CLI deploy (optional)

```bash
cd Talos/web
npx vercel link
npx vercel --prod
```

### 6. Smoke test

Open the production URL → upload a small PDF or paste a short bibliography → confirm redirect to `/results/{jobId}` and that the job reaches **complete** with scores.

---

## Scripts

- `npm run dev` — Next.js
- `npm run dev -- -p 3011` — Next.js on port 3011 (matches `start-all.bat`)
- `npm run convex` — Convex dev sync
- `npm run build` — production build
- `npm run smoke` — HTTP smoke tests against `http://localhost:3011` (PowerShell; run dev server first)
