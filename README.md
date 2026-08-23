# RetractWatch

Next.js 16 app + Convex realtime backend for detecting retracted research and citation cascade contamination in scientific bibliographies.

## Setup

1. `npm install`
2. Copy [`.env.local.example`](./.env.local.example) to `.env.local` and set your variables (`NEXT_PUBLIC_CONVEX_URL`, `OPENAI_API_KEY`, etc.).
3. Run Convex backend: `npm run convex` (or link a deployed Convex project).
4. Run Next.js frontend: `npm run dev` (or `npm run dev -- -p 3011`).

## Data & Privacy

- **LLM:** Bibliography text (PDF references block or pasted text, max ~8,000 characters) is sent to your configured LLM provider for citation extraction—not the full manuscript. Do not upload confidential work if your provider policy does not allow it.
- **Retraction Watch:** Retraction checks use a bundled CSV snapshot under `data/retraction_watch.csv` (~57K+ retraction notices).

## Limits

- Up to **200 citations** per scan (`/api/check`).

## Pre-deployment verification (localhost:3011)

1. **Build:** `npm run build` must complete with zero errors.
2. **Smoke (HTTP):** With Next.js on port **3011** (`npm run dev -- -p 3011` or `start-all.bat`), run:
   ```bash
   npm run smoke
   ```
3. **Manual E2E (browser):** Upload a PDF or paste a bibliography, confirm redirect to `/results/{jobId}`, watch live Convex updates until the job completes, and test report export.

## Deploy to Vercel

### 1. Convex production

From the project root:

```bash
npx convex deploy -y
```

Copy the deployment URL (e.g. `https://your-deployment.convex.cloud`).

### 2. Import the repo in Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import your Git repo.
2. Set **Root Directory** to `./` (leave default).
3. Framework: **Next.js**. Build command: `npm run build`, output: default.

### 3. Environment variables (Production)

Add these in **Project → Settings → Environment Variables** (Production; add Preview if you want preview deploys):

| Name | Notes |
|------|--------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex production URL from step 1 |
| `LLM_API_KEY` or `OPENAI_API_KEY` | Required for PDF/paste extraction |
| `SEMANTIC_SCHOLAR_API_KEY` | Strongly recommended — avoids 429s on cascade checks |
| `EXA_API_KEY` | Optional — replacement suggestions |
| `NEXT_PUBLIC_APP_URL` | Your live site URL (e.g. `https://your-app.vercel.app`) |

Optional: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_JSON_MODE`, `LLM_MAX_COMPLETION_TOKENS`.

Redeploy after changing any `NEXT_PUBLIC_*` variable so the client bundle picks it up.

### 4. Function duration

`/api/check` sets **`maxDuration = 300`** (seconds). **Vercel Hobby** limits serverless time to **~60s** unless Fluid Compute / Pro applies. Large bibliographies may need **Pro** or a shorter reference list.

### 5. CLI deploy (optional)

```bash
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
