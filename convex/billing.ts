import { v } from "convex/values";
import { query } from "./_generated/server";
import { isAdminAccess } from "./lib";

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const PRO_PRICE_CENTS = 9900;
const ESSENTIEL_PRICE_CENTS = 5900;
const PLAN_PRICE_CENTS: Record<string, number> = {
  pro: PRO_PRICE_CENTS,
  essentiel: ESSENTIEL_PRICE_CENTS,
};

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
    // Par palier payant : subs actives si présentes, sinon fallback sur
    // restaurants.plan (aucune facturation réelle tant que Market Pay absent).
    const paidPlanStats = (plan: "pro" | "essentiel") => {
      const subs = activeSubs.filter((s) => s.plan === plan);
      const count = subs.length > 0 ? subs.length : restaurants.filter((r) => r.plan === plan).length;
      const cents =
        subs.length > 0
          ? subs.reduce((s, sub) => s + (sub.amountCents ?? PLAN_PRICE_CENTS[plan]), 0)
          : count * PLAN_PRICE_CENTS[plan];
      return { count, cents };
    };
    const pro = paidPlanStats("pro");
    const essentiel = paidPlanStats("essentiel");
    const proCount = pro.count;
    const mrrCents = pro.cents + essentiel.cents;
    const monthPayments = payments.filter((p) => p.createdAt >= monthStart.getTime());
    return {
      mrrCents,
      arrCents: mrrCents * 12,
      proCount,
      essentielCount: essentiel.count,
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
            amountCents: s.amountCents ?? PLAN_PRICE_CENTS[s.plan as string] ?? PRO_PRICE_CENTS,
            currentPeriodEnd: s.currentPeriodEnd ?? null,
            mock: false,
          };
        })
      );
    }
    const restaurants = await ctx.db.query("restaurants").collect();
    return restaurants
      .filter((r) => r.plan === "pro" || r.plan === "essentiel")
      .map((r) => ({
        _id: r._id as string,
        restaurantId: r._id,
        restaurantName: r.name,
        plan: r.plan as string,
        status: "active" as string,
        amountCents: PLAN_PRICE_CENTS[r.plan as string] ?? PRO_PRICE_CENTS,
        currentPeriodEnd: null as number | null,
        mock: true,
      }));
  },
});
