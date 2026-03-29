import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createReplacement = mutation({
  args: {
    citationId: v.id("citations"),
    title: v.string(),
    url: v.string(),
    summary: v.string(),
    publishedDate: v.string(),
    relevanceScore: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("replacements", args);
  },
});

export const getReplacementsForCitation = query({
  args: { citationId: v.id("citations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("replacements")
      .filter((q) => q.eq(q.field("citationId"), args.citationId))
      .collect();
  },
});

export const getReplacementsForCitations = query({
  args: { citationIds: v.array(v.id("citations")) },
  handler: async (ctx, args) => {
    const results = [];
    for (const cid of args.citationIds) {
      const reps = await ctx.db
        .query("replacements")
        .filter((q) => q.eq(q.field("citationId"), cid))
        .collect();
      results.push(...reps);
    }
    return results;
  },
});
