import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    return ctx.db.query("featureFlags").collect();
  },
});

export const evaluate = query({
  args: { key: v.string(), restaurantId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const flag = await ctx.db.query("featureFlags")
      .withIndex("by_key", q => q.eq("key", args.key))
      .unique();
    if (!flag) return false;
    if (flag.status === "disabled" || flag.status === "dev") return false;
    if (flag.status === "active") {
      if (flag.rolloutType === "boolean") return true;
      if (flag.rolloutType === "allowlist" && flag.rolloutValue?.restaurantIds) {
        return !!args.restaurantId && flag.rolloutValue.restaurantIds.includes(args.restaurantId);
      }
    }
    if (flag.status === "beta") {
      if (flag.rolloutType === "allowlist" && flag.rolloutValue?.restaurantIds) {
        return !!args.restaurantId && flag.rolloutValue.restaurantIds.includes(args.restaurantId);
      }
    }
    return false;
  },
});

// Outil admin (CLI `npx convex run` uniquement — internalMutation, jamais
// appelable depuis un client) : allowlist du nouvel écran client de paiement
// fractionné (GOAL_PAIEMENTS_08, même pattern que DEMO_AUTO_CONFIRM_PAYMENTS).
// Le flag est évalué serveur dans restaurants:getTableContext. Tableau vide →
// flag disabled → tous les restaurants gardent l'ancien écran 3 onglets.
// Usage : npx convex run featureFlags:setNouveauPaiementFractionne '{"restaurantIds":["<id>"]}' --prod
export const setNouveauPaiementFractionne = internalMutation({
  args: { restaurantIds: v.array(v.string()) },
  handler: async (ctx, { restaurantIds }) => {
    const existing = await ctx.db.query("featureFlags")
      .withIndex("by_key", q => q.eq("key", "NOUVEAU_PAIEMENT_FRACTIONNE"))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: restaurantIds.length > 0 ? "active" : "disabled",
        rolloutType: "allowlist",
        rolloutValue: { restaurantIds },
      });
      return existing._id;
    }
    return ctx.db.insert("featureFlags", {
      key: "NOUVEAU_PAIEMENT_FRACTIONNE",
      description: "Nouvel écran client de paiement fractionné (réclamation de parts, grisage temps réel) pour les restaurants listés — tous les autres gardent l'ancien écran 3 onglets.",
      status: restaurantIds.length > 0 ? "active" : "disabled",
      rolloutType: "allowlist",
      rolloutValue: { restaurantIds },
    });
  },
});

export const update = mutation({
  args: {
    key: v.string(),
    status: v.optional(v.union(
      v.literal("dev"), v.literal("beta"),
      v.literal("active"), v.literal("disabled")
    )),
    rolloutValue: v.optional(v.object({
      percent: v.optional(v.number()),
      restaurantIds: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user || !["super_admin", "admin_support"].includes(user.role)) {
      throw new ConvexError("Insufficient permissions");
    }

    const flag = await ctx.db.query("featureFlags")
      .withIndex("by_key", q => q.eq("key", args.key))
      .unique();
    if (!flag) throw new ConvexError(`Flag "${args.key}" not found`);

    await ctx.db.patch(flag._id, {
      ...(args.status && { status: args.status }),
      ...(args.rolloutValue && { rolloutValue: args.rolloutValue }),
    });

    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "featureFlag.updated",
      resourceType: "featureFlag",
      resourceId: flag._id,
      diff: { key: args.key, status: args.status, rolloutValue: args.rolloutValue },
    });
  },
});
