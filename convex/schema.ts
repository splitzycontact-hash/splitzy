import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    role: v.union(
      v.literal("super_admin"), v.literal("admin_support"),
      v.literal("viewer"), v.literal("gerant")
    ),
    totpEnabled: v.optional(v.boolean()),
  }).index("by_clerk_id", ["clerkUserId"])
    .index("by_role", ["role"]),

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
    // Déclarés en optionnel pour que le schéma valide les docs existants.
    plan: v.optional(v.string()),
    status: v.optional(v.string()),
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
    // et à chaque nouveau montant). Le détail par paiement vit dans `payments` (ledger CA) ;
    // ces agrégats servent au calcul payé/restant temps réel côté dashboard.
    paidCents: v.optional(v.number()),
    paidTipCents: v.optional(v.number()),
    orderItems: v.optional(v.array(v.object({
      name: v.string(),
      qty: v.number(),
      unitCents: v.number(),
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
    deliveredAt: v.optional(v.number()),
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

  sessions: defineTable({
    restaurantId: v.id("restaurants"),
    tableId: v.id("tables"),
    status: v.union(
      v.literal("open"), v.literal("partial"),
      v.literal("paid"), v.literal("abandoned"), v.literal("closed")
    ),
    closedAt: v.optional(v.number()),
    totalCents: v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_table", ["tableId"]),

  diners: defineTable({
    sessionId: v.id("sessions"),
    firstName: v.string(),
    avatar: v.optional(v.string()),
    joinedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  transactions: defineTable({
    restaurantId: v.id("restaurants"),
    sessionId: v.id("sessions"),
    dinerId: v.optional(v.id("diners")),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    amountCents: v.number(),
    tipCents: v.optional(v.number()),
    commissionCents: v.optional(v.number()),
    status: v.union(
      v.literal("pending"), v.literal("succeeded"),
      v.literal("failed"), v.literal("refunded"), v.literal("disputed")
    ),
    failureCode: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
    rawStripeEvent: v.optional(v.any()),
    succeededAt: v.optional(v.number()),
    ipAddress: v.optional(v.string()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_date", ["restaurantId", "succeededAt"])
    .index("by_session", ["sessionId"])
    .index("by_stripe_pi", ["stripePaymentIntentId"])
    .index("by_ip", ["ipAddress"]),

  disputes: defineTable({
    transactionId: v.id("transactions"),
    stripeDisputeId: v.optional(v.string()),
    amountCents: v.number(),
    reason: v.optional(v.string()),
    status: v.string(),
    evidenceDueBy: v.optional(v.number()),
  }).index("by_transaction", ["transactionId"]),

  subscriptions: defineTable({
    restaurantId: v.id("restaurants"),
    plan: v.union(v.literal("free"), v.literal("pro")),
    status: v.union(
      v.literal("active"), v.literal("past_due"),
      v.literal("canceled"), v.literal("paused")
    ),
    amountCents: v.optional(v.number()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    dunningAttempts: v.optional(v.number()),
    nextAttemptAt: v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"]),

  stripeWebhookEvents: defineTable({
    eventId: v.string(),
    processedAt: v.number(),
    status: v.union(
      v.literal("processed"), v.literal("failed"), v.literal("dead_letter")
    ),
    failureCount: v.optional(v.number()),
  }).index("by_event_id", ["eventId"]),

  tickets: defineTable({
    restaurantId: v.optional(v.id("restaurants")),
    subject: v.string(),
    status: v.union(
      v.literal("new"), v.literal("in_progress"),
      v.literal("waiting_customer"), v.literal("resolved"), v.literal("closed")
    ),
    priority: v.union(
      v.literal("low"), v.literal("normal"),
      v.literal("high"), v.literal("urgent")
    ),
    assignedTo: v.optional(v.id("users")),
    createdBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_status", ["status"]),

  ticketMessages: defineTable({
    ticketId: v.id("tickets"),
    authorId: v.optional(v.id("users")),
    body: v.string(),
    isInternal: v.optional(v.boolean()),
  }).index("by_ticket", ["ticketId"]),

  bugs: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    severity: v.union(
      v.literal("critical"), v.literal("high"), v.literal("medium"),
      v.literal("low"), v.literal("info")
    ),
    status: v.union(
      v.literal("open"), v.literal("investigating"),
      v.literal("resolved"), v.literal("wontfix")
    ),
    restaurantId: v.optional(v.id("restaurants")),
    assignedTo: v.optional(v.id("users")),
    githubIssueUrl: v.optional(v.string()),
    stackTrace: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
    resolvedAt: v.optional(v.number()),
  }).index("by_status_severity", ["status", "severity"])
    .index("by_restaurant", ["restaurantId"]),

  auditLogs: defineTable({
    actorId: v.optional(v.id("users")),
    actorLabel: v.optional(v.string()),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    isImpersonation: v.optional(v.boolean()),
    diff: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_actor", ["actorId"])
    .index("by_resource", ["resourceType", "resourceId"]),

  featureFlags: defineTable({
    key: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("dev"), v.literal("beta"),
      v.literal("active"), v.literal("disabled")
    ),
    rolloutType: v.union(
      v.literal("boolean"), v.literal("percentage"), v.literal("allowlist")
    ),
    rolloutValue: v.optional(v.object({
      percent: v.optional(v.number()),
      restaurantIds: v.optional(v.array(v.string())),
    })),
  }).index("by_key", ["key"]),

  restaurantNotes: defineTable({
    restaurantId: v.id("restaurants"),
    authorId: v.id("users"),
    body: v.string(),
  }).index("by_restaurant", ["restaurantId"]),
})
