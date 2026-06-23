import { query, mutation, action } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess, requireIdentity } from "./authz"

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
    return { restaurant: safeRestaurant, table }
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
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const existing = await ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", args.slug)).first()
    if (existing) return existing._id
    return ctx.db.insert("restaurants", { ...args, clerkUserId: identity.subject })
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
    await ctx.db.delete(id)
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
