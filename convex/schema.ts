import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  restaurants: defineTable({
    name: v.string(),
    slug: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    type: v.string(),
    clerkUserId: v.optional(v.string()),
    suspended: v.optional(v.boolean()),
    // Champs legacy présents sur d'anciens documents (plus écrits par create/update).
    // Déclarés en optionnel pour que le schéma valide les docs existants en prod.
    plan: v.optional(v.string()),
    status: v.optional(v.string()),
    kycStatus: v.optional(v.string()),
    siret: v.optional(v.string()),
    stripeAccountId: v.optional(v.string()),
    posProvider: v.optional(v.string()),
  }).index("by_slug", ["slug"])
    .index("by_clerk_user", ["clerkUserId"]),

  tables: defineTable({
    restaurantId: v.id("restaurants"),
    number: v.number(),
    capacity: v.number(),
    status: v.union(v.literal("free"), v.literal("dining"), v.literal("payment"), v.literal("paid")),
    guests: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    amountCents: v.optional(v.number()),
    // Paiements partiels cumulés sur la sitting courante (remis à zéro au release
    // et au démarrage d'une nouvelle sitting). Détail des paiements dans `payments`.
    paidCents: v.optional(v.number()),
    paidTipCents: v.optional(v.number()),
    orderItems: v.optional(v.array(v.object({
      name: v.string(),
      qty: v.number(),
      unitCents: v.number(),
      paid: v.optional(v.boolean()),
    }))),
    alert: v.optional(v.boolean()),
  }).index("by_restaurant", ["restaurantId"]),

  payments: defineTable({
    restaurantId: v.id("restaurants"),
    tableId: v.id("tables"),
    tableNumber: v.number(),
    guests: v.number(),
    subtotalCents: v.number(),
    tipCents: v.number(),
    commissionCents: v.number(),
    totalCents: v.number(),
    paymentMethod: v.string(),
    status: v.union(v.literal("Encaissé"), v.literal("En attente"), v.literal("Remboursé")),
    createdAt: v.number(),
    dateLabel: v.string(),
  }).index("by_restaurant", ["restaurantId"]),

  feedbacks: defineTable({
    restaurantId: v.id("restaurants"),
    tableId: v.id("tables"),
    tableNumber: v.number(),
    stars: v.number(),
    tags: v.array(v.string()),
    text: v.string(),
    isNew: v.boolean(),
    createdAt: v.number(),
    timeLabel: v.string(),
    deliveredAt: v.optional(v.number()),
    managerReply: v.optional(v.string()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_new", ["restaurantId", "isNew"]),

  posIntegrations: defineTable({
    restaurantId: v.id("restaurants"),
    provider: v.string(),
    apiKey: v.string(),
    locationId: v.optional(v.string()),
    extraKey: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("error"), v.literal("pending")),
    lastSyncAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    syncedTableCount: v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_provider", ["restaurantId", "provider"]),

  menuItems: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    category: v.string(),
    priceCents: v.number(),
    emoji: v.string(),
    description: v.optional(v.string()),
  }).index("by_restaurant", ["restaurantId"]),
})
