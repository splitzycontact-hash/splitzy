import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

export const createBulk = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    count: v.number(),
    capacity: v.number(),
  },
  handler: async (ctx, { restaurantId, count, capacity }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    const existing = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const existingNumbers = new Set(existing.map(t => t.number))
    for (let i = 1; i <= count; i++) {
      if (existingNumbers.has(i)) continue
      await ctx.db.insert("tables", {
        restaurantId,
        number: i,
        capacity,
        status: "free",
      })
    }
  },
})

export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    return ctx.db.query("tables").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).collect()
  },
})

// Lit une table par son _id. Utilisé par le flow client (Landing, Items) pour
// suivre en temps réel l'état de paiement (paidCents, amountCents).
// Retourne null si la table n'existe plus — jamais de throw côté query.
export const getOne = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    return (await ctx.db.get(tableId)) ?? null
  },
})

// Patch conditionnel : on ne touche qu'aux champs explicitement fournis. Sinon
// Convex efface les champs passés à `undefined` — un scan QR (status only)
// effacerait sinon amountCents/orderItems posés par la simulation du gérant.
//
// Reset paidCents/paidTipCents UNIQUEMENT si la table était libre ou déjà
// entièrement payée (= nouvelle sitting démarre). Pour les sittings en cours
// (dining/payment) on préserve les paiements déjà encaissés.
export const updateStatus = mutation({
  args: {
    tableId: v.id("tables"),
    status: v.union(v.literal("free"), v.literal("dining"), v.literal("payment"), v.literal("paid")),
    guests: v.optional(v.number()),
    amountCents: v.optional(v.number()),
    orderItems: v.optional(v.array(v.object({
      name: v.string(),
      qty: v.number(),
      unitCents: v.number(),
    }))),
  },
  handler: async (ctx, { tableId, status, guests, amountCents, orderItems }) => {
    const existing = await ctx.db.get(tableId)
    if (!existing) throw new Error("Table introuvable")
    const patch: Record<string, unknown> = { status }
    if (guests !== undefined) patch.guests = Math.max(0, guests)
    if (amountCents !== undefined) {
      patch.amountCents = Math.max(0, amountCents)
      const wasFreshSitting = !existing
        || existing.status === "free"
        || existing.status === "paid"
        || (existing.paidCents ?? 0) === 0
      if (wasFreshSitting) {
        patch.paidCents = undefined
        patch.paidTipCents = undefined
      }
    }
    // SECURITY (Vuln 2) : mutation convive ANONYME. On borne/assainit les entrées
    // pour qu'un appelant non authentifié ne puisse pas injecter des orderItems
    // démesurés ou négatifs (nb d'items, longueur de nom, qty, prix plafonnés).
    if (orderItems !== undefined) {
      patch.orderItems = orderItems.slice(0, 200).map(it => ({
        name: String(it.name).slice(0, 120),
        qty: Math.max(0, Math.min(999, Math.floor(it.qty))),
        unitCents: Math.max(0, Math.min(100_000_000, Math.floor(it.unitCents))),
      }))
    }
    await ctx.db.patch(tableId, patch)
  },
})

export const resetToFree = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, {
      status: 'free',
      guests: undefined,
      amountCents: undefined,
      orderItems: undefined,
      alert: undefined,
      paidCents: undefined,
      paidTipCents: undefined,
    })
  },
})

export const importAmounts = mutation({
  args: {
    rows: v.array(v.object({ tableId: v.id("tables"), amountCents: v.number() })),
  },
  handler: async (ctx, { rows }) => {
    const verified = new Set<string>()
    for (const { tableId, amountCents } of rows) {
      const table = await ctx.db.get(tableId)
      if (!table) throw new Error("Table introuvable")
      if (!verified.has(table.restaurantId)) {
        await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
        verified.add(table.restaurantId)
      }
      await ctx.db.patch(tableId, {
        amountCents: Math.max(0, amountCents),
        status: 'dining',
        paidCents: undefined,
        paidTipCents: undefined,
      })
    }
  },
})

// Auto-création paresseuse d'une table manquante. Utilisé par TableEntry quand
// un client scanne un QR de table qui n'a pas encore de document Convex
// (ex: setup partiel, ou ajout d'une table sans re-run createBulk).
// Retourne l'_id de la table existante ou nouvellement créée.
export const ensureForRestaurant = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    number: v.number(),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, { restaurantId, number, capacity }) => {
    const all = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const existing = all.find(t => t.number === number)
    if (existing) return existing._id
    return ctx.db.insert("tables", {
      restaurantId,
      number,
      capacity: capacity ?? 4,
      status: "free",
    })
  },
})
