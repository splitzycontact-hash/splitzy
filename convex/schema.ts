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
