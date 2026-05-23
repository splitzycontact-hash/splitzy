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
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    // The admin app has no Clerk→Convex JWT, so identity is null there: fall
    // back to the allowlisted authEmail so the super_admin doc still exists.
    const userEmail = identity?.email ?? args.authEmail;
    if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) return null;

    let existing = identity
      ? await ctx.db.query("users")
          .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
          .unique()
      : null;
    if (!existing) {
      const all = await ctx.db.query("users").collect();
      existing = all.find((u) => u.email === userEmail) ?? null;
    }

    if (existing) {
      if (existing.role !== "super_admin") {
        await ctx.db.patch(existing._id, { role: "super_admin" });
      }
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkUserId: identity?.subject ?? `email:${userEmail}`,
      email: userEmail,
      firstName: identity?.givenName,
      lastName: identity?.familyName,
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
