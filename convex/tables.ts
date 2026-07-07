import { query, mutation, internalQuery, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"
import { makeUnits, unitsTotalCents } from "./orderItemsFactory"

export const createBulk = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    count: v.number(),
    capacity: v.number(),
  },
  handler: async (ctx, { restaurantId, count, capacity }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    const existing = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const existingNumbers = new Set(existing.map(t => t.number))
    for (let i = 1; i <= count; i++) {
      if (existingNumbers.has(i)) continue
      await ctx.db.insert("tables", {
        restaurantId,
        number: i,
        capacity,
        status: "free",
      })
    }
  },
})

export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    return ctx.db.query("tables").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).collect()
  },
})

// Lit une table par son _id. Utilisé par le flow client (Landing, Items) pour
// suivre en temps réel l'état de paiement (paidCents, amountCents).
// Retourne null si la table n'existe plus — jamais de throw côté query.
export const getOne = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) return null
    // L6 : getOne est public (flux convive). Projeter uniquement les champs
    // nécessaires au flux convive — ne JAMAIS exposer assignedMemberId, gridX,
    // gridY, label, alert, sittingStartedAt, isVip (données internes gérant).
    // forcePaymentMode EST exposé : le convive en a besoin pour basculer en
    // écran paiement quand le manager déclenche tables.forcePayment (M5).
    // paymentMode EST exposé (GOAL_PAIEMENTS_11) : le convive doit connaître le
    // mode verrouillé pour la table (écran de choix / bascule réactive).
    const { _id, restaurantId, number, capacity, status, guests,
            amountCents, paidCents, orderItems, paidTipCents, forcePaymentMode,
            paymentMode } = table
    return { _id, restaurantId, number, capacity, status, guests,
             amountCents, paidCents, orderItems, paidTipCents, forcePaymentMode,
             paymentMode }
  },
})

