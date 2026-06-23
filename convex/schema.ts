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
    // Module 3 — Plan de salle : dimensions de la grille du plan (défaut 12×8).
    floorGridCols: v.optional(v.number()),
    floorGridRows: v.optional(v.number()),
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
    // Prénom / nom réels (recopiés depuis Clerk à l'acceptation d'invitation ou via
    // members.syncMyProfile). Optionnels : les lignes anciennes n'en ont pas et
    // retombent sur `name` (dérivé de l'email) côté UI.
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
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
    // Ouverture de la sitting courante (epoch ms) — posé quand le gérant ouvre
    // une table libre via tables.addOrderItems, effacé au resetToFree.
    // Optionnel : les sittings ouvertes par la caisse ou un scan QR n'en ont pas.
    sittingStartedAt: v.optional(v.number()),
    orderItems: v.optional(v.array(v.object({
      name: v.string(),
      qty: v.number(),
      unitCents: v.number(),
      paid: v.optional(v.boolean()),
    }))),
    alert: v.optional(v.boolean()),
    // Module 3 — Plan de salle : serveur assigné, zone logique, position grille.
    assignedMemberId: v.optional(v.id("members")),
    zoneId: v.optional(v.id("zones")),
    gridX: v.optional(v.number()),
    gridY: v.optional(v.number()),
    zone: v.optional(v.union(
      v.literal("salle"), v.literal("bar"), v.literal("cuisine"),
      v.literal("caisse"), v.literal("terrasse"), v.literal("autre"),
    )),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_zone", ["zoneId"]),

  // Module 3 — Plan de salle : zones logiques (salle, terrasse, bar…).
  zones: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    color: v.string(),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_restaurant", ["restaurantId"]),

  // Module 3 — Planning de service : créneaux de présence du personnel.
  shifts: defineTable({
    restaurantId: v.id("restaurants"),
    memberId: v.id("members"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    zone: v.optional(v.union(
      v.literal("salle"), v.literal("bar"), v.literal("cuisine"),
      v.literal("caisse"), v.literal("terrasse"), v.literal("autre"),
    )),
    checkedInAt: v.optional(v.number()),
    checkedOutAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_date", ["restaurantId", "date"])
    .index("by_member", ["memberId"]),

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

  // Extras — personnel d'appoint (remplacements / renforts) du carnet de contacts
  // du restaurant. PAS de compte Splitzy ni d'accès dashboard : ce sont de simples
  // contacts que le gérant/manager peut convoquer par email (cf extraConvocations).
  // `createdBy` optionnel : le propriétaire (restaurants.clerkUserId) n'a pas de
  // ligne `members`, donc pas d'id membre à référencer.
  extras: defineTable({
    restaurantId: v.id("restaurants"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    skills: v.array(v.string()),        // ids: serveur|barman|cuisine|caisse|livraison|autre
    notes: v.optional(v.string()),      // notes internes du manager
    isActive: v.boolean(),              // archivage doux (jamais de delete)
    createdAt: v.number(),
    createdBy: v.optional(v.id("members")),
  }).index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_active", ["restaurantId", "isActive"]),

  // Historique des convocations envoyées à un extra (envoi email = partie 2).
  // Lecture seule côté UI. `sentBy` optionnel pour la même raison que
  // extras.createdBy (le propriétaire n'a pas de ligne `members`).
  extraConvocations: defineTable({
    restaurantId: v.id("restaurants"),
    extraId: v.id("extras"),
    sentBy: v.optional(v.id("members")),
    subject: v.string(),
    message: v.string(),
    shiftDate: v.optional(v.string()),    // "2026-06-21"
    shiftStart: v.optional(v.string()),   // "12:00"
    shiftEnd: v.optional(v.string()),     // "16:00"
    sentAt: v.number(),
    emailStatus: v.union(v.literal("sent"), v.literal("failed")),
    // Réponse de l'extra via les liens publics de l'email (endpoint /api/extra-response).
    // responseToken : secret d'URL non devinable, identifie la convocation sans auth.
    // response : "pending" à l'envoi, figé à "accepted"/"declined" à la 1ʳᵉ réponse (définitive).
    responseToken: v.optional(v.string()),
    response: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined"),
        v.literal("counter_proposed"),
      ),
    ),
    respondedAt: v.optional(v.number()),
    // Contre-proposition d'horaire par l'extra. Si l'extra propose un autre créneau,
    // response passe à "counter_proposed" et ces champs portent le créneau souhaité.
    // managerResponseToken : secret d'URL pour la décision du gérant (accept/decline)
    // depuis l'email de contre-proposition (endpoint /api/manager-counter).
    counterProposedStart: v.optional(v.string()),   // "12:00"
    counterProposedEnd: v.optional(v.string()),     // "14:00"
    counterMessage: v.optional(v.string()),
    managerResponseToken: v.optional(v.string()),
    managerResponse: v.optional(
      v.union(v.literal("accepted"), v.literal("declined")),
    ),
    managerRespondedAt: v.optional(v.number()),
  }).index("by_extra", ["extraId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_token", ["responseToken"]),
})
