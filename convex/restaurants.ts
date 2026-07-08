import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server"
import { ConvexError, v } from "convex/values"
import { requireRestaurantAccess, requireIdentity } from "./authz"
import { isAdminAccess, resolveAdminUser } from "./lib"

// ── Admin (app admin interne) — GOAL_ADMIN_06, additif ───────────────────────
// Resolves the acting admin via Clerk identity OR the allowlisted authEmail
// fallback (the admin app has no Clerk→Convex JWT, so identity is null there).
async function requireAdmin(ctx: any, authEmail?: string) {
  const user = await resolveAdminUser(ctx, authEmail);
  if (!user || !["super_admin", "admin_support"].includes(user.role)) {
    throw new ConvexError("Insufficient permissions");
  }
  return user;
}

export const getTableContext = query({
  args: { slug: v.string(), tableNumber: v.number() },
  handler: async (ctx, { slug, tableNumber }) => {
    const restaurant = await ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", slug)).first()
    if (!restaurant) return null
    const tables = await ctx.db.query("tables").withIndex("by_restaurant", q => q.eq("restaurantId", restaurant._id)).collect()
    const table = tables.find(t => t.number === tableNumber) ?? null
    // SECURITY (Vuln 3) : point d'entrée convive ANONYME (slug public). On retire
    // les champs sensibles owner/finance du doc restaurant avant de le renvoyer.
    const safeRestaurant = { ...restaurant }
    delete safeRestaurant.clerkUserId
    delete safeRestaurant.kycStatus
    delete safeRestaurant.siret
    delete safeRestaurant.stripeAccountId
    delete safeRestaurant.posProvider
    // GOAL_PAIEMENTS_08 — rollout du nouvel écran de paiement fractionné :
    // évalué CÔTÉ SERVEUR (allowlist par restaurantId, flag
    // NOUVEAU_PAIEMENT_FRACTIONNE). Flag absent / disabled / restaurant hors
    // allowlist → false → le client rend l'ancien écran 3 onglets, inchangé.
    const flag = await ctx.db.query("featureFlags")
      .withIndex("by_key", q => q.eq("key", "NOUVEAU_PAIEMENT_FRACTIONNE"))
      .unique()
    const newPaymentFlow = !!flag
      && (flag.status === "active" || flag.status === "beta")
      && flag.rolloutType === "allowlist"
      && !!flag.rolloutValue?.restaurantIds?.includes(restaurant._id)
    // GOAL_PAIEMENTS_12 — verrou du mode de paiement par table : flag SÉPARÉ
    // (activable/désactivable indépendamment du paiement fractionné). `table`
    // est renvoyée entière et porte déjà paymentMode : le premier rendu client
    // (avant WebSocket) connaît donc le mode verrouillé.
    const verrouFlag = await ctx.db.query("featureFlags")
      .withIndex("by_key", q => q.eq("key", "VERROU_MODE_PAIEMENT"))
      .unique()
    const verrouModePaiement = !!verrouFlag
      && (verrouFlag.status === "active" || verrouFlag.status === "beta")
      && verrouFlag.rolloutType === "allowlist"
      && !!verrouFlag.rolloutValue?.restaurantIds?.includes(restaurant._id)
    return { restaurant: safeRestaurant, table, newPaymentFlow, verrouModePaiement }
  },
})

export const update = mutation({
  args: {
    id: v.id("restaurants"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    type: v.optional(v.string()),
    // SECURITY (M1): `plan` retiré des champs modifiables par l'owner. Le plan
    // ne doit changer que via billing/admin, sinon un gérant se met "pro"
    // gratuitement (aucun contrôle de facturation côté serveur sur ce champ).
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireRestaurantAccess(ctx, id, ["owner"])
    await ctx.db.patch(id, patch)
  },
})

export const updateSpecialMessage = mutation({
  args: { restaurantId: v.id("restaurants"), message: v.string() },
  handler: async (ctx, { restaurantId, message }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    await ctx.db.patch(restaurantId, { specialMessage: message.trim() || undefined })
  },
})

// M11 — Répartition des pourboires (clôture de service). Owner/manager seulement.
// tipSettings absent ⇒ défaut "equal" côté calcul (ce champ reste optionnel en DB).
export const updateTipSettings = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tipSettings: v.object({
      mode: v.union(
        v.literal("equal"),
        v.literal("hours"),
        v.literal("points"),
        v.literal("table"),
        v.literal("revenue"),
      ),
      kitchenSharePct: v.optional(v.number()),
      roleCoefficients: v.optional(v.object({
        owner: v.optional(v.number()),
        manager: v.optional(v.number()),
        staff: v.optional(v.number()),
      })),
    }),
  },
  handler: async (ctx, { restaurantId, tipSettings }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    await ctx.db.patch(restaurantId, { tipSettings })
  },
})

