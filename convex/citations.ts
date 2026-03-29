import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** api.citations.getCitationsForJob */
export const getCitationsForJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db
      .query("citations")
      .withIndex("by_job", (q) => q.eq("jobId", jobId))
      .collect();
  },
});

/** api.citations.createCitation */
export const createCitation = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("citations", args);
  },
});

/** api.citations.updateCitation */
export const updateCitation = mutation({
  args: {
    citationId: v.id("citations"),
    title: v.optional(v.string()),
    authors: v.optional(v.string()),
    year: v.optional(v.number()),
    doi: v.optional(v.string()),
    status: v.optional(v.string()),
    retractionReason: v.optional(v.string()),
    retractionDate: v.optional(v.string()),
    retractionCountry: v.optional(v.string()),
    retractionJournal: v.optional(v.string()),
    cascadeDepth: v.optional(v.number()),
    cascadeVia: v.optional(v.string()),
  },
  handler: async (ctx, { citationId, ...rest }) => {
    const patch: Record<string, unknown> = {};
    if (rest.title !== undefined) patch.title = rest.title;
    if (rest.authors !== undefined) patch.authors = rest.authors;
    if (rest.year !== undefined) patch.year = rest.year;
    if (rest.doi !== undefined) patch.doi = rest.doi;
    if (rest.status !== undefined) patch.status = rest.status;
    if (rest.retractionReason !== undefined) {
      patch.retractionReason = rest.retractionReason;
    }
    if (rest.retractionDate !== undefined) {
      patch.retractionDate = rest.retractionDate;
    }
    if (rest.retractionCountry !== undefined) {
      patch.retractionCountry = rest.retractionCountry;
    }
    if (rest.retractionJournal !== undefined) {
      patch.retractionJournal = rest.retractionJournal;
    }
    if (rest.cascadeDepth !== undefined) patch.cascadeDepth = rest.cascadeDepth;
    if (rest.cascadeVia !== undefined) patch.cascadeVia = rest.cascadeVia;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(citationId, patch);
    }
  },
});
