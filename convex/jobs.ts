import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** api.jobs.getJob */
export const getJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return await ctx.db.get(jobId);
  },
});

/** api.jobs.createJob */
export const createJob = mutation({
  args: {
    status: v.string(),
    totalCitations: v.number(),
    processedCount: v.number(),
    integrityScore: v.optional(v.number()),
    paperTitle: v.optional(v.string()),
    historicalComparison: v.optional(v.any()),
    downstreamRisk: v.optional(v.any()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", args);
  },
});

/** api.jobs.updateJob */
export const updateJob = mutation({
  args: {
    jobId: v.id("jobs"),
    status: v.optional(v.string()),
    totalCitations: v.optional(v.number()),
    processedCount: v.optional(v.number()),
    integrityScore: v.optional(v.number()),
    paperTitle: v.optional(v.string()),
    historicalComparison: v.optional(v.any()),
    downstreamRisk: v.optional(v.any()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, { jobId, ...rest }) => {
    const patch: Record<string, unknown> = {};
    if (rest.status !== undefined) patch.status = rest.status;
    if (rest.totalCitations !== undefined) patch.totalCitations = rest.totalCitations;
    if (rest.processedCount !== undefined) patch.processedCount = rest.processedCount;
    if (rest.integrityScore !== undefined) patch.integrityScore = rest.integrityScore;
    if (rest.paperTitle !== undefined) patch.paperTitle = rest.paperTitle;
    if (rest.historicalComparison !== undefined) {
      patch.historicalComparison = rest.historicalComparison;
    }
    if (rest.downstreamRisk !== undefined) patch.downstreamRisk = rest.downstreamRisk;
    if (rest.createdAt !== undefined) patch.createdAt = rest.createdAt;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(jobId, patch);
    }
  },
});
