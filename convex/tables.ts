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
    orderItems: v.optional(v.array(v.object({
      name: v.string(),
      qty: v.number(),
      unitCents: v.number(),
    }))),
  },
  // Patch conditionnel : on ne touche qu'aux champs fournis. Sinon Convex
  // supprime les champs passés à `undefined` — le scan QR (status only) effacerait
  // le montant + les articles posés par la simulation côté dashboard.
  handler: async (ctx, { tableId, status, guests, amountCents, orderItems }) => {
    const patch: Record<string, unknown> = { status }
    if (guests !== undefined) patch.guests = guests
    if (amountCents !== undefined) patch.amountCents = amountCents
    if (orderItems !== undefined) patch.orderItems = orderItems
    await ctx.db.patch(tableId, patch)
  },
})

export const resetToFree = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    await ctx.db.patch(tableId, { status: 'free', guests: undefined, amountCents: undefined, orderItems: undefined, alert: undefined })
  },
})

export const importAmounts = mutation({
  args: {
    rows: v.array(v.object({ tableId: v.id("tables"), amountCents: v.number() })),
  },
  handler: async (ctx, { rows }) => {
    for (const { tableId, amountCents } of rows) {
      await ctx.db.patch(tableId, { amountCents, status: 'dining' })
    }
  },
})
