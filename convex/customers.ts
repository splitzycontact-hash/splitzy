import { query, mutation, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

// Récupère les profils clients ciblés par une campagne email (consommé par
// l'action campaigns:sendCampaign, runtime node). Filtre par restaurantId pour
// garantir qu'un gérant ne peut pas envoyer aux clients d'un autre restaurant.
export const getManyForCampaign = internalQuery({
  args: { restaurantId: v.id("restaurants"), customerIds: v.array(v.id("customers")) },
  handler: async (ctx, { restaurantId, customerIds }) => {
    const rows = await Promise.all(customerIds.map(id => ctx.db.get(id)))
    return rows.filter((r): r is NonNullable<typeof r> => !!r && r.restaurantId === restaurantId)
  },
})

// Désabonnement marketing depuis le lien présent dans chaque email de campagne.
// Mutation PUBLIQUE et sans auth : le lien est ouvert depuis la boîte mail du
// client, hors session authentifiée. Patch marketingConsent → false.
export const unsubscribe = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const row = await ctx.db.get(customerId)
    if (!row) return { ok: false }
    await ctx.db.patch(customerId, { marketingConsent: false })
    return { ok: true }
  },
})

export const setManualVip = mutation({
  args: { customerId: v.id('customers'), isVip: v.boolean() },
  handler: async (ctx, { customerId, isVip }) => {
    const c = await ctx.db.get(customerId)
    if (!c) throw new Error("Client introuvable")
    await requireRestaurantAccess(ctx, c.restaurantId, ["owner", "manager"])
    await ctx.db.patch(customerId, { manualVip: isVip })
  },
})

export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    return ctx.db.query("customers").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).order("desc").collect()
  },
})

// Tous les profils clients d'un restaurant, triés par createdAt décroissant
// (le plus récent d'abord). Consommé par le dashboard gérant page Clients.
export const getByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    const rows = await ctx.db.query("customers")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  },
})

// Édition des coordonnées depuis la fiche client du dashboard.
// Patch si customerId fourni, sinon crée un nouveau profil (le gérant peut
// renseigner un contact même si le client n'en a pas laissé à la confirmation).
// Une chaîne vide efface le champ (patch à undefined).
export const updateContact = mutation({
  args: {
    customerId: v.optional(v.id("customers")),
    restaurantId: v.id("restaurants"),
    tableNumber: v.optional(v.number()),
    firstName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRestaurantAccess(ctx, args.restaurantId, ["owner", "manager"])
    const patch: Record<string, unknown> = {}
    if (args.phone !== undefined) patch.phone = args.phone.trim() || undefined
    if (args.email !== undefined) patch.email = args.email.trim().toLowerCase() || undefined
    if (args.firstName !== undefined) patch.firstName = args.firstName.trim() || undefined
    if (args.tableNumber !== undefined) patch.tableNumber = args.tableNumber

    if (args.customerId) {
      await ctx.db.patch(args.customerId, patch)
      return args.customerId
    }
    return ctx.db.insert("customers", { restaurantId: args.restaurantId, createdAt: Date.now(), ...patch })
  },
})

// Enregistre (ou complète) le profil client laissé sur l'écran de confirmation.
// Upsert sur (restaurantId + phone) ou (restaurantId + email) pour ne pas
// dupliquer un client qui laisse d'abord son numéro puis son email.
export const saveContact = mutation({
  args: {
    // Fourni par l'écran confirmation après le 1er enregistrement pour
    // consolider phone + email du même client dans UNE seule row (sinon
    // 2 saves séparés = 2 rows fragmentées, chacune avec la moitié du contact).
    customerId: v.optional(v.id("customers")),
    restaurantId: v.id("restaurants"),
    tableNumber: v.optional(v.number()),
    firstName: v.optional(v.string()),
    avatarIndex: v.optional(v.number()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    marketingConsent: v.optional(v.boolean()),
    consentAt: v.optional(v.number()),
    // Paiement courant (state.lastPaymentId) — backfill phone/email sur le paiement
    // pour permettre le regroupement client par contact (1 paiement = 1 client).
    paymentId: v.optional(v.id("payments")),
  },
  handler: async (ctx, args) => {
    const { restaurantId } = args
    const phone = args.phone?.trim() || undefined
    const email = args.email?.trim().toLowerCase() || undefined
    if (!phone && !email && !args.customerId) return null

    // SECURITY (L3) : mutation publique (flow convive). Refuse tout customerId /
    // paymentId qui n'appartient pas au restaurant ciblé → pas de write cross-tenant.
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId)
      if (!customer || customer.restaurantId !== restaurantId) {
        throw new Error("Client introuvable")
      }
    }
    if (args.paymentId) {
      const payment = await ctx.db.get(args.paymentId)
      if (!payment || payment.restaurantId !== restaurantId) {
        throw new Error("Paiement introuvable")
      }
    }

    // 1. Consolidation prioritaire : même profil (row déjà créée cette session).
    let existing = args.customerId ? await ctx.db.get(args.customerId) : null
    // 2. Sinon dédupe par téléphone puis email sur ce restaurant.
    if (!existing && phone) {
      existing = await ctx.db.query("customers")
        .withIndex("by_restaurant_phone", q => q.eq("restaurantId", restaurantId).eq("phone", phone))
        .first()
    }
    if (!existing && email) {
      existing = await ctx.db.query("customers")
        .withIndex("by_restaurant_email", q => q.eq("restaurantId", restaurantId).eq("email", email))
        .first()
    }

    const firstName = args.firstName?.trim() || undefined
    const patch = {
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(firstName ? { firstName } : {}),
      ...(args.avatarIndex !== undefined ? { avatarIndex: args.avatarIndex } : {}),
      ...(args.paymentId ? { paymentId: args.paymentId } : {}),
      ...(args.tableNumber !== undefined ? { tableNumber: args.tableNumber } : {}),
      ...(args.marketingConsent !== undefined ? { marketingConsent: args.marketingConsent } : {}),
      // Horodatage du consentement posé côté serveur (source de vérité) si le
      // client n'en fournit pas explicitement.
      ...(args.consentAt !== undefined
        ? { consentAt: args.consentAt }
        : args.marketingConsent ? { consentAt: Date.now() } : {}),
    }

    // Backfill du paiement avec le contact → regroupement client par phone/email.
    // Le paiement est créé AVANT /confirmation (donc sans contact) ; on le complète ici.
    if (args.paymentId && (phone || email)) {
      const pmt = await ctx.db.get(args.paymentId)
      if (pmt) {
        await ctx.db.patch(args.paymentId, {
          ...(phone ? { phone } : {}),
          ...(email ? { email } : {}),
        })
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }
    return ctx.db.insert("customers", { restaurantId, createdAt: Date.now(), ...patch })
  },
})
