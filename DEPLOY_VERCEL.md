# Deploy `web` to Vercel

Follow these steps in order. No changes to `lib/`, `components/`, or `convex/` are required for a standard deploy.

## 1. Vercel project (root directory + build)

1. Import your Git repository in the [Vercel dashboard](https://vercel.com/new).
2. If the repo root is the parent folder that **contains** `web/` (e.g. monorepo `Talos` with `web` inside), set **Root Directory** to **`web`** (not `Talos/web` — paths are relative to the repo root).
3. Leave defaults unless you use a custom setup:
   - **Install Command:** `npm install`
   - **Build Command:** `npm run build`
   - **Output:** Next.js (auto-detected)
4. Deploy. Fix any build errors from the Vercel build log before continuing.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

Add these for **Production** (and **Preview** if you use preview deployments).

| Name | Environment | Required |
|------|-------------|----------|
| `NEXT_PUBLIC_CONVEX_URL` | Production, Preview | Yes — must match your **production** Convex deployment URL |
| `LLM_API_KEY` *or* `OPENAI_API_KEY` | Production, Preview | Yes for LLM PDF/extraction flows |
| `LLM_BASE_URL` | Production, Preview | If using a non-default API host (e.g. Groq) |
| `LLM_MODEL` | Production, Preview | If not using default model env in code |
| `EXA_API_KEY` | Production, Preview | For replacement search in production |
| `SEMANTIC_SCHOLAR_API_KEY` | Production, Preview | Optional — add if you hit rate limits |

**Usually not needed on Vercel** (keep in local `.env.local` for CLI): `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_SITE_URL`.

**Optional hardening:** `INTERNAL_JOB_SECRET` only if you add Convex-side auth checks (not required by default Next routes).

Redeploy after adding or changing variables.

## 3. Convex production

1. From your machine, in the `web` directory: `npx convex deploy` (use the Convex project linked to this app).
2. Copy the **production** deployment URL and set `NEXT_PUBLIC_CONVEX_URL` on Vercel to that value (must match).
3. In the [Convex dashboard](https://dashboard.convex.dev), if your project restricts HTTP origins, add your Vercel domain (e.g. `https://your-app.vercel.app`).

## 4. Serverless time limits (Hobby vs Pro)

`app/api/check/route.ts` uses a long `maxDuration` for large bibliographies. On **Vercel Hobby**, function duration is often capped around **60 seconds** — large jobs may time out. Options:

- Use **Vercel Pro** (or equivalent) for longer limits, or
- Test with smaller bibliographies on Hobby.

---

After setup, open your Vercel URL, run a scan, and confirm results load and `/api/check` completes for a typical job size.
