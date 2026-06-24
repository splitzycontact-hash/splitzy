import { query } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

// Historique des convocations d'un extra (lecture seule, ordre chronologique
// inverse). owner/manager uniquement. L'écriture est faite par l'action d'envoi
// d'email (partie 2).
export const list = query({
  args: { extraId: v.id("extras") },
  handler: async (ctx, { extraId }) => {
    const extra = await ctx.db.get(extraId)
    if (!extra) return []
    await requireRestaurantAccess(ctx, extra.restaurantId, ["owner", "manager"])
    return await ctx.db
      .query("extraConvocations")
      .withIndex("by_extra", q => q.eq("extraId", extraId))
      .order("desc")
      .collect()
  },
})

// Convocations récentes d'un restaurant (toutes confondues), enrichies du nom de
// l'extra + d'un flag `rated` (cette convocation a déjà reçu une note). Alimente
// l'onglet Convocations de la page Extras. Tri sentAt DESC, plafonné à 100.
// owner/manager uniquement.
export const listByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    const convocations = await ctx.db
      .query("extraConvocations")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    convocations.sort((a, b) => b.sentAt - a.sentAt)
    const recent = convocations.slice(0, 100)
    return await Promise.all(
      recent.map(async c => {
        const extra = await ctx.db.get(c.extraId)
        const rated = (extra?.ratings ?? []).some(r => r.convocationId === c._id)
        return {
          _id: c._id,
          extraId: c.extraId,
          firstName: extra?.firstName ?? "",
          lastName: extra?.lastName ?? "",
          subject: c.subject,
          shiftDate: c.shiftDate ?? "",
          shiftStart: c.shiftStart ?? "",
          shiftEnd: c.shiftEnd ?? "",
          sentAt: c.sentAt,
          response: c.response ?? null,
          rated,
        }
      }),
    )
  },
})
