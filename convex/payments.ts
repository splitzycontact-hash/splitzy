import { query, mutation, internalMutation, internalQuery } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

// Familles de moyens de paiement stockées dans payments.paymentMethod (schéma
// en union). Le client envoie une valeur brute (marque de carte visa/mastercard/
// amex, 'card', 'apple_pay', 'google_pay', ou 'cash' pour un règlement espèces) ;
// on la ramène à l'une de ces 5 familles avant insertion.
export type PaymentMethod = "card" | "apple_pay" | "google_pay" | "cash" | "other"
export function normalizePaymentMethod(m: string | undefined): PaymentMethod {
  const k = (m ?? "").toLowerCase()
  if (k === "apple_pay") return "apple_pay"
  if (k === "google_pay") return "google_pay"
  if (k === "cash" || k === "especes" || k === "espèces") return "cash"
  if (k === "visa" || k === "mastercard" || k === "amex" || k === "card" || k === "cb") return "card"
  return k ? "other" : "card" // méthode vide (démo historique) → supposée carte
}

export const list = query({
  // `from`/`to` (ms epoch, optionnels) filtrent par createdAt sur [from, to).
  // Rétrocompat : sans ces args, retourne tous les paiements (comportement existant).
  args: {
    restaurantId: v.id("restaurants"),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { restaurantId, from, to }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    const rows = await ctx.db.query("payments").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).order("desc").collect()
    if (from === undefined && to === undefined) return rows
    return rows.filter(r => (from === undefined || r.createdAt >= from) && (to === undefined || r.createdAt < to))
  },
})

// Paiements d'une table, plus récents d'abord. Sert au flow client (/welcome)
// pour reconstruire les convives de la sitting courante (cumul des subtotals
// jusqu'à atteindre table.paidCents). Lecture seule.
export const listByTable = query({
  args: { tableId: v.id("tables") },
  handler: async (ctx, { tableId }) => {
    const rows = await ctx.db.query("payments").withIndex("by_table", q => q.eq("tableId", tableId)).order("desc").collect()
    // SECURITY (Vuln 3) : flux convive ANONYME (tableId dérivable d'un slug public).
    // On retire les champs sensibles : contact (phone/email), détails PSP
    // (provider/providerRef/paymentMethod) et commission. firstName/avatarIndex/
    // subtotalCents restent — affichés sur /welcome (convives ayant payé).
    return rows.map(r => {
      const safe: Record<string, any> = { ...r }
      delete safe.phone
      delete safe.email
      delete safe.provider
      delete safe.providerRef
      delete safe.paymentMethod
      delete safe.commissionCents
      delete safe.paidItemNames
      return safe
    })
  },
})

