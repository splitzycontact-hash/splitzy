import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdminAccess, resolveAdminUser } from "./lib";

export const listByRestaurant = query({
  args: { restaurantId: v.id("restaurants"), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    return ctx.db.query("bugs")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

export const listOpen = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    return ctx.db.query("bugs")
      .filter(q => q.or(
        q.eq(q.field("status"), "open"),
        q.eq(q.field("status"), "investigating")
      ))
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    severity: v.union(
      v.literal("critical"), v.literal("high"), v.literal("medium"),
      v.literal("low"), v.literal("info")
    ),
    restaurantId: v.optional(v.id("restaurants")),
    stackTrace: v.optional(v.string()),
    authEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { authEmail, ...bug } = args;
    const user = await resolveAdminUser(ctx, authEmail);
    if (!user || !["super_admin", "admin_support"].includes(user.role)) {
      throw new ConvexError("Insufficient permissions");
    }
    return ctx.db.insert("bugs", {
      ...bug,
      status: "open",
    });
  },
});

export const resolve = mutation({
  args: { bugId: v.id("bugs"), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await resolveAdminUser(ctx, args.authEmail);
    if (!user || !["super_admin", "admin_support"].includes(user.role)) {
      throw new ConvexError("Insufficient permissions");
    }
    await ctx.db.patch(args.bugId, { status: "resolved", resolvedAt: Date.now() });
    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      action: "bug.resolved",
      resourceType: "bug",
      resourceId: args.bugId,
    });
  },
});
