import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"
import type { Id } from "./_generated/dataModel"

// Résout la ligne `members` de l'appelant pour ce restaurant (createdBy).
// Le propriétaire (restaurants.clerkUserId) n'a pas de ligne `members` → undefined.
async function currentMemberId(
  ctx: any,
  restaurantId: Id<"restaurants">,
): Promise<Id<"members"> | undefined> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return undefined
  const members = await ctx.db
    .query("members")
    .withIndex("by_restaurant", (q: any) => q.eq("restaurantId", restaurantId))
    .collect()
  return members.find((m: any) => m.clerkUserId === identity.subject)?._id
}

// Liste les extras actifs d'un restaurant, enrichis de la date de leur dernière
// convocation (affichée sur la carte). owner/manager uniquement.
export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    const extras = await ctx.db
      .query("extras")
      .withIndex("by_restaurant_active", q =>
        q.eq("restaurantId", restaurantId).eq("isActive", true),
      )
      .collect()
    const enriched = await Promise.all(
      extras.map(async extra => {
        const last = await ctx.db
          .query("extraConvocations")
          .withIndex("by_extra", q => q.eq("extraId", extra._id))
          .order("desc")
          .first()
        return { ...extra, lastConvokedAt: last?.sentAt ?? null }
      }),
    )
    enriched.sort((a, b) => a.firstName.localeCompare(b.firstName, "fr"))
    return enriched
  },
})

export const add = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    skills: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRestaurantAccess(ctx, args.restaurantId, ["owner", "manager"])
    const createdBy = await currentMemberId(ctx, args.restaurantId)
    return await ctx.db.insert("extras", {
      restaurantId: args.restaurantId,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: args.email.trim(),
      phone: args.phone?.trim() || undefined,
      skills: args.skills,
      notes: args.notes?.trim() || undefined,
      isActive: true,
      createdAt: Date.now(),
      ...(createdBy ? { createdBy } : {}),
    })
  },
})

export const update = mutation({
  args: {
    extraId: v.id("extras"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { extraId, ...fields }) => {
    const extra = await ctx.db.get(extraId)
    if (!extra) throw new Error("Extra introuvable")
    await requireRestaurantAccess(ctx, extra.restaurantId, ["owner", "manager"])
    const patch: Record<string, unknown> = {}
    if (fields.firstName !== undefined) patch.firstName = fields.firstName.trim()
    if (fields.lastName !== undefined) patch.lastName = fields.lastName.trim()
    if (fields.email !== undefined) patch.email = fields.email.trim()
    // `undefined` supprime le champ optionnel côté Convex (téléphone/notes vidés).
    if (fields.phone !== undefined) patch.phone = fields.phone.trim() || undefined
    if (fields.skills !== undefined) patch.skills = fields.skills
    if (fields.notes !== undefined) patch.notes = fields.notes.trim() || undefined
    await ctx.db.patch(extraId, patch)
  },
})

// Archivage doux : on ne supprime jamais un extra (préserve son historique de
// convocations), on le retire seulement de la liste active.
export const archive = mutation({
  args: { extraId: v.id("extras") },
  handler: async (ctx, { extraId }) => {
    const extra = await ctx.db.get(extraId)
    if (!extra) throw new Error("Extra introuvable")
    await requireRestaurantAccess(ctx, extra.restaurantId, ["owner", "manager"])
    await ctx.db.patch(extraId, { isActive: false })
  },
})
