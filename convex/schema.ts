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
    // Message libre affiché aux clients sur l'écran de paiement QR (plat du jour,
    // promo du soir…). Édité depuis MenuPage, persisté via restaurants.updateSpecialMessage.
    specialMessage: v.optional(v.string()),
    // Palier de facturation : free | essentiel | pro. Absent = traité comme
    // "free" côté dashboard (GOAL_BILLING_ESSENTIEL_FIX_RESIDUELS). Assigné
    // UNIQUEMENT via restaurants.setPlanForTesting (CLI) tant que Market Pay
    // n'est pas intégré — jamais modifiable depuis l'app (SECURITY M1).
    plan: v.optional(v.union(v.literal("free"), v.literal("essentiel"), v.literal("pro"))),
    // Champs legacy présents sur d'anciens documents (plus écrits par create/update).
    // Déclarés en optionnel pour que le schéma valide les docs existants en prod.
    status: v.optional(v.string()),
    kycStatus: v.optional(v.string()),
    siret: v.optional(v.string()),
    stripeAccountId: v.optional(v.string()),
    posProvider: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    // Module 3 — Plan de salle : dimensions de la grille du plan (défaut 12×8).
    floorGridCols: v.optional(v.number()),
    floorGridRows: v.optional(v.number()),
    // M11 — Répartition des pourboires (clôture de service). Optionnel : défaut
    // "equal" si absent (restos existants non affectés). Voir restaurants.updateTipSettings.
    tipSettings: v.optional(v.object({
      mode: v.union(
        v.literal("equal"),    // pot commun égalitaire
        v.literal("hours"),    // prorata heures travaillées
        v.literal("points"),   // coefficients par rôle
        v.literal("table"),    // par tables assignées
        v.literal("revenue"),  // prorata CA encaissé
      ),
      kitchenSharePct: v.optional(v.number()), // 0-100, % pour la cuisine
      roleCoefficients: v.optional(v.object({  // mode "points" uniquement
        owner: v.optional(v.number()),
        manager: v.optional(v.number()),
        staff: v.optional(v.number()),
      })),
    })),
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
    // Nom d'affichage libre défini par l'owner/manager (prénom ou surnom).
    // Prioritaire sur firstName/lastName/name partout dans le dashboard.
    displayName: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("staff")),
    status: v.union(v.literal("active"), v.literal("pending")),
    invitedAt: v.number(),
    joinedAt: v.optional(v.number()),
    // Renseigné quand le membre accepte son invitation depuis /restaurant/accept-invite
    // (identité Clerk de la personne qui a accepté). Voir convex/invitations.ts → accept.
    clerkUserId: v.optional(v.string()),
    // Seed DiceBear choisi par le membre pour son avatar dans le chat d'équipe.
    // Si absent, on utilise le prénom par défaut.
    avatarSeed: v.optional(v.string()),
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
    // GOAL_PAIEMENTS_11 — verrou du mode de paiement par sitting : fixé par le
    // premier convive qui agit (tables.choosePaymentMode), appliqué à toute la
    // table. Purgé aux mêmes points que sittingStartedAt. lockedBy = clientId
    // (SessionState.clientId, uuid par onglet — jamais l'IP, partagée en wifi).
    paymentMode: v.optional(v.union(v.literal("item"), v.literal("diviser"))),
    paymentModeLockedAt: v.optional(v.number()),
    paymentModeLockedBy: v.optional(v.string()),
    // Historique des réinitialisations gérant (tables.resetPaymentMode).
    paymentModeHistory: v.optional(v.array(v.object({
      mode: v.string(),
      lockedAt: v.number(),
      lockedBy: v.string(),
      resetBy: v.optional(v.id("members")),
      resetAt: v.optional(v.number()),
    }))),
    orderItems: v.optional(v.array(v.object({
      name: v.string(),
      qty: v.number(),
      unitCents: v.number(),
      paid: v.optional(v.boolean()),
      // GOAL_PAIEMENTS_01 (additif) — grand livre par unité. lineId : uuid par
      // UNITÉ (les nouvelles lignes naissent qty 1 via orderItemsFactory ; les
      // lignes legacy qty > 1 sans lineId restent valides jusqu'au backfill).
      lineId: v.optional(v.string()),
      // Centimes CONFIRMÉS affectés à l'unité (cumulatif, jamais décrémenté par
      // le paiement — remplace à terme le rétrécissement de qty). N'est écrit
      // qu'à la confirmation PSP, jamais par un hold.
      paidCents: v.optional(v.number()),
      // Holds PAR PART (plusieurs réclamants partiels possibles sur une même
      // unité — splitFactor ÷2/÷3/÷4). Un hold ne touche JAMAIS paidCents.
      holds: v.optional(v.array(v.object({
        partId: v.string(),
        claimedBy: v.optional(v.string()),
        capacityCents: v.number(),
        state: v.union(v.literal("reclamee"), v.literal("paiement_attente")),
        expiresAt: v.optional(v.number()),
      }))),
    }))),
    alert: v.optional(v.boolean()),
    // M5 — Salle interactive (actions manager). Tous optionnels → aucun document
    // existant n'est affecté.
    //  forcePaymentMode : la page convive bascule immédiatement en écran paiement
    //    (réactif via tables.getOne, qui expose ce champ — voir projection getOne).
    //  isVip            : badge VIP doré + notif chat au serveur assigné.
    //  closedWithoutPayment : table libérée manuellement sans encaissement.
    forcePaymentMode: v.optional(v.boolean()),
    isVip: v.optional(v.boolean()),
    closedWithoutPayment: v.optional(v.boolean()),
    // Module 3 — Plan de salle : serveur assigné, zone logique, position grille.
    assignedMemberId: v.optional(v.id("members")),
    zoneId: v.optional(v.id("zones")),
    gridX: v.optional(v.number()),
    gridY: v.optional(v.number()),
    // Nom personnalisé (ex: "Terrasse A") affiché à la place de T{number}.
    label: v.optional(v.string()),
    // Forme cosmétique de la pastille sur le plan de salle.
    shape: v.optional(v.union(v.literal("square"), v.literal("round"))),
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
    // Famille de moyen de paiement (union). Valeurs brutes (visa/mastercard/amex/
    // cb…) normalisées via payments.normalizePaymentMethod avant insertion ;
    // données historiques rattrapées par la migration payments.normalizePaymentMethods.
    paymentMethod: v.optional(v.union(
      v.literal("card"),
      v.literal("apple_pay"),
      v.literal("google_pay"),
      v.literal("cash"),
      v.literal("other"),
    )),
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
    // GOAL_PAIEMENTS_01 (additif) — nouveau contrat de create (GOAL_03).
    // idempotencyKey : clé client (uuid) — check-then-insert dans une seule
    // mutation Convex (OCC) = équivalent ON CONFLICT DO NOTHING.
    idempotencyKey: v.optional(v.string()),
    // allocation : ventilation DEMANDÉE à la création (intention, audit).
    // appliedAllocation : ventilation RÉELLE écrite à la confirmation (vérité
    // comptable) — un rejeu de webhook ne re-ventile pas.
    allocation: v.optional(v.array(v.object({
      lineId: v.string(),
      amountCents: v.number(),
    }))),
    appliedAllocation: v.optional(v.array(v.object({
      lineId: v.string(),
      amountCents: v.number(),
    }))),
    // Excédent confirmé non plaçable sur les lignes (table sur-payée, argent
    // déjà prélevé) — tracé, jamais ajouté aux tips en silence, jamais perdu.
    overflowCents: v.optional(v.number()),
    // GOAL_PAIEMENTS_02 — parts gelées par CE paiement (reclamee →
    // paiement_attente à la création). Sert aux filets de GOAL_04 : webhook
    // d'échec et libération de secours retrouvent les parts à relâcher.
    heldParts: v.optional(v.array(v.object({
      lineId: v.string(),
      partId: v.string(),
    }))),
    // GOAL_PAIEMENTS_04 — sitting d'origine du paiement (copiée de la table à
    // la CRÉATION). Une confirmation bancaire tardive (webhook après clôture)
    // se rattache à l'ancienne sitting via CE champ, jamais à celui de la
    // table au moment où le webhook arrive — les chiffres du service suivant
    // restent intacts.
    sittingStartedAt: v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"]).index("by_table", ["tableId"]).index("by_provider_ref", ["provider", "providerRef"])
    .index("by_idempotency_key", ["idempotencyKey"]),

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
    isDailySpecial: v.optional(v.boolean()),
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
    // Pool de confiance — notes laissées par le manager après un service confirmé.
    // Une note par convocation (remplacée si re-notée). La moyenne ★ est calculée
    // côté UI à partir de ce tableau (voir extras.addRating + ExtrasPage).
    ratings: v.optional(
      v.array(
        v.object({
          convocationId: v.id("extraConvocations"),
          stars: v.number(),            // borné 1..5 à l'écriture
          comment: v.optional(v.string()),
          ratedAt: v.number(),
          ratedBy: v.optional(v.id("members")),
        }),
      ),
    ),
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

  // M6 Chat interne (gérant ↔ staff). threadId canonique :
  //   broadcast → "broadcast" ; 1:1 → [memberA, memberB].sort().join('|').
  // readBy porte les memberIds ayant lu (badges unread). Voir convex/messages.ts.
  messages: defineTable({
    restaurantId: v.id("restaurants"),
    senderId: v.id("members"),
    recipientId: v.optional(v.id("members")),
    threadId: v.string(),
    content: v.string(),
    createdAt: v.number(),
    readBy: v.array(v.id("members")),
  })
    .index("by_restaurant_thread", ["restaurantId", "threadId"])
    .index("by_restaurant_date", ["restaurantId", "createdAt"]),

  // Leads marketing capturés par le calculateur de rentabilité (/rentabilite).
  // computedGapEuros : écart estimé €/mois vs coût matière de référence, calculé
  // CÔTÉ SERVEUR dans leads.submitLead (jamais la valeur envoyée par le client).
  // Estimation sectorielle générique — pas une analyse des données du restaurant.
  leads: defineTable({
    email: v.string(),
    restaurantType: v.string(),
    monthlyRevenueRange: v.string(),
    foodCostPercent: v.number(),
    computedGapEuros: v.number(),
    source: v.string(),          // ex. "calculateur_rentabilite"
    createdAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

  // Demandes entrantes du formulaire /contact (démo, support, presse, partenariat).
  // Table distincte de `leads` : leads est spécifique au calculateur de rentabilité
  // (champs chiffrés requis — restaurantType, foodCostPercent, computedGapEuros)
  // et mélanger les deux formes affaiblirait la validation des deux flux.
  demoRequests: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    restaurantName: v.optional(v.string()),
    subject: v.string(),        // demo | support | press | partner | other
    message: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_created", ["createdAt"]),

  // Rate limiting générique — une entrée par clé (ex. "campaign:restaurantId").
  // Fenêtre glissante : count incrémenté dans la même fenêtre, reset au-delà.
  rateLimits: defineTable({
    key: v.string(),        // identifiant de la ressource protégée
    count: v.number(),      // nombre de requêtes dans la fenêtre courante
    windowStart: v.number(), // timestamp ms du début de la fenêtre
  }).index("by_key", ["key"]),

  // ---- Tables admin (portées depuis le monorepo Splitzy/ — GOAL_ADMIN_01) ----
  // Ajouts purs : aucune table existante ci-dessus n'est modifiée. Alimentées et
  // lues uniquement par l'app admin interne (convex/admin.ts, billing.ts, etc.).

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
    plan: v.union(v.literal("free"), v.literal("essentiel"), v.literal("pro")),
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
    isAdminReply: v.optional(v.boolean()),
  }).index("by_ticket", ["ticketId"]),

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

  // Table VIDE en prod : aucun PSP réel n'écrit dedans (les vrais paiements vivent
  // dans `payments`). Présente pour que les fonctions admin (transactions.ts,
  // admin.ts) compilent et tournent — elles retombent sur `payments` si vide.
  // GOAL_ADMIN_05. sessionId/dinerId réfèrent sessions/diners (tables du monorepo,
  // absentes ici) : id-refs = string brandé, tolérées (jamais écrites).
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
})
