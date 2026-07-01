import { v } from "convex/values";
import { query } from "./_generated/server";
import { isAdminAccess } from "./lib";

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const PRO_PRICE_CENTS = 3900;

export const financialKpis = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return null;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [restaurants, activeSubs, payments] = await Promise.all([
      ctx.db.query("restaurants").collect(),
      ctx.db.query("subscriptions").withIndex("by_status", (q) => q.eq("status", "active")).collect(),
      ctx.db.query("payments").collect(),
    ]);
    const proSubs = activeSubs.filter((s) => s.plan === "pro");
    const proCount =
      proSubs.length > 0 ? proSubs.length : restaurants.filter((r) => r.plan === "pro").length;
    const mrrCents =
      proSubs.length > 0
        ? proSubs.reduce((s, sub) => s + (sub.amountCents ?? PRO_PRICE_CENTS), 0)
        : proCount * PRO_PRICE_CENTS;
    const monthPayments = payments.filter((p) => p.createdAt >= monthStart.getTime());
    return {
      mrrCents,
      arrCents: mrrCents * 12,
      proCount,
      monthlyVolumeCents: monthPayments.reduce((s, p) => s + p.totalCents, 0),
      monthlyCommissionCents: monthPayments.reduce((s, p) => s + p.commissionCents, 0),
    };
  },
});

export const monthlyRevenue = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const payments = await ctx.db.query("payments").collect();
    const now = new Date();
    const months: { month: string; commissionCents: number; volumeCents: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
      const inMonth = payments.filter((p) => p.createdAt >= start && p.createdAt < end);
      months.push({
        month: `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`,
        commissionCents: inMonth.reduce((s, p) => s + p.commissionCents, 0),
        volumeCents: inMonth.reduce((s, p) => s + p.totalCents, 0),
      });
    }
    return months;
  },
});

export const subscriptions = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const subs = await ctx.db.query("subscriptions").collect();
    if (subs.length > 0) {
      return Promise.all(
        subs.map(async (s) => {
          const r = await ctx.db.get(s.restaurantId);
          return {
            _id: s._id as string,
            restaurantId: s.restaurantId,
            restaurantName: r?.name ?? "—",
            plan: s.plan as string,
            status: s.status as string,
            amountCents: s.amountCents ?? PRO_PRICE_CENTS,
            currentPeriodEnd: s.currentPeriodEnd ?? null,
            mock: false,
          };
        })
      );
    }
    const restaurants = await ctx.db.query("restaurants").collect();
    return restaurants
      .filter((r) => r.plan === "pro")
      .map((r) => ({
        _id: r._id as string,
        restaurantId: r._id,
        restaurantName: r.name,
        plan: "pro" as string,
        status: "active" as string,
        amountCents: PRO_PRICE_CENTS,
        currentPeriodEnd: null as number | null,
        mock: true,
      }));
  },
});
