import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

export const getTeamMembers = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    return await ctx.db
      .query("members")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
  },
})

export const inviteMember = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("owner"), v.literal("manager"), v.literal("staff")),
  },
  handler: async (ctx, args) => {
    await requireRestaurantAccess(ctx, args.restaurantId, ["owner", "manager"])
    return await ctx.db.insert("members", {
      restaurantId: args.restaurantId,
      email: args.email,
      name: args.name,
      role: args.role,
      status: "pending",
      invitedAt: Date.now(),
    })
  },
})

// Recopie le prénom/nom Clerk de l'utilisateur courant sur SA propre ligne
// `members` (identifiée par clerkUserId). Permet à la page Équipe d'afficher le
// vrai nom, y compris pour les membres créés avant l'ajout de ces champs (la
// ligne était nommée d'après l'email). N'agit que sur les lignes de l'appelant —
// pas de garde restaurant nécessaire (self-scoped via identity.subject).
export const syncMyProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, { firstName, lastName }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return
    const rows = await ctx.db
      .query("members")
      .withIndex("by_clerkUserId", q => q.eq("clerkUserId", identity.subject))
      .collect()
    const full = [firstName, lastName].filter(Boolean).join(" ").trim()
    for (const row of rows) {
      await ctx.db.patch(row._id, {
        firstName,
        lastName,
        ...(full ? { name: full } : {}),
      })
    }
  },
})

// Enregistre le seed DiceBear choisi par le membre pour son avatar dans le chat.
export const setAvatarSeed = mutation({
  args: { seed: v.string() },
  handler: async (ctx, { seed }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return
    const rows = await ctx.db
      .query("members")
      .withIndex("by_clerkUserId", q => q.eq("clerkUserId", identity.subject))
      .collect()
    for (const row of rows) {
      await ctx.db.patch(row._id, { avatarSeed: seed })
    }
  },
})

export const updateMemberRole = mutation({
  args: {
    memberId: v.id("members"),
    // SECURITY (H2) : "owner" retiré — un manager (ou owner) ne peut promouvoir personne owner.
    role: v.union(v.literal("manager"), v.literal("staff")),
  },
  handler: async (ctx, { memberId, role }) => {
    const member = await ctx.db.get(memberId)
    if (!member) throw new Error("Member not found")
    // SECURITY (H2) : seul un owner peut changer un rôle (plus de manager→owner).
    const { identity } = await requireRestaurantAccess(ctx, member.restaurantId, ["owner"])
    // SECURITY (H2) : interdit de modifier son propre rôle (anti escalade / lock-out).
    if (member.clerkUserId === identity.subject) throw new Error("Action interdite sur soi-même")
    await ctx.db.patch(memberId, { role })
  },
})

export const removeMember = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId)
    if (!member) throw new Error("Member not found")
    // SECURITY (H2) : seul un owner peut retirer un membre.
    const { identity } = await requireRestaurantAccess(ctx, member.restaurantId, ["owner"])
    // SECURITY (H2) : interdit de se retirer soi-même.
    if (member.clerkUserId === identity.subject) throw new Error("Action interdite sur soi-même")
    await ctx.db.delete(memberId)
  },
})

// Nom d'affichage libre d'un membre (prénom ou surnom), prioritaire sur
// firstName/lastName/name partout. Vidé (undefined) si chaîne blanche → l'UI
// retombe sur la cascade firstName/name. Guard owner/manager du restaurant.
export const updateDisplayName = mutation({
  args: { memberId: v.id("members"), displayName: v.string() },
  handler: async (ctx, { memberId, displayName }) => {
    const member = await ctx.db.get(memberId)
    if (!member) throw new Error("Member not found")
    await requireRestaurantAccess(ctx, member.restaurantId, ["owner", "manager"])
    await ctx.db.patch(memberId, { displayName: displayName.trim().slice(0, 30) || undefined })
  },
})
