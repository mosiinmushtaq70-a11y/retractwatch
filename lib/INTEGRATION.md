# RetractWatch frontend ↔ backend (Convex)

## API surface (exact names)

Backend / actions should call:

| Convex path | Purpose |
|-------------|---------|
| `api.jobs.createJob` | Insert a job row |
| `api.jobs.updateJob` | Patch a job by `jobId` |
| `api.jobs.getJob` | Read job by `jobId` (used by results page) |
| `api.citations.createCitation` | Insert citation linked to `jobId` |
| `api.citations.updateCitation` | Patch citation by `citationId` |
| `api.citations.getCitationsForJob` | List citations for `jobId` (indexed) |

## Schema: `citations` optional fields (exact names)

- `retractionReason`
- `retractionDate`
- `retractionCountry`
- `retractionJournal`

Also: `cascadeDepth`, `cascadeVia`, `year`, `doi` (all optional where noted in `convex/schema.ts`).

## Status strings (exact)

`pending`, `checking`, `clean`, `retracted`, `cascade`, `unverified`

## Results URL

After creating a job, send users to `/results/<jobs._id>` where `<jobs._id>` is the Convex document id string.

## Local dev

1. `cd web && npm install`
2. `npx convex dev` (once) to link deployment; keep running or use dashboard deploy key
3. Add `NEXT_PUBLIC_CONVEX_URL` to `.env.local`
4. `npm run dev`

If `NEXT_PUBLIC_CONVEX_URL` is missing, live scans and results pages require configuration before they work.
