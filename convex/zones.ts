import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

// Module 3 — Plan de salle : zones logiques d'un restaurant (salle, terrasse,
// bar…). Les tables y sont rattachées via tables.zoneId.

// Query — retourne [] si non authentifié (jamais de throw côté lecture).
export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const zones = await ctx.db
      .query("zones")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    return zones.sort((a, b) => a.order - b.order)
  },
})

export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    color: v.string(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, { restaurantId, name, color, order }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    // À défaut d'ordre fourni, place la zone en fin de liste.
    let resolvedOrder = order
    if (resolvedOrder === undefined) {
      const existing = await ctx.db
        .query("zones")
        .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
        .collect()
      resolvedOrder = existing.length
    }
    return ctx.db.insert("zones", {
      restaurantId,
      name,
      color,
      order: resolvedOrder,
      createdAt: Date.now(),
    })
  },
})

export const rename = mutation({
  args: {
    zoneId: v.id("zones"),
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { zoneId, name, color }) => {
    const zone = await ctx.db.get(zoneId)
    if (!zone) throw new Error("Zone introuvable")
    await requireRestaurantAccess(ctx, zone.restaurantId, ["owner", "manager"])
    const patch: Record<string, unknown> = { name }
    if (color !== undefined) patch.color = color
    await ctx.db.patch(zoneId, patch)
    return zoneId
  },
})

// Avant suppression, détache toutes les tables liées (zoneId: undefined) pour
// éviter des références orphelines, puis supprime la zone.
export const remove = mutation({
  args: { zoneId: v.id("zones") },
  handler: async (ctx, { zoneId }) => {
    const zone = await ctx.db.get(zoneId)
    if (!zone) return null
    await requireRestaurantAccess(ctx, zone.restaurantId, ["owner", "manager"])
    const linked = await ctx.db
      .query("tables")
      .withIndex("by_zone", q => q.eq("zoneId", zoneId))
      .collect()
    for (const t of linked) {
      await ctx.db.patch(t._id, { zoneId: undefined })
    }
    await ctx.db.delete(zoneId)
    return zoneId
  },
})
