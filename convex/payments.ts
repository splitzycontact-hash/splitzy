import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    return ctx.db.query("payments").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).order("desc").collect()
  },
})

export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tableId: v.id("tables"),
    tableNumber: v.number(),
    guests: v.number(),
    subtotalCents: v.number(),
    tipCents: v.number(),
    commissionCents: v.number(),
    totalCents: v.number(),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const d = new Date(now)
    const dateLabel = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
    return ctx.db.insert("payments", { ...args, status: "Encaissé", createdAt: now, dateLabel })
  },
})

export const getOverviewStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const payments = await ctx.db.query("payments").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).collect()
    const encaisse = payments.filter(p => p.status === "Encaissé")
    const totalCA = encaisse.reduce((s, p) => s + p.totalCents, 0)
    const totalTips = encaisse.reduce((s, p) => s + p.tipCents, 0)
    const avgTipPct = encaisse.length > 0 ? (totalTips / encaisse.reduce((s, p) => s + p.subtotalCents, 0) * 100).toFixed(1) : "0"
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const todayPayments = encaisse.filter(p => p.createdAt >= startOfDay.getTime())
    const todayCA = todayPayments.reduce((s, p) => s + p.totalCents, 0)
    const todayTips = todayPayments.reduce((s, p) => s + p.tipCents, 0)
    return { todayCA, todayTips, totalCA, totalTips, avgTipPct, txCount: encaisse.length }
  },
})