// Patch conditionnel : on ne touche qu'aux champs explicitement fournis. Sinon
// Convex efface les champs passés à `undefined` — un scan QR (status only)
// effacerait sinon amountCents/orderItems posés par la simulation du gérant.
//
// Reset paidCents/paidTipCents UNIQUEMENT si la table était libre ou déjà
// entièrement payée (= nouvelle sitting démarre). Pour les sittings en cours
// (dining/payment) on préserve les paiements déjà encaissés.
export const updateStatus = mutation({
  args: {
    tableId: v.id("tables"),
    status: v.union(v.literal("free"), v.literal("dining"), v.literal("payment"), v.literal("paid")),
    guests: v.optional(v.number()),
    // M2 : amountCents honoré UNIQUEMENT pour un appelant authentifié (owner/manager,
    // ex. dashboard simulate/send modal). Un convive anonyme ne peut PAS fixer la
    // note — elle vient du POS / du gérant, jamais du client public.
    amountCents: v.optional(v.number()),
    orderItems: v.optional(v.array(v.object({
      name: v.string(),
      qty: v.number(),
      unitCents: v.number(),
    }))),
    // M2 : cross-check IDOR — si fourni (flux convive), la table DOIT appartenir
    // à ce restaurant (résolu depuis le slug scanné côté client).
    restaurantId: v.optional(v.id("restaurants")),
  },
  handler: async (ctx, { tableId, status, guests, amountCents, orderItems, restaurantId }) => {
    const existing = await ctx.db.get(tableId)
    if (!existing) throw new Error("Table introuvable")

    // M2 (IDOR) : la table scannée doit appartenir au restaurant du slug. Échoue
    // si un tableId d'un autre restaurant est passé avec un restaurantId connu.
    if (restaurantId !== undefined && existing.restaurantId !== restaurantId) {
      throw new Error("Table invalide")
    }

    // Appelant authentifié owner/manager (dashboard) ? Sinon = convive anonyme.
    let isStaff = false
    try {
      await requireRestaurantAccess(ctx, existing.restaurantId, ["owner", "manager"])
      isStaff = true
    } catch { /* convive anonyme : non authentifié → restrictions M2 ci-dessous */ }

    // M2 : convive anonyme — seules les transitions du flux convive sont permises.
    // Le gérant authentifié garde tous les droits (reset, re-simulation, etc.).
    if (!isStaff) {
      const ALLOWED: Record<string, string[]> = {
        free: ["dining"],
        dining: ["payment"],
        payment: ["paid"],
      }
      if (!ALLOWED[existing.status]?.includes(status)) {
        throw new Error(`Transition ${existing.status}→${status} non autorisée`)
      }
    }

    const patch: Record<string, unknown> = { status }
    // Nouvelle installation (free→dining, scan client ou staff) sans `guests`
    // fourni : purge le compteur du service précédent et date la sitting,
    // exactement comme addOrderItems pour son cas `opening`. Sans ça, le
    // guests de la sitting précédente restait affiché (bug prod Table 4).
    if (existing.status === "free" && status === "dining" && guests === undefined) {
      patch.guests = undefined
      patch.sittingStartedAt = Date.now()
    }
    // GOAL_PAIEMENTS_11 — réouverture (free→dining, scan ou staff) : purge un
    // verrou de mode périmé de la sitting précédente.
    if (existing.status === "free" && status === "dining") {
      patch.paymentMode = undefined
      patch.paymentModeLockedAt = undefined
      patch.paymentModeLockedBy = undefined
    }
    if (guests !== undefined) patch.guests = Math.max(0, guests)

    // M2 : amountCents (la note) n'est patché QUE pour un gérant authentifié — un
    // convive anonyme ne peut pas injecter un montant arbitraire.
    if (isStaff && amountCents !== undefined) {
      patch.amountCents = Math.max(0, amountCents)
      const wasFreshSitting = existing.status === "free"
        || existing.status === "paid"
        || (existing.paidCents ?? 0) === 0
      if (wasFreshSitting) {
        patch.paidCents = undefined
        patch.paidTipCents = undefined
      }
    }
    // SECURITY (Vuln 2) : mutation convive ANONYME. Les bornes (nb d'items,
    // longueur de nom, qty, prix) sont appliquées par la fabrique, qui éclate
    // aussi chaque ligne en unités qty 1 avec lineId neuf (GOAL_PAIEMENTS_01).
    // Sémantique inchangée : orderItems fourni = remplacement complet de la
    // commande (re-simulation dashboard) — les unités sont donc toutes neuves.
    if (orderItems !== undefined) {
      patch.orderItems = makeUnits(orderItems)
    }
    await ctx.db.patch(tableId, patch)
  },
})

export const resetToFree = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, {
      status: 'free',
      guests: undefined,
      amountCents: undefined,
      orderItems: undefined,
      alert: undefined,
      paidCents: undefined,
      paidTipCents: undefined,
      sittingStartedAt: undefined,
      paymentMode: undefined,
      paymentModeLockedAt: undefined,
      paymentModeLockedBy: undefined,
    })
  },
})

