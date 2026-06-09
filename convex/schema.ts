import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  restaurants: defineTable({
    name: v.string(),
    slug: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    type: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    suspended: v.optional(v.boolean()),
    qrColor: v.optional(v.string()),
    // Champs legacy présents sur d'anciens documents (plus écrits par create/update).
    // Déclarés en optionnel pour que le schéma valide les docs existants en prod.
    plan: v.optional(v.string()),
    status: v.optional(v.string()),
    kycStatus: v.optional(v.string()),
    siret: v.optional(v.string()),
    stripeAccountId: v.optional(v.string()),
    posProvider: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
  }).index("by_slug", ["slug"])
    .index("by_clerk_user", ["clerkUserId"]),

  insights: defineTable({
    restaurantId: v.id("restaurants"),
    generatedAt: v.number(),
    period: v.string(),
    insights: v.array(v.object({
      type: v.string(),
      priority: v.string(),
      title: v.string(),
      body: v.string(),
      metric: v.optional(v.string()),
      action: v.optional(v.string()),
    })),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_date", ["restaurantId", "generatedAt"]),

  members: defineTable({
    restaurantId: v.id("restaurants"),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("staff")),
    status: v.union(v.literal("active"), v.literal("pending")),
    invitedAt: v.number(),
    joinedAt: v.optional(v.number()),
    // Renseigné quand le membre accepte son invitation depuis /restaurant/accept-invite
    // (identité Clerk de la personne qui a accepté). Voir convex/invitations.ts → accept.
    clerkUserId: v.optional(v.string()),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_clerkUserId", ["clerkUserId"]),

  // Invitations d'équipe envoyées par email (Resend). Le lien d'acceptation porte
  // un token UUID ; à l'acceptation on crée/active une ligne `members`. Voir
  // convex/invitations.ts (create/getByToken/listByRestaurant/accept).
  restaurantInvitations: defineTable({
    restaurantId: v.id("restaurants"),
    email: v.string(),
    role: v.union(v.literal("gerant"), v.literal("manager"), v.literal("viewer")),            // 'gerant' | 'manager' | 'viewer'
    token: v.string(),           // UUID unique
    status: v.string(),          // 'pending' | 'accepted' | 'expired'
    createdAt: v.number(),
    expiresAt: v.number(),       // createdAt + 7 jours
  })
    .index("by_token", ["token"])
    .index("by_restaurant", ["restaurantId"]),

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
    firstName: v.optional(v.string()),
    avatarIndex: v.optional(v.number()),
    // Coordonnées laissées sur /confirmation, backfillées via customers.saveContact(paymentId).
    // Servent au regroupement client (1 paiement = 1 client, fusion par phone/email).
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.union(v.literal("Encaissé"), v.literal("En attente"), v.literal("Remboursé")),
    createdAt: v.number(),
    dateLabel: v.string(),
    // PSP (Vuln 1) : paiement créé "En attente" par le client ; passé "Encaissé"
    // uniquement par le webhook PSP signé (http.ts → confirmPayment), matché sur
    // (provider, providerRef). paidItemNames persisté pour la réconciliation table
    // au moment de la confirmation (et non plus à la création).
    provider: v.optional(v.string()),
    providerRef: v.optional(v.string()),
    paidItemNames: v.optional(v.array(v.string())),
  }).index("by_restaurant", ["restaurantId"]).index("by_table", ["tableId"]).index("by_provider_ref", ["provider", "providerRef"]),

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
    // SECURITY (Vuln 7 — risque acté/documenté) : apiKey/extraKey POS stockés en
    // clair. Masqués en lecture API (posIntegrations.listByRestaurant/getByProvider
    // strippent apiKey). Le chiffrement au repos exigerait de déplacer l'écriture
    // dans une action (le runtime mutation Convex interdit l'IV aléatoire requis par
    // AES-GCM — contrainte de déterminisme) ; à faire via une action + KMS si on
    // élève l'exigence. PII clients (customers.phone/email) : volontairement en clair
    // car la déduplication CRM se fait par contact ; conformité RGPD assurée par
    // consentement explicite (marketingConsent) + lien de désabonnement.
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
    isAvailable: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    allergenes: v.optional(v.string()),
  }).index("by_restaurant", ["restaurantId"]),

  // Profils clients (CRM) — coordonnées laissées volontairement par le client
  // sur l'écran de confirmation pour recevoir les offres du restaurant.
  customers: defineTable({
    restaurantId: v.id("restaurants"),
    tableNumber: v.optional(v.number()),
    firstName: v.optional(v.string()),
    avatarIndex: v.optional(v.number()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    marketingConsent: v.optional(v.boolean()),
    consentAt: v.optional(v.number()),
    manualVip: v.optional(v.boolean()),
    // Paiement associé (dernier en date) — lie le contact CRM à un paiement précis.
    paymentId: v.optional(v.id("payments")),
    createdAt: v.number(),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_phone", ["restaurantId", "phone"])
    .index("by_restaurant_email", ["restaurantId", "email"]),
})
