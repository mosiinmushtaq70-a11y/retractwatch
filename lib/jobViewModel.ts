import type { Doc } from "@/convex/_generated/dataModel";

/** Minimal job fields the UI reads — matches Convex `jobs` table shape. */
export type JobViewModel = {
  status?: string | null;
  integrityScore?: number | null;
  downstreamRisk?: unknown;
};

export function jobFromConvexDoc(doc: Doc<"jobs"> | null): JobViewModel | null {
  if (!doc) return null;
  return {
    status: doc.status,
    integrityScore: doc.integrityScore,
    downstreamRisk: doc.downstreamRisk,
  };
}
