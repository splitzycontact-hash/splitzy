import { query, mutation, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

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
    const { _id, restaurantId, number, capacity, status, guests,
            amountCents, paidCents, orderItems, paidTipCents, forcePaymentMode } = table
    return { _id, restaurantId, number, capacity, status, guests,
             amountCents, paidCents, orderItems, paidTipCents, forcePaymentMode }
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
    // SECURITY (Vuln 2) : mutation convive ANONYME. On borne/assainit les entrées
    // pour qu'un appelant non authentifié ne puisse pas injecter des orderItems
    // démesurés ou négatifs (nb d'items, longueur de nom, qty, prix plafonnés).
    if (orderItems !== undefined) {
      patch.orderItems = orderItems.slice(0, 200).map(it => ({
        name: String(it.name).slice(0, 120),
        qty: Math.max(0, Math.min(999, Math.floor(it.qty))),
        unitCents: Math.max(0, Math.min(100_000_000, Math.floor(it.unitCents))),
      }))
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
// remis à zéro. Table réglée → refus explicite : la sitting est close et les
// paiements réconciliés ; rouvrir corromprait paidCents. Le gérant doit
// libérer la table d'abord (nouvelle sitting propre).
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
    if (table.status === "paid") {
      throw new Error("Table déjà réglée — libérez la table pour démarrer une nouvelle commande")
    }
    // Mêmes bornes que updateStatus (Vuln 2) : nom 120 chars, qty 1-999,
    // prix 0-1M€. Les lignes à qty nulle après floor sont ignorées.
    const clean = items.slice(0, 200)
      .map(it => ({
        name: String(it.name).slice(0, 120),
        qty: Math.max(0, Math.min(999, Math.floor(it.qty))),
        unitCents: Math.max(0, Math.min(100_000_000, Math.floor(it.unitCents))),
      }))
      .filter(it => it.qty > 0)
    if (clean.length === 0) throw new Error("Aucun article à ajouter")

    const opening = table.status === "free"
    const addedCents = clean.reduce((s, it) => s + it.qty * it.unitCents, 0)
    const merged = (opening ? [] : (table.orderItems ?? [])).map(l => ({ ...l }))
    for (const it of clean) {
      const existing = merged.find(l => !l.paid && l.name === it.name && l.unitCents === it.unitCents)
      if (existing) existing.qty = Math.min(999, existing.qty + it.qty)
      else merged.push({ name: it.name, qty: it.qty, unitCents: it.unitCents })
    }

    const patch: Record<string, unknown> = {
      orderItems: merged,
      amountCents: (opening ? 0 : (table.amountCents ?? 0)) + addedCents,
    }
    if (opening) {
      patch.status = "dining"
      patch.sittingStartedAt = Date.now()
      patch.paidCents = undefined
      patch.paidTipCents = undefined
      patch.alert = undefined
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
      if (t.assignedMemberId !== undefined) {
        await ctx.db.patch(t._id, { assignedMemberId: undefined })
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
    })
  },
})

// Toutes les tables d'un restaurant — usage interne (insights cron, sans auth).
export const listAll = internalQuery({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) =>
    ctx.db.query("tables").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).collect(),
})
