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
    paidItemNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const d = new Date(now)
    const dateLabel = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
    const paymentId = await ctx.db.insert("payments", { ...args, status: "Encaissé", createdAt: now, dateLabel })

    // Réconcilier la table : cumuler le payé sur la sitting courante + ajuster le statut.
    // Le restant est calculé sur le sous-total (hors pourboire) ; les pourboires
    // sont agrégés à part pour le dashboard. Jamais de throw : si la table a
    // disparu on conserve quand même le ledger.
    const table = await ctx.db.get(args.tableId)
    if (table) {
      const paidCents = (table.paidCents ?? 0) + args.subtotalCents
      const paidTipCents = (table.paidTipCents ?? 0) + args.tipCents
      const billCents = table.amountCents ?? 0
      const status = billCents > 0 && paidCents >= billCents ? "paid" as const : "payment" as const
      const patch: Record<string, unknown> = { paidCents, paidTipCents, status }
      // Quand la table est entièrement soldée, marquer tous les articles comme payés
      // pour que /items n'affiche plus rien et que le bandeau /welcome soit correct.
      if (status === "paid" && table.orderItems?.length) {
        patch.orderItems = table.orderItems.map(item => ({ ...item, paid: true }))
      }
      await ctx.db.patch(args.tableId, patch)
    }
    return paymentId
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