// Message spécial (plat du jour…) affiché au convive ANONYME sur l'écran de
// paiement. Public, par restaurantId (id Convex non énumérable). Ne renvoie QUE
// ce champ cosmétique destiné à tous les clients — aucune donnée sensible.
export const getSpecialMessage = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const r = await ctx.db.get(restaurantId)
    return r?.specialMessage ?? null
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    // SECURITY (H2): query consumer ANONYME (par slug public, énumérable). On
    // retire les champs sensibles owner/finance avant de renvoyer le doc :
    // clerkUserId (id owner interne), kycStatus / siret / stripeAccountId
    // (légal/financier), posProvider. Les champs d'affichage + plan/status
    // (tier business, lu par le dashboard dev via slug) restent.
    const doc = await ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", slug)).unique()
    if (!doc) return null
    const safe = { ...doc }
    delete safe.clerkUserId
    delete safe.kycStatus
    delete safe.siret
    delete safe.stripeAccountId
    delete safe.posProvider
    return safe
  },
})

// Retourne le restaurant du caller connecté. Pas de param clerkUserId (évite
// l'énumération) : l'id est lu depuis le JWT. Retourne null si non connecté ou
// aucun restaurant trouvé — jamais de throw (un throw provoquerait des retries
// Convex en boucle quand Clerk n'a pas encore initialisé la session).
export const getByClerkId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return ctx.db.query("restaurants").withIndex("by_clerk_user", q => q.eq("clerkUserId", identity.subject)).unique()
  },
})

// Restaurant auquel l'utilisateur connecté est rattaché via une invitation
// acceptée — sa ligne `members` porte son clerkUserId (écrit par invitations.accept).
// Même pattern : pas de param, null si non connecté, jamais de throw.
export const getByMembership = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const membership = await ctx.db
      .query("members")
      .withIndex("by_clerkUserId", q => q.eq("clerkUserId", identity.subject))
      .first()
    if (!membership) return null
    return ctx.db.get(membership.restaurantId)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    type: v.string(),
    clerkUserId: v.string(),
    plan: v.optional(v.union(v.literal("free"), v.literal("essentiel"), v.literal("pro"))),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const existing = await ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", args.slug)).first()
    if (existing) return existing._id
    // Plan par défaut = "free" (GOAL_BILLING_ESSENTIEL_FIX_RESIDUELS) : un compte
    // créé sans plan explicite est Gratuit — jamais un palier payant implicite.
    return ctx.db.insert("restaurants", { ...args, plan: args.plan ?? "free", clerkUserId: identity.subject })
  },
})

export const updateQrColor = mutation({
  args: { id: v.id("restaurants"), qrColor: v.string() },
  handler: async (ctx, { id, qrColor }) => {
    await requireRestaurantAccess(ctx, id, ["owner"])
    await ctx.db.patch(id, { qrColor })
  },
})

export const setSuspended = mutation({
  args: { id: v.id("restaurants"), suspended: v.boolean() },
  handler: async (ctx, { id, suspended }) => {
    await requireRestaurantAccess(ctx, id, ["owner"])
    await ctx.db.patch(id, { suspended })
  },
})

export const deleteAll = mutation({
  args: { id: v.id("restaurants") },
  handler: async (ctx, { id }) => {
    await requireRestaurantAccess(ctx, id, ["owner"])
    const deleteTable = async (table: string, index: string) => {
      const rows = await (ctx.db.query(table as any) as any)
        .withIndex(index, (q: any) => q.eq("restaurantId", id))
        .collect()
      for (const row of rows) await ctx.db.delete(row._id)
    }
    await deleteTable("feedbacks",  "by_restaurant")
    await deleteTable("payments",   "by_restaurant")
    await deleteTable("menuItems",  "by_restaurant")
    await deleteTable("tables",     "by_restaurant")
    // Complété (nettoyage restaurant démo/test) : ces tables référencent aussi
    // restaurantId mais n'étaient pas purgées — restes orphelins inoffensifs
    // pour l'app (plus aucun restaurantId ne matche), mais pas un vrai nettoyage
    // (CRM/staff/planning restaient en base indéfiniment). Additif uniquement :
    // aucune des 4 lignes ci-dessus n'est modifiée.
    await deleteTable("customers",             "by_restaurant")
    await deleteTable("members",               "by_restaurant")
    await deleteTable("restaurantInvitations", "by_restaurant")
    await deleteTable("zones",                 "by_restaurant")
    await deleteTable("shifts",                "by_restaurant")
    await deleteTable("extras",                "by_restaurant")
    await deleteTable("extraConvocations",     "by_restaurant")
    await deleteTable("messages",              "by_restaurant_date")
    await deleteTable("insights",              "by_restaurant")
    // Volontairement PAS purgées : tickets/restaurantNotes/subscriptions/auditLogs
    // (bookkeeping admin/support — hors périmètre d'une suppression déclenchée par
    // l'owner du restaurant) et transactions (table vide en prod, cf. commentaire
    // schema.ts — aucun vrai PSP n'y écrit).
    await ctx.db.delete(id)
  },
})

