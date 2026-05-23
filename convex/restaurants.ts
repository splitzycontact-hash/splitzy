import { ConvexError, v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { isAdminAccess } from "./lib"

async function requireAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not authenticated");
  const user = await ctx.db.query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user || !["super_admin", "admin_support"].includes(user.role)) {
    throw new ConvexError("Insufficient permissions");
  }
  if (!user.totpEnabled) {
    throw new ConvexError("MFA TOTP obligatoire pour les administrateurs");
  }
  return user;
}

export const getTableContext = query({
  args: { slug: v.string(), tableNumber: v.number() },
  handler: async (ctx, { slug, tableNumber }) => {
    const restaurant = await ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", slug)).first()
    if (!restaurant) return null
    const tables = await ctx.db.query("tables").withIndex("by_restaurant", q => q.eq("restaurantId", restaurant._id)).collect()
    const table = tables.find(t => t.number === tableNumber) ?? null
    return { restaurant, table }
  },
})

export const update = mutation({
  args: {
    id: v.id("restaurants"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch)
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", slug)).unique()
  },
})

export const getByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    return ctx.db.query("restaurants").withIndex("by_clerk_user", q => q.eq("clerkUserId", clerkUserId)).unique()
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    type: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", args.slug)).first()
    if (existing) return existing._id
    return ctx.db.insert("restaurants", args)
  },
})

export const setSuspended = mutation({
  args: { id: v.id("restaurants"), suspended: v.boolean() },
  handler: async (ctx, { id, suspended }) => {
    await ctx.db.patch(id, { suspended })
  },
})

export const getById = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => ctx.db.get(args.restaurantId),
})

export const listAll = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    return ctx.db.query("restaurants").collect();
  },
})

export const listWithLastActivity = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const restaurants = await ctx.db.query("restaurants").collect();
    const result = await Promise.all(restaurants.map(async (r) => {
      const lastTx = await ctx.db.query("transactions")
        .withIndex("by_restaurant", q => q.eq("restaurantId", r._id))
        .order("desc")
        .first();
      return { ...r, lastActivityAt: lastTx?.succeededAt ?? r._creationTime };
    }));
    return result;
  },
})

export const suspend = mutation({
  args: { restaurantId: v.id("restaurants"), reason: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new ConvexError("Restaurant not found");
    await ctx.db.patch(args.restaurantId, { status: "suspended", suspended: true });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "restaurant.suspended",
      resourceType: "restaurant",
      resourceId: args.restaurantId,
      diff: { reason: args.reason, previousStatus: restaurant.status },
    });
    await ctx.db.insert("tickets", {
      restaurantId: args.restaurantId,
      subject: `Compte suspendu — ${restaurant.name}`,
      status: "new",
      priority: "high",
      createdBy: actor._id,
    });
  },
})

export const unsuspend = mutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    await ctx.db.patch(args.restaurantId, { status: "active", suspended: false });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "restaurant.unsuspended",
      resourceType: "restaurant",
      resourceId: args.restaurantId,
    });
  },
})

export const deleteAll = mutation({
  args: { id: v.id("restaurants") },
  handler: async (ctx, { id }) => {
    const deleteTable = async (table: string, index: string) => {
      const rows = await (ctx.db.query(table as any) as any)
        .withIndex(index, (q: any) => q.eq("restaurantId", id))
        .collect()
      for (const row of rows) await ctx.db.delete(row._id)
    }
    await deleteTable("feedbacks",  "by_restaurant")
    await deleteTable("payments",   "by_restaurant")
    await deleteTable("menuItems",  "by_restaurant")
    await deleteTable("tables",     "by_restaurant")
    await ctx.db.delete(id)
  },
})