// Ajout d'articles depuis le dashboard (modal "Ajouter un article").
// Mutation AUTHENTIFIÉE (owner/manager) — contrairement à updateStatus qui est
// le chemin convive anonyme. Les lignes sont fusionnées avec la commande en
// cours (même nom + même prix unitaire + non payée → qty cumulée) et
// amountCents est incrémenté du montant ajouté (et non recalculé depuis les
// lignes : une commande importée de la caisse peut avoir un amountCents sans
// orderItems détaillés — on préserve cet écart).
//
// Table libre → ouverture d'une nouvelle sitting : status "dining",
// sittingStartedAt = maintenant, couverts si fournis, compteurs de paiement
// remis à zéro.
//
// GOAL_PAIEMENTS_11 — table "paid" : la MÊME sitting continue (ex. dessert
// commandé après qu'un convive parti ait soldé le total à cet instant).
// On repasse status à "payment" en gardant paidCents/paidTipCents/orderItems
// intacts : le grand livre reste juste (payé figé, reste = nouveaux articles).
// L'ancien refus explicite obligeait à resetToFree, qui effaçait tout.
export const addOrderItems = mutation({
  args: {
    tableId: v.id("tables"),
    items: v.array(v.object({
      name: v.string(),
      qty: v.number(),
      unitCents: v.number(),
    })),
    guests: v.optional(v.number()),
  },
  handler: async (ctx, { tableId, items, guests }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    // GOAL_PAIEMENTS_01 : les ajouts passent par la fabrique (bornes Vuln 2 +
    // éclatement en unités qty 1 + lineId neuf). Plus AUCUN merge par nom :
    // une recommande du même article obtient toujours une unité neuve — jamais
    // un incrément de qty sur une unité existante (qui peut porter un hold ou
    // du paidCents). addedCents est calculé sur les unités réellement produites.
    const units = makeUnits(items)
    if (units.length === 0) throw new Error("Aucun article à ajouter")

    const opening = table.status === "free"
    const addedCents = unitsTotalCents(units)
    const merged = [...(opening ? [] : (table.orderItems ?? [])), ...units]

    const patch: Record<string, unknown> = {
      orderItems: merged,
      amountCents: (opening ? 0 : (table.amountCents ?? 0)) + addedCents,
    }
    // GOAL_PAIEMENTS_11 — dessert après solde : la table réglée repasse en
    // "payment" (paidCents/paidTipCents intacts, seuls les nouveaux articles
    // restent dus). Ni ouverture ni reset : la sitting continue.
    if (table.status === "paid") {
      patch.status = "payment"
    }
    if (opening) {
      patch.status = "dining"
      patch.sittingStartedAt = Date.now()
      patch.paidCents = undefined
      patch.paidTipCents = undefined
      patch.alert = undefined
      // GOAL_PAIEMENTS_11 — nouvelle sitting : jamais de verrou hérité, même si
      // la table est passée "free" par un chemin qui ne purge pas (updateStatus).
      patch.paymentMode = undefined
      patch.paymentModeLockedAt = undefined
      patch.paymentModeLockedBy = undefined
    }
    if (guests !== undefined) patch.guests = Math.max(0, Math.min(99, Math.floor(guests)))
    await ctx.db.patch(tableId, patch)
  },
})

// Annulation d'une ligne (ou d'une partie de sa quantité) AVANT paiement.
// Refusé : table réglée, ligne déjà payée, ou retrait qui ferait passer le
// total sous le montant déjà encaissé (le reste à payer ne peut pas être
// négatif — billing.remainingCents serait faussé).
// `name`/`unitCents` re-vérifiés contre l'index pour éviter qu'une UI
// périmée ne supprime la mauvaise ligne après modification concurrente.
export const removeOrderItem = mutation({
  args: {
    tableId: v.id("tables"),
    index: v.number(),
    name: v.string(),
    unitCents: v.number(),
    qty: v.optional(v.number()),
  },
  handler: async (ctx, { tableId, index, name, unitCents, qty }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    if (table.status === "paid") throw new Error("Table déjà réglée — aucune modification possible")

    const lines = (table.orderItems ?? []).map(l => ({ ...l }))
    const line = lines[index]
    if (!line || line.name !== name || line.unitCents !== unitCents) {
      throw new Error("Commande modifiée entre-temps — réessayez")
    }
    if (line.paid) throw new Error("Article déjà payé — annulation impossible")

    const removeQty = Math.max(1, Math.min(Math.floor(qty ?? line.qty), line.qty))
    const newTotal = Math.max(0, (table.amountCents ?? 0) - removeQty * line.unitCents)
    if (newTotal < (table.paidCents ?? 0)) {
      throw new Error("Retrait impossible — le montant déjà encaissé dépasserait le total")
    }

    line.qty -= removeQty
    const remaining = lines.filter(l => l.qty > 0)
    await ctx.db.patch(tableId, { orderItems: remaining, amountCents: newTotal })
  },
})

export const importAmounts = mutation({
  args: {
    rows: v.array(v.object({ tableId: v.id("tables"), amountCents: v.number() })),
  },
  handler: async (ctx, { rows }) => {
    const verified = new Set<string>()
    for (const { tableId, amountCents } of rows) {
      const table = await ctx.db.get(tableId)
      if (!table) throw new Error("Table introuvable")
      if (!verified.has(table.restaurantId)) {
        await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
        verified.add(table.restaurantId)
      }
      await ctx.db.patch(tableId, {
        amountCents: Math.max(0, amountCents),
        status: 'dining',
        paidCents: undefined,
        paidTipCents: undefined,
      })
    }
  },
})

