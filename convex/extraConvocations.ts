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
