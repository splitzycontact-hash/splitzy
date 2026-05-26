import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { isAdminAccess } from "./lib"

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
    const paymentId = await ctx.db.insert("payments", { ...args, status: "Encaissé", createdAt: now, dateLabel })

    // Réconcilier la table : cumuler le payé de la sitting courante + ajuster le statut.
    // Le restant se calcule sur le sous-total (hors pourboire) ; les pourboires sont cumulés à part.
    // Jamais de throw : si la table a disparu, on conserve quand même le ledger.
    const table = await ctx.db.get(args.tableId)
    if (table) {
      const paidCents = (table.paidCents ?? 0) + args.subtotalCents
      const paidTipCents = (table.paidTipCents ?? 0) + args.tipCents
      const billCents = table.amountCents ?? 0
      const status = billCents > 0 && paidCents >= billCents ? "paid" as const : "payment" as const
      await ctx.db.patch(args.tableId, { paidCents, paidTipCents, status })
    }
    return paymentId
  },
})

// Admin-only : purge les paiements de test (paymentMethod commençant par "test_"
// ou "e2e_"). Utile pour nettoyer le ledger après des diagnostics en prod.
export const purgeTestPayments = mutation({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) {
      return { deleted: 0, reason: "unauthorized" }
    }
    const all = await ctx.db.query("payments").collect()
    const targets = all.filter(p =>
      p.paymentMethod.startsWith("test_") || p.paymentMethod.startsWith("e2e_")
    )
    for (const p of targets) {
      await ctx.db.delete(p._id)
    }
    return { deleted: targets.length, restaurants: [...new Set(targets.map(p => p.restaurantId))].length }
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
