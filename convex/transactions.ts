import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user || !["super_admin", "admin_support", "viewer"].includes(user.role)) return [];
    return ctx.db.query("transactions")
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const listByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return ctx.db.query("transactions")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .take(200);
  },
});

export const countRecentByRestaurant = query({
  args: { restaurantId: v.id("restaurants"), since: v.number() },
  handler: async (ctx, args) => {
    const txs = await ctx.db.query("transactions")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .filter(q => q.gte(q.field("_creationTime"), args.since))
      .collect();
    return txs.length;
  },
});

export const countRecentByIp = query({
  args: { ipAddress: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    const txs = await ctx.db.query("transactions")
      .withIndex("by_ip", q => q.eq("ipAddress", args.ipAddress))
      .filter(q => q.gte(q.field("_creationTime"), args.since))
      .collect();
    return txs.length;
  },
});

export const getOverviewStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const allTx = await ctx.db.query("transactions")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .filter(q => q.eq(q.field("status"), "succeeded"))
      .collect();

    const todayTx = allTx.filter(t => (t.succeededAt ?? 0) >= todayMs);
    const todayVolume = todayTx.reduce((sum, t) => sum + t.amountCents, 0);
    const todayTips = todayTx.reduce((sum, t) => sum + (t.tipCents ?? 0), 0);

    return { todayVolume, todayTips, todayCount: todayTx.length };
  },
});

export const markFailed = mutation({
  args: {
    stripePaymentIntentId: v.string(),
    failureCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tx = await ctx.db.query("transactions")
      .withIndex("by_stripe_pi", q => q.eq("stripePaymentIntentId", args.stripePaymentIntentId))
      .unique();
    if (!tx) return;
    await ctx.db.patch(tx._id, {
      status: "failed",
      failureCode: args.failureCode,
    });
  },
});
