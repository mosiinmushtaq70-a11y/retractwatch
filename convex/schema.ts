import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/** Tables and field names match backend integration contract — do not rename. */
export default defineSchema({
  jobs: defineTable({
    status: v.string(),
    totalCitations: v.number(),
    processedCount: v.number(),
    integrityScore: v.optional(v.number()),
    paperTitle: v.optional(v.string()),
    historicalComparison: v.optional(v.any()),
    downstreamRisk: v.optional(v.any()),
    createdAt: v.number(),
  }),

  citations: defineTable({
    jobId: v.id("jobs"),
    title: v.string(),
    authors: v.string(),
    year: v.optional(v.number()),
    doi: v.optional(v.string()),
    status: v.string(),
    retractionReason: v.optional(v.string()),
    retractionDate: v.optional(v.string()),
    retractionCountry: v.optional(v.string()),
    retractionJournal: v.optional(v.string()),
    cascadeDepth: v.optional(v.number()),
    cascadeVia: v.optional(v.string()),
  }).index("by_job", ["jobId"]),

  replacements: defineTable({
    citationId: v.id("citations"),
    title: v.string(),
    url: v.string(),
    summary: v.string(),
    publishedDate: v.string(),
    relevanceScore: v.number(),
  }).index("by_citation", ["citationId"]),
});
