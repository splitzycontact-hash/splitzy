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
    const { identity, restaurant } = await requireRestaurantAccess(ctx, restaurantId)

    // DM : tout le monde peut écrire à tout le monde. On vérifie seulement que le
    // destinataire existe et appartient au même restaurant.
    if (recipientId) {
      const recipient = await ctx.db.get(recipientId)
      if (!recipient || recipient.restaurantId !== restaurantId)
        throw new Error("Destinataire introuvable")
    }

    let me = await ctx.db
      .query("members")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first()

    // Owner pur (identifié par restaurants.clerkUserId, sans ligne members) :
    // on lui crée une ligne `members` à la volée pour qu'il puisse envoyer.
    if (!me) {
      const isOwner = restaurant.clerkUserId === identity.subject
      if (!isOwner) throw new Error("Membre introuvable")
      // Vérifier si créé entre-temps (race condition)
      const existing = await ctx.db
        .query("members")
        .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .first()
      if (existing) {
        me = existing
      } else {
        const memberId = await ctx.db.insert("members", {
          restaurantId,
          clerkUserId: identity.subject,
          name: identity.name ?? identity.email ?? "Owner",
          email: identity.email ?? "",
          role: "owner" as const,
          status: "active" as const,
          invitedAt: Date.now(),
        })
        me = await ctx.db.get(memberId)
      }
    }

    if (!me) throw new Error("Membre introuvable")

    const threadId = recipientId
      ? [me._id, recipientId].sort().join("|")
      : "broadcast"

    // L10 : rejeter un message vide (après trim) — pas d'insert de contenu vide.
    const body = content.trim().slice(0, 1000)
    if (!body) throw new Error("Message vide")

    return ctx.db.insert("messages", {
      restaurantId,
      senderId: me._id,
      recipientId,
      threadId,
      content: body,
      createdAt: Date.now(),
      readBy: [me._id], // l'expéditeur a déjà "lu" son propre message
    })
  },
})

// Marquer un thread comme lu pour le membre courant.
// `recipientId` fourni → thread 1:1 [me|recipient] (résolu côté serveur, symétrique
// de listThread) ; sinon `threadId` (défaut "broadcast"). Les deux sont optionnels
// pour accepter aussi bien { threadId } (ChatPage) que { recipientId } (FloatingChat).
export const markRead = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    threadId: v.optional(v.string()),
    recipientId: v.optional(v.id("members")),
  },
  handler: async (ctx, { restaurantId, threadId, recipientId }) => {
    const me = await getMe(ctx, restaurantId)
    if (!me) return
    const tid = recipientId
      ? [me._id.toString(), recipientId.toString()].sort().join("|")
      : threadId ?? "broadcast"
    // M3 : ne marquer lu qu'un thread dont on est participant (broadcast = public).
    if (tid !== "broadcast" && !tid.split("|").includes(me._id.toString())) return
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_restaurant_thread", (q) =>
        q.eq("restaurantId", restaurantId).eq("threadId", tid),
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
// Accès libre : tout membre du restaurant peut lire n'importe quel thread.
// `recipientId` fourni → thread 1:1 [me|recipient] ; sinon `threadId` (broadcast).
export const listThread = query({
  args: {
    restaurantId: v.id("restaurants"),
    threadId: v.optional(v.string()),
    recipientId: v.optional(v.id("members")),
  },
  handler: async (ctx, { restaurantId, threadId, recipientId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    const me = await getMe(ctx, restaurantId)
    let tid = threadId ?? "broadcast"
    if (recipientId) {
      if (!me) return []
      tid = [me._id.toString(), recipientId.toString()].sort().join("|")
    }
    // M3 : garde participant — un thread 1:1 "[a]|[b]" n'est lisible que par a et b.
    // Bloque un staff qui reconstruirait un threadId pour lire des DMs tiers.
    if (tid !== "broadcast" && me && !tid.split("|").includes(me._id.toString())) {
      return []
    }
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_restaurant_thread", (q) =>
        q.eq("restaurantId", restaurantId).eq("threadId", tid),
      )
      .order("desc")
      .take(60)
    return msgs.reverse()
  },
})

// Résumé des conversations : dernier message par thread + nb de non lus,
// trié par dernier message décroissant.
export const listConversations = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const { identity } = await requireRestaurantAccess(ctx, restaurantId)
    const me = await ctx.db
      .query("members")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .filter((q) => q.eq(q.field("clerkUserId"), identity.subject))
      .first()

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

    // M3 : ne renvoyer que les threads dont `me` est participant (broadcast = public).
    // Un staff ne voit plus les DMs 1:1 owner↔manager auxquels il ne participe pas.
    const visible = threads.filter(({ threadId }) =>
      threadId === "broadcast" ||
      (me ? threadId.split("|").includes(me._id.toString()) : false),
    )
    return visible.sort((a, b) => b.lastMsg.createdAt - a.lastMsg.createdAt)
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
