import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    return ctx.db.query("feedbacks").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).order("desc").collect()
  },
})

export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tableId: v.id("tables"),
    tableNumber: v.number(),
    stars: v.number(),
    tags: v.array(v.string()),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const d = new Date(now)
    const timeLabel = `aujourd'hui ${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`
    return ctx.db.insert("feedbacks", { ...args, isNew: true, createdAt: now, timeLabel })
  },
})

export const markRead = mutation({
  args: { feedbackId: v.id("feedbacks") },
  handler: async (ctx, { feedbackId }) => {
    await ctx.db.patch(feedbackId, { isNew: false })
  },
})

export const markAllRead = mutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const newItems = await ctx.db.query("feedbacks").withIndex("by_restaurant_new", q => q.eq("restaurantId", restaurantId).eq("isNew", true)).collect()
    for (const item of newItems) {
      await ctx.db.patch(item._id, { isNew: false })
    }
  },
})

export const getNewCount = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const items = await ctx.db.query("feedbacks").withIndex("by_restaurant_new", q => q.eq("restaurantId", restaurantId).eq("isNew", true)).collect()
    return items.length
  },
})
