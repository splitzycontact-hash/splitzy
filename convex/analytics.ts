import { query } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

// Analytics-B — comparaison N-1 (jour / semaine / mois).
//
// Fenêtres glissantes (now - span) plutôt que calendaires : volontairement
// distinct de la comparaison calendaire du graphique CA d'Analytics.tsx (qui
// n'est PAS touchée). Ici on compare une fenêtre [now-span, now) à la fenêtre
// précédente [now-2·span, now-span).
//
// Schéma réel (≠ template du goal) : statut encaissé = "Encaissé", CA = totalCents,
// couverts = guests, horodatage métier = createdAt (pas _creationTime).
export const getKpiComparison = query({
  args: {
    restaurantId: v.id("restaurants"),
    period: v.union(v.literal("day"), v.literal("week"), v.literal("month")),
  },
  handler: async (ctx, args) => {
    await requireRestaurantAccess(ctx, args.restaurantId)
    const now = Date.now()
    const ms = { day: 86400000, week: 604800000, month: 2592000000 }
    const span = ms[args.period]
    const periodStart = now - span
    const prevStart = now - span * 2
    const prevEnd = periodStart

    const all = await ctx.db
      .query("payments")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .filter(q => q.eq(q.field("status"), "Encaissé"))
      .collect()

    const calc = (from: number, to: number) => {
      const items = all.filter(p => p.createdAt >= from && p.createdAt < to)
      const ca = items.reduce((s, p) => s + p.totalCents, 0)
      const covers = items.reduce((s, p) => s + (p.guests ?? 1), 0)
      // avgTicket en cents (CA / couverts) — formaté côté UI via formatEur.
      return { ca, covers, avgTicket: covers > 0 ? ca / covers : 0, count: items.length }
    }

    const current = calc(periodStart, now)
    const previous = calc(prevStart, prevEnd)
    // null = pas de base de comparaison (période précédente vide) → "—" côté UI.
    const delta = (a: number, b: number) => (b === 0 ? null : Math.round(((a - b) / b) * 100))

    return {
      current,
      previous,
      deltas: {
        ca: delta(current.ca, previous.ca),
        covers: delta(current.covers, previous.covers),
        avgTicket: delta(current.avgTicket, previous.avgTicket),
      },
    }
  },
})
