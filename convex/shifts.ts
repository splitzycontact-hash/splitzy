import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

// Module 3 — Planning de service : créneaux de présence du personnel + vue
// agrégée du service du jour (plan de salle + staff présent).

const ZONE = v.union(
  v.literal("salle"), v.literal("bar"), v.literal("cuisine"),
  v.literal("caisse"), v.literal("terrasse"), v.literal("autre"),
)

export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    memberId: v.id("members"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    zone: v.optional(ZONE),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRestaurantAccess(ctx, args.restaurantId, ["owner", "manager"])
    return ctx.db.insert("shifts", {
      restaurantId: args.restaurantId,
      memberId: args.memberId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      zone: args.zone,
      notes: args.notes,
      createdAt: Date.now(),
    })
  },
})

// Pointage d'arrivée. Staff autorisé (un serveur peut pointer lui-même).
export const checkIn = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, { shiftId }) => {
    const shift = await ctx.db.get(shiftId)
    if (!shift) throw new Error("Créneau introuvable")
    await requireRestaurantAccess(ctx, shift.restaurantId)
    await ctx.db.patch(shiftId, { checkedInAt: Date.now() })
    return shiftId
  },
})

// Pointage de départ.
export const checkOut = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, { shiftId }) => {
    const shift = await ctx.db.get(shiftId)
    if (!shift) throw new Error("Créneau introuvable")
    await requireRestaurantAccess(ctx, shift.restaurantId)
    await ctx.db.patch(shiftId, { checkedOutAt: Date.now() })
    return shiftId
  },
})

export const remove = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, { shiftId }) => {
    const shift = await ctx.db.get(shiftId)
    if (!shift) return null
    await requireRestaurantAccess(ctx, shift.restaurantId, ["owner", "manager"])
    await ctx.db.delete(shiftId)
    return shiftId
  },
})

// Tous les créneaux d'une fenêtre [dateFrom, dateTo] (semaine d'équipe interne),
// enrichis du nom du membre. Utilisé par l'onglet Équipe du planning.
export const listByWeek = query({
  args: {
    restaurantId: v.id("restaurants"),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { restaurantId, dateFrom, dateTo }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    const list = await ctx.db
      .query("shifts")
      .withIndex("by_restaurant_date", q => q.eq("restaurantId", restaurantId))
      .filter(q =>
        q.and(q.gte(q.field("date"), dateFrom), q.lte(q.field("date"), dateTo)),
      )
      .collect()
    return Promise.all(
      list.map(async s => {
        const m = await ctx.db.get(s.memberId)
        const memberName = m
          ? (m.displayName
              ?? (m.firstName ? `${m.firstName} ${m.lastName ?? ""}`.trim() : null)
              ?? m.name)
          : "Inconnu"
        return { ...s, memberName }
      }),
    )
  },
})

// Vue agrégée du service du jour : grille du plan, zones, tables complètes et
// staff présent (couvre le plan de salle + le planning live).
// Retourne null si non authentifié (jamais de throw côté lecture).
export const getServiceOverview = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const today = new Date().toISOString().slice(0, 10)
    const [shifts, tables, zones] = await Promise.all([
      ctx.db
        .query("shifts")
        .withIndex("by_restaurant_date", q =>
          q.eq("restaurantId", restaurantId).eq("date", today),
        )
        .collect(),
      ctx.db
        .query("tables")
        .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
        .collect(),
      ctx.db
        .query("zones")
        .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
        .collect(),
    ])
    const restaurant = await ctx.db.get(restaurantId)

    const staffToday = await Promise.all(
      shifts.map(async (s, idx) => {
        const member = await ctx.db.get(s.memberId)
        const memberName = member
          ? (member.displayName
              ?? (member.firstName ? `${member.firstName} ${member.lastName ?? ""}`.trim() : null)
              ?? member.name)
          : "Inconnu"
        return {
          shiftId: s._id,
          memberId: s.memberId,
          memberName,
          displayName: member?.displayName,
          zone: s.zone,
          startTime: s.startTime,
          endTime: s.endTime,
          checkedInAt: s.checkedInAt,
          checkedOutAt: s.checkedOutAt,
          isPresent: !!s.checkedInAt && !s.checkedOutAt,
          colorIndex: idx % 6,
        }
      }),
    )

    return {
      gridCols: restaurant?.floorGridCols ?? 12,
      gridRows: restaurant?.floorGridRows ?? 8,
      zones: zones.sort((a, b) => a.order - b.order),
      tables,
      staffToday,
    }
  },
})
