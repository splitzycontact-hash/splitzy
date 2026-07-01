import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", args.clerkUserId))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SECURITY (Vuln 5) : sync Clerk→Convex. On exige une identité réelle et on
    // impose que le clerkUserId écrit soit celui du JWT (identity.subject), sinon
    // n'importe qui créait/écrasait une ligne `users` arbitraire par clerkUserId.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Non authentifié");
    if (args.clerkUserId !== identity.subject) {
      throw new ConvexError("clerkUserId ne correspond pas à l'identité");
    }

    const existing = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      avatarUrl: args.avatarUrl,
      role: "gerant",
    });
  },
});

const ADMIN_EMAILS = ["splitzy.contact@gmail.com"];

export const ensureSelfAdmin = mutation({
  // SECURITY: aucun argument. La promotion super_admin exige une identité Clerk
  // RÉELLE dont l'email est allowlisté. L'ancien fallback `authEmail` permettait
  // à n'importe quel appelant anonyme de se promouvoir super_admin (Convex est
  // public). Prérequis : l'app admin envoie un vrai JWT (template Clerk "convex").
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email || !ADMIN_EMAILS.includes(identity.email)) return null;

    let existing = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!existing) {
      const all = await ctx.db.query("users").collect();
      existing = all.find((u) => u.email === identity.email) ?? null;
    }

    if (existing) {
      if (existing.role !== "super_admin") {
        await ctx.db.patch(existing._id, { role: "super_admin" });
      }
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkUserId: identity.subject,
      email: identity.email,
      firstName: identity.givenName,
      lastName: identity.familyName,
      role: "super_admin",
    });
  },
});

export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user || !["super_admin", "admin_support", "viewer"].includes(user.role)) return [];
    return ctx.db.query("users").collect();
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("super_admin"), v.literal("admin_support"),
      v.literal("viewer"), v.literal("gerant")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const actor = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!actor || actor.role !== "super_admin") {
      throw new ConvexError("Only super_admin can change roles");
    }

    await ctx.db.patch(args.userId, { role: args.role });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "user.role_changed",
      resourceType: "user",
      resourceId: args.userId,
      diff: { role: args.role },
    });
  },
});
