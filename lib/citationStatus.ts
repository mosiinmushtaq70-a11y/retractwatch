/**
 * Allowed citation `status` values — must match backend pipeline.
 * UI accepts any string for forward compatibility; styles fall back to `pending`.
 */
export const CITATION_STATUSES = [
  "pending",
  "checking",
  "clean",
  "retracted",
  "cascade",
  "cascade-unknown",
  "unverified",
] as const;

export type CitationStatus = (typeof CITATION_STATUSES)[number];
