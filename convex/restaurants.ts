import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const getTableContext = query({
  args: { slug: v.string(), tableNumber: v.number() },
  handler: async (ctx, { slug, tableNumber }) => {
    const restaurant = await ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", slug)).unique()
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
    return ctx.db.insert("restaurants", args)
  },
})
