import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { isAdminAccess, resolveAdminUser } from "./lib";

export const list = query({
  args: { status: v.optional(v.string()), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];

    if (args.status) {
      return ctx.db.query("tickets")
        .withIndex("by_status", q => q.eq("status", args.status as any))
        .collect();
    }
    return ctx.db.query("tickets").collect();
  },
});

export const createFromEmail = mutation({
  args: {
    subject: v.string(),
    body: v.string(),
    fromEmail: v.string(),
    restaurantId: v.optional(v.id("restaurants")),
  },
  handler: async (ctx, args) => {
    const ticketId = await ctx.db.insert("tickets", {
      subject: args.subject,
      status: "new",
      priority: "normal",
      restaurantId: args.restaurantId,
    });
    await ctx.db.insert("ticketMessages", {
      ticketId,
      body: `De: ${args.fromEmail}\n\n${args.body}`,
      isInternal: false,
    });
    return ticketId;
  },
});

export const reply = mutation({
  args: {
    ticketId: v.id("tickets"),
    body: v.string(),
    isInternal: v.optional(v.boolean()),
    authEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await resolveAdminUser(ctx, args.authEmail);
    if (!user) throw new ConvexError("Not authorized");

    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      authorId: user._id,
      body: args.body,
      isInternal: args.isInternal,
    });
  },
});

export const listMessages = query({
  args: { ticketId: v.id("tickets"), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    return ctx.db.query("ticketMessages")
      .withIndex("by_ticket", q => q.eq("ticketId", args.ticketId))
      .collect();
  },
});

export const resolve = mutation({
  args: { ticketId: v.id("tickets"), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await resolveAdminUser(ctx, args.authEmail);
    if (!user || !["super_admin", "admin_support"].includes(user.role)) {
      throw new ConvexError("Insufficient permissions");
    }
    await ctx.db.patch(args.ticketId, { status: "resolved", resolvedAt: Date.now() });
  },
});
