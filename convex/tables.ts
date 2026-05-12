import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const createBulk = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    count: v.number(),
    capacity: v.number(),
  },
  handler: async (ctx, { restaurantId, count, capacity }) => {
    for (let i = 1; i <= count; i++) {
      await ctx.db.insert("tables", {
        restaurantId,
        number: i,
        capacity,
        status: "free",
      })
    }
  },
})

export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    return ctx.db.query("tables").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).collect()
  },
})

export const updateStatus = mutation({
  args: {
    tableId: v.id("tables"),
    status: v.union(v.literal("free"), v.literal("dining"), v.literal("payment"), v.literal("paid")),
    guests: v.optional(v.number()),
    amountCents: v.optional(v.number()),
  },
  handler: async (ctx, { tableId, status, guests, amountCents }) => {
    await ctx.db.patch(tableId, { status, guests, amountCents })
  },
})
