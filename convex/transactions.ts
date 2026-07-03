import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdminAccess } from "./lib";
import { requireRestaurantAccess } from "./authz";

export const listRecent = query({
  args: { limit: v.optional(v.number()), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const limit = args.limit ?? 20;
    const txs = await ctx.db.query("transactions").order("desc").take(limit);
    if (txs.length > 0) return txs;
    const payments = await ctx.db.query("payments").order("desc").take(limit);
    return payments.map(p => ({
      _id: p._id,
      _creationTime: p._creationTime,
      restaurantId: p.restaurantId,
      sessionId: undefined,
      stripePaymentIntentId: undefined,
      stripeChargeId: undefined,
      amountCents: p.totalCents,
      tipCents: p.tipCents,
      commissionCents: p.commissionCents,
      status: (p.status === "Encaissé"
        ? "succeeded"
        : p.status === "Remboursé"
        ? "refunded"
        : "pending") as "succeeded" | "refunded" | "pending" | "failed" | "disputed",
      failureCode: undefined,
      paymentMethod: p.paymentMethod,
      cardLast4: undefined,
      succeededAt: p.createdAt,
      ipAddress: undefined,
    }));
  },
});

export const listByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx))) {
      await requireRestaurantAccess(ctx, args.restaurantId);
    }
    const txs = await ctx.db.query("transactions")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .order("desc").take(200);
    if (txs.length > 0) return txs;
    const payments = await ctx.db.query("payments")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .order("desc").take(200);
    return payments.map(p => ({
      _id: p._id, _creationTime: p._creationTime, restaurantId: p.restaurantId,
      amountCents: p.totalCents, tipCents: p.tipCents, commissionCents: p.commissionCents,
      status: (p.status === "Encaissé" ? "succeeded" : p.status === "Remboursé" ? "refunded" : "pending"),
      paymentMethod: p.paymentMethod, succeededAt: p.createdAt,
      stripePaymentIntentId: undefined, cardLast4: undefined,
    }));
  },
});

export const countRecentByRestaurant = query({
  args: { restaurantId: v.id("restaurants"), since: v.number() },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx))) {
      await requireRestaurantAccess(ctx, args.restaurantId);
    }
    const txs = await ctx.db.query("transactions")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .filter(q => q.gte(q.field("_creationTime"), args.since)).collect();
    if (txs.length > 0) return txs.length;
    const payments = await ctx.db.query("payments")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .filter(q => q.gte(q.field("createdAt"), args.since)).collect();
    return payments.length;
  },
});

export const countRecentByIp = query({
  args: { ipAddress: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx))) throw new Error("Accès refusé");
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
    if (!(await isAdminAccess(ctx))) {
      await requireRestaurantAccess(ctx, args.restaurantId);
    }
    const today = new Date(); today.setHours(0,0,0,0); const todayMs = today.getTime();
    const allTx = await ctx.db.query("transactions")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .filter(q => q.eq(q.field("status"), "succeeded")).collect();
    if (allTx.length > 0) {
      const t = allTx.filter(x => (x.succeededAt ?? 0) >= todayMs);
      return { todayVolume: t.reduce((s,x)=>s+x.amountCents,0), todayTips: t.reduce((s,x)=>s+(x.tipCents??0),0), todayCount: t.length };
    }
    const payments = await ctx.db.query("payments")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .filter(q => q.eq(q.field("status"), "Encaissé")).collect();
    const t = payments.filter(p => p.createdAt >= todayMs);
    return { todayVolume: t.reduce((s,p)=>s+p.totalCents,0), todayTips: t.reduce((s,p)=>s+p.tipCents,0), todayCount: t.length };
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
