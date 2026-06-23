import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

// M6 Chat interne (gérant ↔ staff). Un thread = "broadcast" (toute la salle) ou
// la paire 1:1 "[memberA]|[memberB]" (memberIds triés lexicographiquement).
// senderId/readBy référencent la table `members` ; le propriétaire (restaurant
// sans ligne members) n'a donc pas d'identité d'expéditeur ici (cf. getMe → throw).

// Résout la ligne `members` du membre courant pour un restaurant donné (après
// vérification d'accès). Retourne null si l'appelant n'a pas de ligne members
// (ex. propriétaire authentifié via restaurants.clerkUserId).
async function getMe(ctx: any, restaurantId: any) {
  const { identity } = await requireRestaurantAccess(ctx, restaurantId)
  return ctx.db
    .query("members")
    .withIndex("by_restaurant", (q: any) => q.eq("restaurantId", restaurantId))
    .filter((q: any) => q.eq(q.field("clerkUserId"), identity.subject))
    .first()
}

// Envoyer un message (broadcast si recipientId absent, sinon 1:1).
export const send = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    recipientId: v.optional(v.id("members")),
    content: v.string(),
  },
  handler: async (ctx, { restaurantId, recipientId, content }) => {
    const me = await getMe(ctx, restaurantId)
    if (!me) throw new Error("Membre introuvable")

    const threadId = recipientId
      ? [me._id, recipientId].sort().join("|")
      : "broadcast"

    return ctx.db.insert("messages", {
      restaurantId,
      senderId: me._id,
      recipientId,
      threadId,
      content: content.trim().slice(0, 1000),
      createdAt: Date.now(),
      readBy: [me._id], // l'expéditeur a déjà "lu" son propre message
    })
  },
})

// Marquer un thread comme lu pour le membre courant.
export const markRead = mutation({
  args: { restaurantId: v.id("restaurants"), threadId: v.string() },
  handler: async (ctx, { restaurantId, threadId }) => {
    const me = await getMe(ctx, restaurantId)
    if (!me) return
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_restaurant_thread", (q) =>
        q.eq("restaurantId", restaurantId).eq("threadId", threadId),
      )
      .collect()
    await Promise.all(
      msgs
        .filter((m) => !m.readBy.includes(me._id))
        .map((m) => ctx.db.patch(m._id, { readBy: [...m.readBy, me._id] })),
    )
  },
})

// Messages d'un thread, 60 derniers, du plus ancien au plus récent.
export const listThread = query({
  args: { restaurantId: v.id("restaurants"), threadId: v.string() },
  handler: async (ctx, { restaurantId, threadId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_restaurant_thread", (q) =>
        q.eq("restaurantId", restaurantId).eq("threadId", threadId),
      )
      .order("asc")
      .collect()
    return msgs.slice(-60)
  },
})

// Résumé des conversations : dernier message par thread + nb de non lus,
// trié par dernier message décroissant.
export const listConversations = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const me = await getMe(ctx, restaurantId)

    const allMsgs = await ctx.db
      .query("messages")
      .withIndex("by_restaurant_date", (q) =>
        q.eq("restaurantId", restaurantId),
      )
      .order("desc")
      .collect()

    // allMsgs est trié par createdAt desc → le premier vu par thread est le dernier message.
    const byThread = new Map<string, (typeof allMsgs)[number]>()
    for (const msg of allMsgs) {
      if (!byThread.has(msg.threadId)) byThread.set(msg.threadId, msg)
    }

    const threads = []
    for (const [threadId, lastMsg] of byThread) {
      const unread = me
        ? allMsgs.filter(
            (m) =>
              m.threadId === threadId &&
              !m.readBy.includes(me._id) &&
              m.senderId !== me._id,
          ).length
        : 0
      threads.push({ threadId, lastMsg, unread })
    }

    return threads.sort((a, b) => b.lastMsg.createdAt - a.lastMsg.createdAt)
  },
})

// Nombre total de messages non lus (toutes conversations) — badge sidebar.
export const getUnreadCount = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const me = await getMe(ctx, restaurantId)
    if (!me) return 0
    const allMsgs = await ctx.db
      .query("messages")
      .withIndex("by_restaurant_date", (q) =>
        q.eq("restaurantId", restaurantId),
      )
      .collect()
    return allMsgs.filter(
      (m) => !m.readBy.includes(me._id) && m.senderId !== me._id,
    ).length
  },
})
