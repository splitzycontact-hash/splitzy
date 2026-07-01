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

// ---------------------------------------------------------------------------
// Dashboard side (gérant) — authentifié par JWT Clerk, jamais par email client.
// Le gérant ne voit/écrit QUE les tickets de son restaurant (scope par
// restaurants.by_clerk_user sur identity.subject).
// ---------------------------------------------------------------------------

const DASHBOARD_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

// Gérant soumet un ticket depuis le dashboard.
export const createFromDashboard = mutation({
  args: {
    subject: v.string(),
    body: v.string(),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const subject = args.subject.trim();
    const body = args.body.trim();
    if (!subject || !body) throw new ConvexError("Sujet et message requis");

    const priority = (DASHBOARD_PRIORITIES as readonly string[]).includes(args.priority ?? "")
      ? (args.priority as (typeof DASHBOARD_PRIORITIES)[number])
      : "normal";

    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .unique();
    const resto = await ctx.db.query("restaurants")
      .withIndex("by_clerk_user", q => q.eq("clerkUserId", identity.subject))
      .first();

    const ticketId = await ctx.db.insert("tickets", {
      subject,
      status: "new",
      priority,
      restaurantId: resto?._id,
      createdBy: user?._id,
    });
    await ctx.db.insert("ticketMessages", {
      ticketId,
      authorId: user?._id,
      body,
      isInternal: false,
    });
    return ticketId;
  },
});

// Gérant liste ses propres tickets (ceux de son restaurant).
export const listMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const resto = await ctx.db.query("restaurants")
      .withIndex("by_clerk_user", q => q.eq("clerkUserId", identity.subject))
      .first();
    if (!resto) return [];
    const tickets = await ctx.db.query("tickets")
      .withIndex("by_restaurant", q => q.eq("restaurantId", resto._id))
      .collect();
    return tickets.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Gérant répond à un de ses tickets.
export const replyFromDashboard = mutation({
  args: { ticketId: v.id("tickets"), body: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");
    const body = args.body.trim();
    if (!body) throw new ConvexError("Message vide");

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new ConvexError("Ticket introuvable");
    const resto = await ctx.db.query("restaurants")
      .withIndex("by_clerk_user", q => q.eq("clerkUserId", identity.subject))
      .first();
    if (!resto || ticket.restaurantId?.toString() !== resto._id.toString()) {
      throw new ConvexError("Not authorized");
    }
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkUserId", identity.subject))
      .unique();

    await ctx.db.insert("ticketMessages", {
      ticketId: args.ticketId,
      authorId: user?._id,
      body,
      isInternal: false,
    });
  },
});

// Gérant liste les messages d'un de ses tickets (messages internes admin exclus).
export const listMyMessages = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return [];
    const resto = await ctx.db.query("restaurants")
      .withIndex("by_clerk_user", q => q.eq("clerkUserId", identity.subject))
      .first();
    if (!resto || ticket.restaurantId?.toString() !== resto._id.toString()) return [];
    const messages = await ctx.db.query("ticketMessages")
      .withIndex("by_ticket", q => q.eq("ticketId", args.ticketId))
      .collect();
    // Ne jamais exposer les notes internes admin au gérant.
    return messages.filter(m => !m.isInternal);
  },
});