// Module 3 — Plan de salle : positionne une table sur la grille du plan. No-op
// silencieux (retourne null) si une AUTRE table occupe déjà la cellule cible —
// évite les superpositions lors de drags concurrents sans faire échouer le drag.
export const updateGridPosition = mutation({
  args: {
    tableId: v.id("tables"),
    gridX: v.number(),
    gridY: v.number(),
  },
  handler: async (ctx, { tableId, gridX, gridY }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    const occupant = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", table.restaurantId))
      .filter(q => q.and(q.eq(q.field("gridX"), gridX), q.eq(q.field("gridY"), gridY)))
      .first()
    if (occupant && occupant._id !== tableId) return null
    await ctx.db.patch(tableId, { gridX, gridY })
    return tableId
  },
})

// Assigne (ou désassigne) un serveur à une table. Additive : ne touche qu'à
// cette table. memberId omis = désassignation explicite (patch undefined).
export const assignServer = mutation({
  args: {
    tableId: v.id("tables"),
    memberId: v.optional(v.id("members")),
  },
  handler: async (ctx, { tableId, memberId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, { assignedMemberId: memberId })
    return tableId
  },
})

// Bascule l'indicateur d'alerte/VIP d'une table (étoile sidebar + bordure orange
// sur la pastille du plan de salle). Owner/manager only.
export const toggleAlert = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    const t = await ctx.db.get(tableId)
    if (!t) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, t.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, { alert: !t.alert })
  },
})

// Désassigne tous les serveurs des tables du restaurant. Retourne le nombre de
// tables effectivement modifiées (celles qui portaient une assignation).
export const clearAllAssignments = mutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    let cleared = 0
    for (const t of tables) {
      if (t.assignedMemberId !== undefined || t.status !== "free") {
        await ctx.db.patch(t._id, {
          assignedMemberId: undefined,
          // Reset active tables so the next service starts clean
          ...(t.status !== "free" ? {
            status: "free",
            guests: undefined,
            amountCents: undefined,
            orderItems: undefined,
            alert: undefined,
            paidCents: undefined,
            paidTipCents: undefined,
            sittingStartedAt: undefined,
            forcePaymentMode: undefined,
            isVip: undefined,
            paymentMode: undefined,
            paymentModeLockedAt: undefined,
            paymentModeLockedBy: undefined,
          } : {}),
        })
        cleared++
      }
    }
    return cleared
  },
})

// Rattache (ou détache) une table à une zone logique. zoneId omis = détachement.
export const updateZone = mutation({
  args: {
    tableId: v.id("tables"),
    zoneId: v.optional(v.id("zones")),
  },
  handler: async (ctx, { tableId, zoneId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, { zoneId })
    return tableId
  },
})

// Met à jour la capacité (nombre de couverts) d'une table. Bornée 1–50.
export const updateCapacity = mutation({
  args: { tableId: v.id("tables"), capacity: v.number() },
  handler: async (ctx, { tableId, capacity }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    if (capacity < 1 || capacity > 50) throw new Error("Capacité invalide")
    await ctx.db.patch(tableId, { capacity })
    return tableId
  },
})

// Renomme une table (label personnalisé). Vide = retour au nom par défaut T{number}.
export const updateLabel = mutation({
  args: { tableId: v.id("tables"), label: v.string() },
  handler: async (ctx, { tableId, label }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, { label: label.trim() || undefined })
    return tableId
  },
})

// Retire une table du plan de salle (efface sa position grille).
export const removeFromGrid = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, { gridX: undefined, gridY: undefined })
    return tableId
  },
})

