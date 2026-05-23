import { ConvexError, v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { isAdminAccess } from "./lib";

export const impersonate = action({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const actor = await ctx.runQuery(api.users.getByClerkId, { clerkUserId: identity.subject });
    if (!actor || !["super_admin", "admin_support"].includes(actor.role)) {
      throw new ConvexError("Insufficient permissions");
    }
    if (!actor.totpEnabled) {
      throw new ConvexError("MFA TOTP obligatoire pour les administrateurs");
    }

    const restaurant = await ctx.runQuery(api.restaurants.getById, { restaurantId: args.restaurantId });
    if (!restaurant) throw new ConvexError("Restaurant not found");

    await ctx.runMutation(api.admin.logImpersonation, {
      actorId: actor._id,
      restaurantId: args.restaurantId,
    });

    const payload = {
      impersonatingRestaurantId: args.restaurantId,
      adminUserId: actor._id,
      exp: Date.now() + 15 * 60 * 1000,
    };
    const secret = process.env.IMPERSONATION_JWT_SECRET ?? "dev-secret-change-in-prod";
    const token = btoa(JSON.stringify(payload)) + "." + btoa(secret.slice(0, 8));

    return { token };
  },
});

export const logImpersonation = mutation({
  args: {
    actorId: v.id("users"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      actorId: args.actorId,
      action: "admin.impersonation_started",
      resourceType: "restaurant",
      resourceId: args.restaurantId,
      isImpersonation: true,
    });
  },
});

export const verifyImpersonationToken = action({
  args: { token: v.string() },
  handler: async (_ctx, args): Promise<{ restaurantId: string; adminUserId: string } | null> => {
    try {
      const [payloadB64] = args.token.split(".");
      const payload = JSON.parse(atob(payloadB64));
      if (Date.now() > payload.exp) return null;
      return {
        restaurantId: payload.impersonatingRestaurantId,
        adminUserId: payload.adminUserId,
      };
    } catch {
      return null;
    }
  },
});

export const kpis = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [restaurants, activeSubs, todayTxs, todayPayments, monthPayments, openBugs] = await Promise.all([
      ctx.db.query("restaurants").collect(),
      ctx.db.query("subscriptions")
        .withIndex("by_status", q => q.eq("status", "active"))
        .collect(),
      ctx.db.query("transactions")
        .filter(q => q.and(
          q.eq(q.field("status"), "succeeded"),
          q.gte(q.field("succeededAt"), today.getTime())
        ))
        .collect(),
      ctx.db.query("payments")
        .filter(q => q.and(
          q.eq(q.field("status"), "Encaissé"),
          q.gte(q.field("createdAt"), today.getTime())
        ))
        .collect(),
      ctx.db.query("payments")
        .filter(q => q.and(
          q.eq(q.field("status"), "Encaissé"),
          q.gte(q.field("createdAt"), monthStart.getTime())
        ))
        .collect(),
      ctx.db.query("bugs")
        .filter(q => q.or(
          q.eq(q.field("status"), "open"),
          q.eq(q.field("status"), "investigating")
        ))
        .collect(),
    ]);

    const proCount = restaurants.filter(r => r.plan === "pro").length;
    const subsBased = activeSubs.reduce((s, sub) => s + (sub.amountCents ?? 3900), 0);
    const mrr = subsBased > 0 ? subsBased : proCount * 3900;
    const statusActive = restaurants.filter(r => r.status === "active").length;
    const activeRestaurants = statusActive > 0
      ? statusActive
      : restaurants.filter(r => !r.suspended).length;
    const todayVolumeFromTx = todayTxs.reduce((s, t) => s + t.amountCents, 0);
    const todayVolumeFromPayments = todayPayments.reduce((s, p) => s + p.totalCents, 0);
    const todayVolume = todayVolumeFromTx + todayVolumeFromPayments;

    const monthTxCount = (await ctx.db.query("transactions")
      .filter(q => q.and(
        q.eq(q.field("status"), "succeeded"),
        q.gte(q.field("succeededAt"), monthStart.getTime())
      ))
      .collect()).length + monthPayments.length;

    return {
      mrr,
      arr: mrr * 12,
      todayVolume,
      activeRestaurants,
      monthTxCount,
      openBugs: openBugs.length,
    };
  },
});

export const alerts = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return null;

    const [deadLetters, kycBlocked, openDisputes, criticalBugs] = await Promise.all([
      ctx.db.query("stripeWebhookEvents")
        .filter(q => q.eq(q.field("status"), "dead_letter"))
        .collect(),
      ctx.db.query("restaurants")
        .filter(q => q.or(
          q.eq(q.field("kycStatus"), "restricted"),
          q.eq(q.field("kycStatus"), "disabled")
        ))
        .collect(),
      ctx.db.query("disputes").collect(),
      ctx.db.query("bugs")
        .filter(q => q.and(
          q.eq(q.field("severity"), "critical"),
          q.eq(q.field("status"), "open")
        ))
        .collect(),
    ]);

    return { deadLetters, kycBlocked, openDisputes, criticalBugs };
  },
});

export const newTicketsCount = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return 0;
    const tickets = await ctx.db.query("tickets")
      .withIndex("by_status", q => q.eq("status", "new"))
      .collect();
    return tickets.length;
  },
});