// Outil admin (CLI `npx convex run` uniquement — internalMutation, jamais
// appelable depuis l'app) : bascule un restaurant précis en plan "free",
// "essentiel" ou "pro" pour un test/démo. Seule voie d'assignation de plan
// tant que Market Pay n'est pas intégré (aucun self-service). Ne réintroduit
// PAS la faille corrigée en SECURITY (M1) — `restaurants.update` reste sans
// le champ `plan`, donc un gérant ne peut toujours pas se l'auto-attribuer
// depuis le dashboard. Atteignable qu'avec les identifiants de déploiement.
// Usage : npx convex run restaurants:setPlanForTesting '{"id":"<id>","plan":"essentiel"}' --prod
export const setPlanForTesting = internalMutation({
  args: { id: v.id("restaurants"), plan: v.union(v.literal("free"), v.literal("essentiel"), v.literal("pro")) },
  handler: async (ctx, { id, plan }) => {
    await ctx.db.patch(id, { plan })
  },
})

export const generateUploadUrl = action({
  handler: async (ctx) => {
    await requireIdentity(ctx)
    return ctx.storage.generateUploadUrl()
  },
})

export const setLogoStorageId = mutation({
  args: { id: v.id("restaurants"), storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { id, storageId }) => {
    await requireRestaurantAccess(ctx, id, ["owner"])
    await ctx.db.patch(id, { logoStorageId: storageId })
  },
})

export const getLogoUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => ctx.storage.getUrl(storageId),
})

// Tous les ids de restaurants — usage interne (cron insights tous restaurants).
export const listAllIds = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("restaurants").collect()).map(r => r._id),
})

// ── Admin-only (admin app) — GOAL_ADMIN_06, additif ──────────────────────────
// SECURITY (H2): renvoyait le doc COMPLET (clerkUserId, email, kycStatus, siret,
// stripeAccountId…) à n'importe qui, sans auth. Désormais : admin OU membre/owner
// du restaurant. Sinon null (jamais throw — règle des queries React).
// Consommé par : admin RestaurantDetail (admin), dashboard owner (son resto),
// flow impersonation (session admin → isAdminAccess passe).
export const getById = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    if (await isAdminAccess(ctx)) return ctx.db.get(args.restaurantId)
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    const r = await ctx.db.get(args.restaurantId)
    if (!r) return null
    if (r.clerkUserId === identity.subject) return r
    const members = await ctx.db
      .query("members")
      .withIndex("by_restaurant", q => q.eq("restaurantId", args.restaurantId))
      .collect()
    const isMember = members.some((m: any) => m.clerkUserId === identity.subject && m.status === "active")
    return isMember ? r : null
  },
})

export const listAll = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    return ctx.db.query("restaurants").collect();
  },
})

// Correctif "table transactions vide en prod" (GOAL_ADMIN_06) : si le restaurant
// n'a aucune transaction (PSP jamais branché), on retombe sur `payments` (ledger
// réel) pour dater sa dernière activité — sinon lastActivityAt = date de création.
export const listWithLastActivity = query({
  args: { authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!(await isAdminAccess(ctx, args.authEmail))) return [];
    const restaurants = await ctx.db.query("restaurants").collect();
    return Promise.all(restaurants.map(async (r) => {
      const lastTx = await ctx.db.query("transactions")
        .withIndex("by_restaurant", q => q.eq("restaurantId", r._id))
        .order("desc").first();
      if (lastTx) return { ...r, lastActivityAt: lastTx.succeededAt ?? r._creationTime };
      const lastPayment = await ctx.db.query("payments")
        .withIndex("by_restaurant", q => q.eq("restaurantId", r._id))
        .order("desc").first();
      return { ...r, lastActivityAt: lastPayment?.createdAt ?? r._creationTime };
    }));
  },
})

export const suspend = mutation({
  args: { restaurantId: v.id("restaurants"), reason: v.string(), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, args.authEmail);
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new ConvexError("Restaurant not found");
    await ctx.db.patch(args.restaurantId, { status: "suspended", suspended: true });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "restaurant.suspended",
      resourceType: "restaurant",
      resourceId: args.restaurantId,
      diff: { reason: args.reason, previousStatus: restaurant.status },
    });
    await ctx.db.insert("tickets", {
      restaurantId: args.restaurantId,
      subject: `Compte suspendu — ${restaurant.name}`,
      status: "new",
      priority: "high",
      createdBy: actor._id,
    });
  },
})

export const unsuspend = mutation({
  args: { restaurantId: v.id("restaurants"), authEmail: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx, args.authEmail);
    await ctx.db.patch(args.restaurantId, { status: "active", suspended: false });
    await ctx.db.insert("auditLogs", {
      actorId: actor._id,
      action: "restaurant.unsuspended",
      resourceType: "restaurant",
      resourceId: args.restaurantId,
    });
  },
})

// Retourne le restaurant du gérant connecté (lu depuis le JWT Clerk)
export const getMyRestaurant = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return ctx.db
      .query("restaurants")
      .withIndex("by_clerk_user", q => q.eq("clerkUserId", identity.subject))
      .first()
  },
})