// Auto-création paresseuse d'une table manquante. Utilisé par TableEntry quand
// un client scanne un QR de table qui n'a pas encore de document Convex
// (ex: setup partiel, ou ajout d'une table sans re-run createBulk).
// Retourne l'_id de la table existante ou nouvellement créée.
export const ensureForRestaurant = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    number: v.number(),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, { restaurantId, number, capacity }) => {
    const all = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const existing = all.find(t => t.number === number)
    if (existing) return existing._id
    return ctx.db.insert("tables", {
      restaurantId,
      number,
      capacity: capacity ?? 4,
      status: "free",
    })
  },
})

// M5 — Forcer le paiement : passe la table en "payment" et lève le flag convive.
// La page convive (abonnée à tables.getOne) bascule en temps réel sur l'écran
// paiement. Owner/manager only.
export const forcePayment = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, { status: "payment", forcePaymentMode: true })
  },
})

// M5 — Marquer (ou démarquer) une table VIP. Quand on active le VIP ET qu'un
// serveur est assigné, on envoie un message chat 1:1 au serveur (même format de
// thread que messages.send). L'expéditeur owner sans ligne `members` ne déclenche
// pas la notif (me === null) — le flag VIP est tout de même posé. Owner/manager only.
export const setVip = mutation({
  args: { tableId: v.id("tables"), isVip: v.boolean() },
  handler: async (ctx, { tableId, isVip }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, { isVip })

    if (isVip && table.assignedMemberId) {
      const identity = await ctx.auth.getUserIdentity()
      if (!identity) return
      const me = await ctx.db
        .query("members")
        .withIndex("by_clerkUserId", q => q.eq("clerkUserId", identity.subject))
        .filter(q => q.eq(q.field("restaurantId"), table.restaurantId))
        .first()
      if (me) {
        const threadId = [me._id.toString(), table.assignedMemberId.toString()].sort().join("|")
        await ctx.db.insert("messages", {
          restaurantId: table.restaurantId,
          senderId: me._id,
          recipientId: table.assignedMemberId,
          threadId,
          content: `⭐ Table ${table.number} — client VIP, attention particulière.`,
          createdAt: Date.now(),
          readBy: [me._id],
        })
      }
    }
  },
})

// M5 — Clôture manuelle sans encaissement (client parti, repas offert, erreur…).
// Libère la table comme resetToFree mais marque closedWithoutPayment pour le suivi.
// reason est accepté pour de futurs logs (non persisté ici). Owner/manager only.
export const closeWithoutPayment = mutation({
  args: {
    tableId: v.id("tables"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { tableId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])
    await ctx.db.patch(tableId, {
      status: "free",
      guests: 0,
      assignedMemberId: undefined,
      orderItems: [],
      amountCents: 0,
      paidCents: 0,
      paidTipCents: 0,
      sittingStartedAt: undefined,
      forcePaymentMode: false,
      isVip: false,
      closedWithoutPayment: true,
      paymentMode: undefined,
      paymentModeLockedAt: undefined,
      paymentModeLockedBy: undefined,
    })
  },
})