export const create = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tableId: v.id("tables"),
    tableNumber: v.number(),
    // Optionnel : envoyé uniquement en partage équitable (stepper déclaré).
    // Absent (mode article) → défaut 1 à l'insert : un paiement = un payeur.
    guests: v.optional(v.number()),
    subtotalCents: v.number(),
    tipCents: v.number(),
    commissionCents: v.number(),
    totalCents: v.number(),
    paymentMethod: v.string(),
    firstName: v.optional(v.string()),
    avatarIndex: v.optional(v.number()),
    paidItemNames: v.optional(v.array(v.string())),
    // PSP réel : provider + référence de transaction renvoyés par le SDK de
    // paiement. Le webhook PSP signé (http.ts) ré-émet cette référence pour
    // confirmer l'encaissement. Absents en démo → ref serveur générée.
    provider: v.optional(v.string()),
    providerRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // CONVIVE PUBLIC : pas d'auth (le client n'est pas connecté). On durcit
    // côté serveur sans casser le mock.
    // 1) La table doit exister ET appartenir au restaurant annoncé.
    const table = await ctx.db.get(args.tableId)
    if (!table || table.restaurantId !== args.restaurantId) throw new Error("Table invalide")
    // 2) Pas de montants négatifs.
    if (args.subtotalCents < 0 || args.tipCents < 0) throw new Error("Montant invalide")
    // 3) Plafonner le sous-total au restant dû si une note est connue.
    const subtotalCents = table.amountCents && table.amountCents > 0
      ? Math.min(args.subtotalCents, Math.max(0, table.amountCents - (table.paidCents ?? 0)))
      : args.subtotalCents
    // 4) Pas de commission pour l'instant (Stripe abandonné). Total recalculé côté serveur.
    const commissionCents = 0
    const totalCents = subtotalCents + args.tipCents

    const { paidItemNames, provider, providerRef, ...paymentData } = args
    const now = Date.now()
    const d = new Date(now)
    const dateLabel = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`

    // SECURITY (Vuln 1) : on n'inscrit JAMAIS "Encaissé" sur la seule affirmation
    // du client. Le paiement est créé "En attente" ; seul le webhook PSP signé
    // (http.ts → confirmPayment) le passe à "Encaissé" ET crédite la table. La
    // référence (echoed par le webhook) permet de matcher la confirmation ; à
    // défaut de ref PSP réelle (démo), on en génère une côté serveur.
    // SECURITY (H1) : plus aucune auto-confirmation. Sans `provider` PSP réel, le
    // paiement reste "En attente" — seul le webhook PSP signé (http.ts →
    // confirmPayment) peut le passer à "Encaissé" ET créditer la table. Le
    // providerRef généré sert au matching d'un éventuel webhook réel ; aucun
    // scheduler ne confirme jamais côté serveur sur l'affirmation du client.
    const ref = providerRef ?? crypto.randomUUID()
    const paymentId = await ctx.db.insert("payments", {
      ...paymentData,
      // Borné 1-99 (entrée anonyme, mêmes bornes que tables.addOrderItems).
      guests: Math.max(1, Math.min(99, Math.floor(args.guests ?? 1))),
      paymentMethod: normalizePaymentMethod(args.paymentMethod),
      subtotalCents,
      tipCents: args.tipCents,
      commissionCents,
      totalCents,
      status: "En attente",
      createdAt: now,
      dateLabel,
      provider,
      providerRef: ref,
      paidItemNames,
    })

    // Table : paiement INITIÉ → statut "payment" (sans créditer paidCents : le
    // crédit n'a lieu qu'à la confirmation PSP réelle dans confirmPayment).
    if (table.status !== "paid") {
      await ctx.db.patch(args.tableId, { status: "payment" })
    }
    return paymentId
  },
})

// Outil admin (CLI `npx convex run` uniquement — internalMutation) : rattrape
// les paiements démo créés AVANT le déploiement de l'auto-confirmation
// (restés "En attente" sans provider, aucun webhook ne viendra). Confirme +
// réconcilie la table seulement si la sitting est encore en cours et que le
// sous-total tient dans le restant dû (sinon paiement d'une sitting passée :
// marqué "Encaissé" sans toucher la table).
export const backfillDemoPending = internalMutation({
  args: { restaurantId: v.id("restaurants"), sinceCreatedAt: v.optional(v.number()) },
  handler: async (ctx, { restaurantId, sinceCreatedAt }) => {
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const targets = rows.filter(p =>
      p.status === "En attente" && !p.provider && p.createdAt >= (sinceCreatedAt ?? 0)
    )
    let reconciled = 0
    for (const p of targets) {
      await ctx.db.patch(p._id, { provider: "demo", status: "Encaissé" })
      const table = await ctx.db.get(p.tableId)
      const remaining = table ? (table.amountCents ?? 0) - (table.paidCents ?? 0) : 0
      if (
        table &&
        (table.status === "payment" || table.status === "dining") &&
        remaining > 0 && p.subtotalCents <= remaining
      ) {
        await ctx.db.patch(p.tableId, reconcileTablePatch(table, p.subtotalCents, p.tipCents, p.paidItemNames))
        reconciled++
        // Convives réels — même logique que confirmPayment, uniquement pour
        // les paiements réconciliés, après le patch argent.
        const fresh = await ctx.db.get(p.tableId)
        if (fresh) {
          const guestsPatch = await computeGuestsPatch(ctx, fresh, p)
          if (guestsPatch) await ctx.db.patch(p.tableId, guestsPatch)
        }
      }
    }
    return { confirmed: targets.length, reconciled }
  },
})

// Outil admin (CLI uniquement) : purge les paiements de test antérieurs à un
// timestamp pour un restaurant donné (nettoyage CRM/analytics des données de
// démo résiduelles). Irréversible — vérifier la cible avant exécution.
export const purgeStaleTestPayments = internalMutation({
  args: { restaurantId: v.id("restaurants"), beforeCreatedAt: v.number() },
  handler: async (ctx, { restaurantId, beforeCreatedAt }) => {
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const targets = rows.filter(p => p.createdAt < beforeCreatedAt)
    for (const p of targets) {
      await ctx.db.delete(p._id)
    }
    return { deleted: targets.length }
  },
})

// Réconciliation table appliquée UNIQUEMENT après confirmation PSP réelle.
// Déplacée hors de create : un client ne peut plus créditer une table sans
// règlement vérifié côté serveur.
function reconcileTablePatch(
  table: any,
  subtotalCents: number,
  tipCents: number,
  paidItemNames: string[] | undefined,
): Record<string, unknown> {
  const paidCents = (table.paidCents ?? 0) + subtotalCents
  const paidTipCents = (table.paidTipCents ?? 0) + tipCents
  const billCents = table.amountCents ?? 0
  const status = billCents > 0 && paidCents >= billCents ? "paid" as const : "payment" as const
  const patch: Record<string, unknown> = { paidCents, paidTipCents, status }
  if (status === "paid" && table.orderItems?.length) {
    patch.orderItems = table.orderItems.map((item: any) => ({ ...item, paid: true }))
  } else if (paidItemNames && paidItemNames.length > 0 && table.orderItems?.length) {
    const remaining = [...paidItemNames]
    patch.orderItems = table.orderItems.map((item: any) => {
      if (item.paid) return item
      let count = 0
      for (let i = remaining.length - 1; i >= 0 && count < item.qty; i--) {
        if (remaining[i] === item.name) { remaining.splice(i, 1); count++ }
      }
      if (count === 0) return item
      if (count >= item.qty) return { ...item, paid: true }
      return { ...item, qty: item.qty - count }
    })
  }
  return patch
}

// Convives réels, jamais inventés : après le patch argent (reconcileTablePatch,
// intouché), remonte table.guests au meilleur signal disponible — le déclaré du
// partage équitable (pmt.guests) ou le nombre de payeurs distincts
// (firstName|avatarIndex) de la sitting courante. La sitting est isolée par
// sittingStartedAt quand il existe (ouverture gérant), sinon par la même
// reconstitution que Landing.tsx/Tables.tsx : paiements Encaissé du plus récent
// au plus ancien, cumulés jusqu'à couvrir paidCents (approximation assumée).
// Ne diminue JAMAIS la valeur en place (max). Retourne null si rien à patcher.
async function computeGuestsPatch(
  ctx: MutationCtx,
  table: Doc<"tables">,
  pmt: Doc<"payments">,
): Promise<{ guests: number } | null> {
  const rows = await ctx.db
    .query("payments")
    .withIndex("by_table", q => q.eq("tableId", pmt.tableId))
    .order("desc")
    .collect()
  const paidCents = table.paidCents ?? 0
  const payers = new Set<string>()
  let acc = 0
  for (const p of rows) {
    if (p.status !== "Encaissé") continue
    if (table.sittingStartedAt != null) {
      if (p.createdAt < table.sittingStartedAt) continue
    } else {
      if (acc >= paidCents) break
      acc += p.subtotalCents ?? 0
    }
    payers.add(`${p.firstName ?? ""}|${p.avatarIndex ?? ""}`)
  }
  const candidate = Math.max(pmt.guests ?? 0, payers.size)
  const next = Math.max(table.guests ?? 0, candidate)
  if (next <= 0 || next === (table.guests ?? 0)) return null
  return { guests: next }
}

// SECURITY (Vuln 1) : seul point de passage à "Encaissé". Appelé EXCLUSIVEMENT
// par http.ts après vérification de la signature du webhook PSP. internalMutation
// = inatteignable depuis un client public.
export const confirmPayment = internalMutation({
  args: { provider: v.string(), providerRef: v.string(), amountCents: v.number() },
  handler: async (ctx, { provider, providerRef, amountCents }) => {
    const pmt = await ctx.db
      .query("payments")
      .withIndex("by_provider_ref", q => q.eq("provider", provider).eq("providerRef", providerRef))
      .first()
    if (!pmt) {
      console.warn(`[webhook] confirmPayment: aucun paiement en attente pour ${provider}/${providerRef}`)
      return { ok: false, reason: "not_found" }
    }
    // Idempotent : les PSP renvoient le webhook plusieurs fois.
    if (pmt.status === "Encaissé") return { ok: true, reason: "already_confirmed" }
    // Le montant réellement réglé doit correspondre au total attendu.
    if (amountCents !== pmt.totalCents) {
      console.error(`[webhook] montant divergent ${provider}/${providerRef}: reçu ${amountCents}, attendu ${pmt.totalCents}`)
      return { ok: false, reason: "amount_mismatch" }
    }
    await ctx.db.patch(pmt._id, { status: "Encaissé" })
    const table = await ctx.db.get(pmt.tableId)
    if (table) {
      await ctx.db.patch(pmt.tableId, reconcileTablePatch(table, pmt.subtotalCents, pmt.tipCents, pmt.paidItemNames))
      // Convives réels — STRICTEMENT après le patch argent, table relue pour
      // voir le paidCents crédité (les lectures voient les écritures de la
      // même mutation).
      const fresh = await ctx.db.get(pmt.tableId)
      if (fresh) {
        const guestsPatch = await computeGuestsPatch(ctx, fresh, pmt)
        if (guestsPatch) await ctx.db.patch(pmt.tableId, guestsPatch)
      }
    }
    return { ok: true }
  },
})

export const updateStatus = mutation({
  args: { paymentId: v.id('payments'), status: v.union(v.literal('Encaissé'), v.literal('En attente'), v.literal('Remboursé')) },
  handler: async (ctx, { paymentId, status }) => {
    const pmt = await ctx.db.get(paymentId)
    if (!pmt) throw new Error("Paiement introuvable")
    await requireRestaurantAccess(ctx, pmt.restaurantId, ["owner", "manager"])
    await ctx.db.patch(paymentId, { status })
  },
})

export const getOverviewStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    const payments = await ctx.db.query("payments").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).collect()
    const encaisse = payments.filter(p => p.status === "Encaissé")
    const totalCA = encaisse.reduce((s, p) => s + p.totalCents, 0)
    const totalTips = encaisse.reduce((s, p) => s + p.tipCents, 0)
    const avgTipPct = encaisse.length > 0 ? (totalTips / encaisse.reduce((s, p) => s + p.subtotalCents, 0) * 100).toFixed(1) : "0"
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
    const todayPayments = encaisse.filter(p => p.createdAt >= startOfDay.getTime())
    const todayCA = todayPayments.reduce((s, p) => s + p.totalCents, 0)
    const todayTips = todayPayments.reduce((s, p) => s + p.tipCents, 0)
    return { todayCA, todayTips, totalCA, totalTips, avgTipPct, txCount: encaisse.length }
  },
})

// Tous les paiements d'un restaurant — usage interne (insights cron, sans auth).
export const listAll = internalQuery({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) =>
    ctx.db.query("payments").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).collect(),
})

// Répartition du volume encaissé par moyen de paiement, sur la période demandée
// ("today" | "week" | "month" — défaut : tout l'historique). Montants en cents,
// regroupés par famille (carte/Apple Pay/Google Pay/espèces/autre).
export const getPaymentMethodBreakdown = query({
  args: { restaurantId: v.id("restaurants"), period: v.string() }, // "today"|"week"|"month"
  handler: async (ctx, { restaurantId, period }) => {
    await requireRestaurantAccess(ctx, restaurantId)
    const rows = await ctx.db
      .query("payments")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const now = Date.now()
    // Bornes en UTC (déterministe côté serveur Convex). L'UI affine si besoin.
    const from =
      period === "today" ? now - (now % 86400000) :
      period === "week"  ? now - 7 * 86400000 :
      period === "month" ? now - 30 * 86400000 : 0
    const breakdown: Record<PaymentMethod, number> = {
      card: 0, apple_pay: 0, google_pay: 0, cash: 0, other: 0,
    }
    for (const p of rows) {
      // Le statut "payé" dans ce schéma est "Encaissé" (il n'existe pas de
      // statut "succeeded" — voir payments.status). Montant = totalCents (le
      // champ "amountCents" de la spec n'existe pas ici).
      if (p.status !== "Encaissé") continue
      if (p.createdAt < from) continue
      breakdown[normalizePaymentMethod(p.paymentMethod)] += p.totalCents
    }
    return breakdown
  },
})

// Migration (CLI `npx convex run` uniquement) : ramène les valeurs brutes
// existantes de payments.paymentMethod (visa/mastercard/amex/cb…) aux familles
// du schéma en union. À exécuter AVANT de déployer le schéma en union, sinon la
// validation Convex rejette les anciennes lignes. Idempotent — `before` retourne
// le décompte des valeurs rencontrées pour vérification.
export const normalizePaymentMethods = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("payments").collect()
    const before: Record<string, number> = {}
    let patched = 0
    for (const p of rows) {
      const raw = p.paymentMethod as string | undefined
      before[raw ?? "(vide)"] = (before[raw ?? "(vide)"] ?? 0) + 1
      const norm = normalizePaymentMethod(raw)
      if (norm !== raw) {
        await ctx.db.patch(p._id, { paymentMethod: norm })
        patched++
      }
    }
    return { total: rows.length, patched, before }
  },
})
