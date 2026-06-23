import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

export const list = query({
  // `from`/`to` (ms epoch, optionnels) filtrent par createdAt sur [from, to).
  // Rétrocompat : sans ces args, retourne tous les feedbacks (comportement existant).
  args: {
    restaurantId: v.id("restaurants"),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { restaurantId, from, to }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    const rows = await ctx.db.query("feedbacks").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).order("desc").collect()
    if (from === undefined && to === undefined) return rows
    return rows.filter(r => (from === undefined || r.createdAt >= from) && (to === undefined || r.createdAt < to))
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
    const table = await ctx.db.get(args.tableId)
    if (!table || table.restaurantId !== args.restaurantId) throw new Error("Table introuvable pour ce restaurant")
    const stars = Math.max(1, Math.min(5, Math.round(args.stars)))
    const text = (args.text ?? "").slice(0, 2000)
    const now = Date.now()
    const d = new Date(now)
    const timeLabel = `aujourd'hui ${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`
    return ctx.db.insert("feedbacks", { ...args, stars, text, isNew: true, createdAt: now, timeLabel })
  },
})

export const markRead = mutation({
  args: { feedbackId: v.id("feedbacks") },
  handler: async (ctx, { feedbackId }) => {
    const feedback = await ctx.db.get(feedbackId)
    if (!feedback) throw new Error("Feedback introuvable")
    await requireRestaurantAccess(ctx, feedback.restaurantId)
    await ctx.db.patch(feedbackId, { isNew: false })
  },
})

// Réponse publique du gérant à un feedback. Owner/manager only. reply vide
// (après trim) efface la réponse existante.
export const addReply = mutation({
  args: { feedbackId: v.id("feedbacks"), reply: v.string() },
  handler: async (ctx, { feedbackId, reply }) => {
    const fb = await ctx.db.get(feedbackId)
    if (!fb) throw new Error("Feedback introuvable")
    await requireRestaurantAccess(ctx, fb.restaurantId, ["owner", "manager"])
    await ctx.db.patch(feedbackId, { managerReply: reply.trim().slice(0, 280) || undefined })
  },
})

export const markAllRead = mutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    const newItems = await ctx.db.query("feedbacks").withIndex("by_restaurant_new", q => q.eq("restaurantId", restaurantId).eq("isNew", true)).collect()
    for (const item of newItems) {
      await ctx.db.patch(item._id, { isNew: false })
    }
  },
})

export const getNewCount = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    const items = await ctx.db.query("feedbacks").withIndex("by_restaurant_new", q => q.eq("restaurantId", restaurantId).eq("isNew", true)).collect()
    return items.length
  },
})