// GOAL_PAIEMENTS_11 — Verrou du mode de paiement par table/sitting.
// Le PREMIER convive qui agit fixe le mode pour toute la table. Mutation
// convive ANONYME (comme claims.claimPart) : l'identité est le clientId
// (SessionState.clientId, uuid par onglet — jamais l'IP). Lecture + écriture
// dans la MÊME mutation Convex = même transaction : deux appels concurrents
// sont sérialisés, un seul gagne, l'autre reçoit {locked:false, actualMode}.
// JAMAIS de throw sur un mode déjà fixé — le client doit pouvoir afficher un
// message accueillant, pas une erreur brute.
export const choosePaymentMode = mutation({
  args: {
    tableId: v.id("tables"),
    mode: v.union(v.literal("item"), v.literal("diviser")),
    clientId: v.string(),
  },
  handler: async (ctx, { tableId, mode, clientId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    const me = String(clientId).slice(0, 60)

    if (table.paymentMode === undefined) {
      await ctx.db.patch(tableId, {
        paymentMode: mode,
        paymentModeLockedAt: Date.now(),
        paymentModeLockedBy: me,
      })
      return { locked: true, mode }
    }
    // Retry réseau du même convive : idempotent, on lui confirme SON verrou.
    if (table.paymentModeLockedBy === me) {
      return { locked: true, mode: table.paymentMode, alreadyMine: true }
    }
    // Un autre convive a verrouillé avant lui — refus doux, jamais d'exception.
    return { locked: false, actualMode: table.paymentMode }
  },
})

// GOAL_PAIEMENTS_11 — Réinitialisation du verrou par le gérant (owner/manager).
// Refusée tant qu'un paiement est en cours (hold "paiement_attente" actif) :
// changer de mode pendant qu'un convive paie fausserait sa ventilation.
// L'état remplacé est archivé dans paymentModeHistory (resetBy = ligne members
// du gérant si elle existe — un owner sans ligne members est loggé sans resetBy).
export const resetPaymentMode = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new Error("Table introuvable")
    const { identity } = await requireRestaurantAccess(ctx, table.restaurantId, ["owner", "manager"])

    const frozen = (table.orderItems ?? []).some(l =>
      (l.holds ?? []).some(h => h.state === "paiement_attente"))
    if (frozen) {
      throw new Error("Un paiement est en cours sur cette table — réessayez quand il sera terminé")
    }
    if (table.paymentMode === undefined) return { reset: false }

    const me = await ctx.db
      .query("members")
      .withIndex("by_clerkUserId", q => q.eq("clerkUserId", identity.subject))
      .filter(q => q.eq(q.field("restaurantId"), table.restaurantId))
      .first()

    await ctx.db.patch(tableId, {
      paymentModeHistory: [
        ...(table.paymentModeHistory ?? []),
        {
          mode: table.paymentMode,
          lockedAt: table.paymentModeLockedAt ?? 0,
          lockedBy: table.paymentModeLockedBy ?? "",
          resetBy: me?._id,
          resetAt: Date.now(),
        },
      ],
      paymentMode: undefined,
      paymentModeLockedAt: undefined,
      paymentModeLockedBy: undefined,
    })
    return { reset: true }
  },
})

// Toutes les tables d'un restaurant — usage interne (insights cron, sans auth).
export const listAll = internalQuery({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) =>
    ctx.db.query("tables").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).collect(),
})

// GOAL_PAIEMENTS_01 — Backfill one-shot des lineId manquants (CLI uniquement :
// npx convex run tables:backfillLineIds '{}'). Idempotent : une ligne portant
// déjà un lineId n'est jamais retouchée. Pour chaque ligne legacy (sans lineId)
// d'une sitting non libre : éclatement en qty unités de qty 1, lineId neuf,
// paidCents = unitCents si paid: true (Σ = qty × unitCents — la dérive
// historique est FIGÉE telle quelle, jamais réinventée), holds: []. Les
// montants (amountCents, Σ qty×unitCents) sont invariants par l'éclatement.
export const backfillLineIds = internalMutation({
  args: { dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { dryRun }) => {
    const all = await ctx.db.query("tables").collect()
    let tablesPatched = 0
    let unitsCreated = 0
    for (const t of all) {
      const lines = t.orderItems ?? []
      if (lines.length === 0) continue
      // Tables libres : lignes résiduelles purgées à la prochaine ouverture —
      // inutile (et trompeur) de leur donner des lineId.
      if (t.status === "free") continue
      if (lines.every(l => l.lineId !== undefined)) continue // déjà migrée
      const next: typeof lines = []
      for (const l of lines) {
        if (l.lineId !== undefined) { next.push(l); continue }
        const qty = Math.max(1, Math.floor(l.qty))
        for (let i = 0; i < qty; i++) {
          next.push({
            name: l.name,
            qty: 1,
            unitCents: l.unitCents,
            paid: l.paid,
            lineId: crypto.randomUUID(),
            paidCents: l.paid ? l.unitCents : 0,
            holds: [],
          })
          unitsCreated++
        }
      }
      if (!dryRun) await ctx.db.patch(t._id, { orderItems: next })
      tablesPatched++
    }
    return { tablesPatched, unitsCreated, dryRun: dryRun ?? false }
  },
})
