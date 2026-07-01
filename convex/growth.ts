import { v } from "convex/values";
import { query } from "./_generated/server";
import { isAdminAccess } from "./lib";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const kpis = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return null;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const [restaurants, payments] = await Promise.all([
      ctx.db.query("restaurants").collect(),
      ctx.db.query("payments").collect(),
    ]);
    const activeIds = new Set(
      payments.filter((p) => p.createdAt >= thirtyDaysAgo).map((p) => p.restaurantId)
    );
    const activeByStatus = restaurants.filter((r) => r.status === "active").length;
    const activeRestaurants =
      activeIds.size > 0
        ? activeIds.size
        : activeByStatus > 0
        ? activeByStatus
        : restaurants.filter((r) => !r.suspended).length;
    return {
      totalRestaurants: restaurants.length,
      activeRestaurants,
      totalVolumeCents: payments.reduce((s, p) => s + p.totalCents, 0),
      totalTransactions: payments.length,
    };
  },
});

export const weeklyActivity = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const payments = await ctx.db.query("payments").collect();
    const now = Date.now();
    const weeks: { week: string; restaurants: number; volumeCents: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = now - (i + 1) * WEEK_MS;
      const end = now - i * WEEK_MS;
      const inWeek = payments.filter((p) => p.createdAt >= start && p.createdAt < end);
      weeks.push({
        week: `Sem ${8 - i}`,
        restaurants: new Set(inWeek.map((p) => p.restaurantId)).size,
        volumeCents: inWeek.reduce((s, p) => s + p.totalCents, 0),
      });
    }
    return weeks;
  },
});

export const restaurantPipeline = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const restaurants = await ctx.db.query("restaurants").collect();
    const rows = await Promise.all(
      restaurants.map(async (r) => {
        const payments = await ctx.db
          .query("payments")
          .withIndex("by_restaurant", (q) => q.eq("restaurantId", r._id))
          .collect();
        const volumeCents = payments.reduce((s, p) => s + p.totalCents, 0);
        const lastPaymentAt = payments.reduce((mx, p) => Math.max(mx, p.createdAt), 0);
        const status = r.suspended
          ? "suspended"
          : r.status ?? (payments.length > 0 ? "active" : "onboarding");
        return {
          _id: r._id,
          name: r.name,
          type: r.type,
          status,
          plan: r.plan ?? "free",
          lastPaymentAt: lastPaymentAt > 0 ? lastPaymentAt : null,
          volumeCents,
          txCount: payments.length,
        };
      })
    );
    rows.sort((a, b) => b.volumeCents - a.volumeCents);
    return rows;
  },
});
