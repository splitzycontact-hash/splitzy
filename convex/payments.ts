import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    return ctx.db.query("payments").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).order("desc").collect()
  },
})

// Paiements d'une table, plus récents d'abord. Sert au flow client (/welcome)
// pour reconstruire les convives de la sitting courante (cumul des subtotals
// jusqu'à atteindre table.paidCents). Lecture seule.
export const listByTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    return ctx.db.query("payments").withIndex("by_table", q => q.eq("tableId", tableId)).order("desc").collect()
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
    firstName: v.optional(v.string()),
    avatarIndex: v.optional(v.number()),
    paidItemNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // CONVIVE PUBLIC : pas d'auth (le client n'est pas connecté). On durcit
    // côté serveur sans casser le mock.
    // 1) La table doit exister ET appartenir au restaurant annoncé.
    const table = await ctx.db.get(args.tableId)
    if (!table || table.restaurantId !== args.restaurantId) throw new Error("Table invalide")
    // 2) Pas de montants négatifs.
    if (args.subtotalCents < 0 || args.tipCents < 0) throw new Error("Montant invalide")
    // 3) Plafonner le sous-total au restant dû si une note est connue.
    const subtotalCents = table.amountCents && table.amountCents > 0
      ? Math.min(args.subtotalCents, Math.max(0, table.amountCents - (table.paidCents ?? 0)))
      : args.subtotalCents
    // 4) Recalculer commission (1,5%) et total côté serveur (ignorer les valeurs client).
    const commissionCents = Math.round(subtotalCents * 0.015)
    const totalCents = subtotalCents + args.tipCents

    // paidItemNames n'existe pas dans le schema payments — l'extraire avant l'insert.
    // Les commissionCents/totalCents/subtotalCents client restent dans paymentData mais
    // sont écrasés par les valeurs serveur recalculées ci-dessous (l'ordre des clés du
    // spread garantit l'override).
    const { paidItemNames, ...paymentData } = args
    const now = Date.now()
    const d = new Date(now)
    const dateLabel = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
    const paymentId = await ctx.db.insert("payments", { ...paymentData, subtotalCents, tipCents: args.tipCents, commissionCents, totalCents, status: "Encaissé", createdAt: now, dateLabel })

    // Réconcilier la table : cumuler le payé sur la sitting courante + ajuster le statut.
    // Le restant est calculé sur le sous-total (hors pourboire) ; les pourboires
    // sont agrégés à part pour le dashboard. Jamais de throw : si la table a
    // disparu on conserve quand même le ledger.
    {
      const paidCents = (table.paidCents ?? 0) + subtotalCents
      const paidTipCents = (table.paidTipCents ?? 0) + args.tipCents
      const billCents = table.amountCents ?? 0
      const status = billCents > 0 && paidCents >= billCents ? "paid" as const : "payment" as const
      const patch: Record<string, unknown> = { paidCents, paidTipCents, status }
      if (status === "paid" && table.orderItems?.length) {
        // Table entièrement soldée → tout marquer paid.
        patch.orderItems = table.orderItems.map(item => ({ ...item, paid: true }))
      } else if (paidItemNames && paidItemNames.length > 0 && table.orderItems?.length) {
        // Paiement partiel "par article" → marquer uniquement les articles sélectionnés.
        // remaining consommé en sens inverse pour gérer correctement les doublons (qty > 1).
        const remaining = [...paidItemNames]
        patch.orderItems = table.orderItems.map(item => {
          if (item.paid) return item
          let count = 0
          for (let i = remaining.length - 1; i >= 0 && count < item.qty; i--) {
            if (remaining[i] === item.name) { remaining.splice(i, 1); count++ }
          }
          if (count === 0) return item
          if (count >= item.qty) return { ...item, paid: true }
          return { ...item, qty: item.qty - count }
        })
      }
      await ctx.db.patch(args.tableId, patch)
    }
    return paymentId
  },
})

export const updateStatus = mutation({
  args: { paymentId: v.id('payments'), status: v.union(v.literal('Encaissé'), v.literal('En attente'), v.literal('Remboursé')) },
  handler: async (ctx, { paymentId, status }) => {
    const pmt = await ctx.db.get(paymentId)
    if (!pmt) throw new Error("Paiement introuvable")
    await requireRestaurantAccess(ctx, pmt.restaurantId, ["owner", "manager"])
    await ctx.db.patch(paymentId, { status })
  },
})

export const getOverviewStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
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
