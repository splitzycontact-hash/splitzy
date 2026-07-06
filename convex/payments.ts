import { query, mutation, internalMutation, internalQuery } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import type { Doc } from "./_generated/dataModel"
import { ConvexError, v } from "convex/values"
import { requireRestaurantAccess } from "./authz"
import { internal } from "./_generated/api"

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

// DÉMO uniquement — n'affecte AUCUN restaurant réel. Vérifie le flag
// "DEMO_AUTO_CONFIRM_PAYMENTS" (allowlist par restaurantId, cf. schema
// featureFlags). Par défaut (flag absent) : renvoie toujours false, donc le
// comportement SECURITY (Vuln 1 / H1) de `create` ci-dessous est intouché
// pour tout restaurant qui n'est pas explicitement listé. Géré par l'outil
// CLI `setDemoAutoConfirmRestaurants` en bas de ce fichier.
async function isDemoAutoConfirmRestaurant(ctx: MutationCtx, restaurantId: string): Promise<boolean> {
  const flag = await ctx.db
    .query("featureFlags")
    .withIndex("by_key", q => q.eq("key", "DEMO_AUTO_CONFIRM_PAYMENTS"))
    .unique()
  if (!flag || flag.status !== "active" || flag.rolloutType !== "allowlist") return false
  return !!flag.rolloutValue?.restaurantIds?.includes(restaurantId)
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
    // GOAL_PAIEMENTS_02 — parts réclamées que ce paiement couvre (mode "par
    // article", nouveau client). Leur hold passe `reclamee` → `paiement_attente`
    // dans CETTE mutation (gel — sortie du régime TTL). Absent chez les clients
    // legacy : comportement strictement inchangé.
    parts: v.optional(v.array(v.object({
      lineId: v.string(),
      partId: v.string(),
    }))),
    // GOAL_PAIEMENTS_03 — NOUVEAU CONTRAT, discriminé par la présence
    // d'idempotencyKey. Avec elle : idempotence (même clé → même paiement,
    // jamais de doublon), validation STRICTE des montants contre l'état réel
    // (rejet explicite STATE_CHANGED — fin du plafonnement silencieux), et
    // retour { paymentId, subtotalCents, tipCents, totalCents } validés.
    // Sans elle : chemin legacy strictement inchangé (plafonnement compris).
    idempotencyKey: v.optional(v.string()),
    // Ventilation demandée (mode par article) : Σ amountCents === subtotalCents.
    allocation: v.optional(v.array(v.object({
      lineId: v.string(),
      amountCents: v.number(),
    }))),
    // GOAL_PAIEMENTS_04 — délai du filet de secours (libération des parts
    // gelées si AUCUN webhook, succès ou échec, n'arrive jamais). Borné
    // 5 s – 30 min, défaut 15 min. L'override court ne sert qu'aux tests E2E.
    failsafeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // CONVIVE PUBLIC : pas d'auth (le client n'est pas connecté). On durcit
    // côté serveur sans casser le mock.
    // 1) La table doit exister ET appartenir au restaurant annoncé.
    const table = await ctx.db.get(args.tableId)
    if (!table || table.restaurantId !== args.restaurantId) throw new Error("Table invalide")
    // 2) Pas de montants négatifs.
    if (args.subtotalCents < 0 || args.tipCents < 0) throw new Error("Montant invalide")

    const isNewContract = args.idempotencyKey !== undefined
    let subtotalCents: number

    if (isNewContract) {
      // ── GOAL_PAIEMENTS_03 — nouveau contrat ──────────────────────────────
      // (1) Idempotence : check-then-insert DANS LA MÊME mutation (transaction
      // sérialisable OCC) = équivalent ON CONFLICT DO NOTHING. Deux appels
      // concurrents avec la même clé → un seul paiement, le second retourne
      // l'existant.
      const existing = await ctx.db
        .query("payments")
        .withIndex("by_idempotency_key", q => q.eq("idempotencyKey", args.idempotencyKey))
        .first()
      if (existing) {
        return {
          paymentId: existing._id,
          subtotalCents: existing.subtotalCents,
          tipCents: existing.tipCents,
          totalCents: existing.totalCents,
          idempotent: true,
        }
      }

      // (2) Montants : entiers stricts.
      if (!Number.isInteger(args.subtotalCents) || !Number.isInteger(args.tipCents) || args.subtotalCents <= 0) {
        throw new ConvexError({ code: "INVALID_AMOUNT", message: "Montants entiers en centimes requis" })
      }

      const now = Date.now()
      const lines = table.orderItems ?? []
      const ownPartIds = new Set((args.parts ?? []).map(p => p.partId))
      const lineAvailable = (l: (typeof lines)[number]) =>
        Math.max(0, lineTotalCents(l) - linePaidCents(l) - heldCapacityCents(l, now, ownPartIds))
      const stateSnapshot = () => ({
        remainingTableCents: table.amountCents && table.amountCents > 0
          ? Math.max(0, table.amountCents - (table.paidCents ?? 0))
          : null,
        lines: lines.map(l => ({
          lineId: l.lineId ?? null,
          name: l.name,
          availableCents: lineAvailable(l),
        })),
      })

      if (args.allocation !== undefined) {
        // (3a) Allocation explicite : Σ === subtotal, chaque montant tient dans
        // la capacité disponible de sa ligne (holds actifs d'autrui exclus —
        // les parts gelées par CE paiement sont sa propre cible).
        const sum = args.allocation.reduce((s, a) => s + a.amountCents, 0)
        if (sum !== args.subtotalCents || args.allocation.some(a => !Number.isInteger(a.amountCents) || a.amountCents <= 0)) {
          throw new ConvexError({ code: "INVALID_ALLOCATION", message: "Σ allocation ≠ sous-total" })
        }
        for (const a of args.allocation) {
          const l = lines.find(x => x.lineId === a.lineId)
          if (!l || a.amountCents > lineAvailable(l)) {
            // (4) L'état a changé (ligne disparue / part plus disponible) :
            // REJET explicite avec l'état à jour — jamais de Math.min silencieux.
            throw new ConvexError({ code: "STATE_CHANGED", ...stateSnapshot() })
          }
        }
      } else {
        // (3b) Parts égales / montant libre : plafond = capacité réellement
        // absorbante (reste de la table − capacité tenue par des holds actifs),
        // pas le reste brut. Table sans note connue : pas de base de plafond
        // (même politique que le legacy non plafonné).
        const remainingTable = table.amountCents && table.amountCents > 0
          ? Math.max(0, table.amountCents - (table.paidCents ?? 0))
          : null
        if (remainingTable !== null) {
          const heldTotal = lines.reduce((s, l) => s + Math.min(
            heldCapacityCents(l, now, ownPartIds),
            Math.max(0, lineTotalCents(l) - linePaidCents(l)),
          ), 0)
          const absorbante = Math.max(0, remainingTable - heldTotal)
          if (args.subtotalCents > absorbante) {
            throw new ConvexError({ code: "STATE_CHANGED", absorbableCents: absorbante, ...stateSnapshot() })
          }
        }
      }

      // Plancher PSP (~0,50 €) sauf solde exact du restant — un micro-paiement
      // isolé est refusé, mais le dernier payeur peut toujours solder.
      const remainingTable = table.amountCents && table.amountCents > 0
        ? Math.max(0, table.amountCents - (table.paidCents ?? 0))
        : null
      if (args.subtotalCents < 50 && !(remainingTable !== null && args.subtotalCents === remainingTable)) {
        throw new ConvexError({ code: "AMOUNT_TOO_SMALL", message: "Montant minimum 0,50 €" })
      }

      // (5) Aucun plafonnement : le montant validé est inséré tel quel.
      subtotalCents = args.subtotalCents
    } else {
      // ── Chemin LEGACY (sans idempotencyKey) : STRICTEMENT inchangé ───────
      // 3) Plafonner le sous-total au restant dû si une note est connue.
      subtotalCents = table.amountCents && table.amountCents > 0
        ? Math.min(args.subtotalCents, Math.max(0, table.amountCents - (table.paidCents ?? 0)))
        : args.subtotalCents
    }

    // 4) Pas de commission pour l'instant (Stripe abandonné). Total recalculé côté serveur.
    const commissionCents = 0
    const totalCents = subtotalCents + args.tipCents

    const { paidItemNames, provider, providerRef, parts, idempotencyKey, allocation, failsafeMs, ...paymentData } = args
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
      // Nouveau contrat : clé d'idempotence + intention de ventilation (la
      // ventilation RÉELLE — appliedAllocation — n'est écrite qu'à la
      // confirmation par applyConfirmedPayment).
      idempotencyKey,
      allocation,
      // GOAL_PAIEMENTS_04 — sitting d'origine FIGÉE à la création : une
      // confirmation tardive (webhook après clôture) se rattache à cette
      // sitting, jamais à celle de la table au moment du webhook.
      sittingStartedAt: table.sittingStartedAt,
    })

    // GOAL_PAIEMENTS_02 — GEL DU HOLD (brief §4, point critique) : les parts
    // réclamées que ce paiement couvre passent `reclamee` → `paiement_attente`
    // dans la MÊME mutation que l'insertion "En attente". Elles sortent du
    // régime TTL (claims.expirePart ne libère que les parts encore `reclamee`) :
    // un 3D Secure de 8 min ne libère plus rien, le double-encaissement est
    // fermé sans dépendre de la vitesse de la banque. On vérifie « part
    // présente ? », jamais « hold encore valide ? » (brief §6) : une part
    // expirée entre-temps n'invalide pas le paiement — on gèle ce qui existe.
    // SÉCURITÉ : aucun impact sur l'argent (paidCents intouché ici).
    if (parts?.length) {
      const frozen: { lineId: string; partId: string }[] = []
      const lines = (table.orderItems ?? []).map(l => ({
        ...l,
        holds: (l.holds ?? []).map(h => ({ ...h })),
      }))
      for (const ref of parts.slice(0, 200)) {
        const line = lines.find(l => l.lineId === ref.lineId)
        const hold = line?.holds.find(h => h.partId === ref.partId)
        if (hold && hold.state === "reclamee") {
          hold.state = "paiement_attente"
          frozen.push({ lineId: ref.lineId, partId: ref.partId })
        }
      }
      if (frozen.length) {
        await ctx.db.patch(args.tableId, { orderItems: lines })
        await ctx.db.patch(paymentId, { heldParts: frozen })
        // GOAL_PAIEMENTS_04 — filet de secours temporel : si AUCUN webhook
        // (succès ou échec) n'arrive jamais, les parts gelées sont libérées
        // au réveil — SEULEMENT si le paiement est encore "En attente" et la
        // part encore `paiement_attente` (un paiement confirmé a déjà consommé
        // ses holds via applyConfirmedPayment). Même transaction que le gel.
        const failsafe = Math.max(5_000, Math.min(30 * 60_000, Math.floor(failsafeMs ?? 15 * 60_000)))
        await ctx.scheduler.runAfter(failsafe, internal.claims.releaseFrozenParts, { paymentId })
      }
    }

    // Table : paiement INITIÉ → statut "payment" (sans créditer paidCents : le
    // crédit n'a lieu qu'à la confirmation PSP réelle dans confirmPayment).
    if (table.status !== "paid") {
      await ctx.db.patch(args.tableId, { status: "payment" })
    }

    // DÉMO uniquement (voir isDemoAutoConfirmRestaurant ci-dessus) : reproduit
    // EXACTEMENT ce que fait confirmPayment (webhook PSP réel) / backfillDemoPending
    // (outil CLI), simplement de façon synchrone ici pour une démo fluide sans
    // PSP branché. Ne s'exécute que si ce restaurantId précis est dans l'allowlist
    // du flag — tout autre restaurant retombe sur le comportement Vuln 1/H1 inchangé
    // (paiement "En attente" jusqu'au vrai webhook).
    if (await isDemoAutoConfirmRestaurant(ctx, args.restaurantId)) {
      await ctx.db.patch(paymentId, { status: "Encaissé", provider: provider ?? "demo-auto" })
      const tableAfter = await ctx.db.get(args.tableId)
      const pmtAfter = await ctx.db.get(paymentId)
      if (tableAfter && pmtAfter) {
        await applyConfirmedPayment(ctx, tableAfter, pmtAfter)
        const fresh = await ctx.db.get(args.tableId)
        if (fresh) {
          const guestsPatch = await computeGuestsPatch(ctx, fresh, pmtAfter)
          if (guestsPatch) await ctx.db.patch(args.tableId, guestsPatch)
        }
      }
    }

    // Nouveau contrat : retourne les montants VALIDÉS serveur — la source de
    // SET_PAYMENT_DETAILS côté client (fin du fire-and-forget, GOAL_05).
    // Legacy : paymentId brut, comme toujours.
    if (isNewContract) {
      return { paymentId, subtotalCents, tipCents: args.tipCents, totalCents, idempotent: false }
    }
    return paymentId
  },
})

// Outil admin (CLI `npx convex run` uniquement) : active/désactive la démo
// fluide (paiement confirmé instantanément, sans webhook PSP) pour une liste
// précise de restaurantId. Passer un tableau vide désactive le flag pour tout
// le monde. N'importe quel restaurant absent de la liste garde le comportement
// sécurisé normal (Vuln 1 / H1) — voir isDemoAutoConfirmRestaurant.
// Usage : npx convex run payments:setDemoAutoConfirmRestaurants '{"restaurantIds":["<id>"]}' --prod
export const setDemoAutoConfirmRestaurants = internalMutation({
  args: { restaurantIds: v.array(v.string()) },
  handler: async (ctx, { restaurantIds }) => {
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", q => q.eq("key", "DEMO_AUTO_CONFIRM_PAYMENTS"))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: restaurantIds.length > 0 ? "active" : "disabled",
        rolloutType: "allowlist",
        rolloutValue: { restaurantIds },
      })
      return existing._id
    }
    return ctx.db.insert("featureFlags", {
      key: "DEMO_AUTO_CONFIRM_PAYMENTS",
      description: "Démo sans PSP : confirme les paiements instantanément pour les restaurants listés (jamais les autres).",
      status: restaurantIds.length > 0 ? "active" : "disabled",
      rolloutType: "allowlist",
      rolloutValue: { restaurantIds },
    })
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
        await applyConfirmedPayment(ctx, table, p)
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

// ── GOAL_PAIEMENTS_03 — grand livre par ligne ─────────────────────────────────
// Helpers de capacité. Une ligne legacy (sans paidCents) retombe sur le
// booléen `paid` : payée = tout son montant, sinon 0.
type LedgerLine = NonNullable<Doc<"tables">["orderItems"]>[number]

function lineTotalCents(l: LedgerLine): number { return l.qty * l.unitCents }
function linePaidCents(l: LedgerLine): number {
  return l.paidCents ?? (l.paid ? lineTotalCents(l) : 0)
}
// Capacité tenue par des holds actifs (paiement_attente toujours ; reclamee
// seulement si non expirée), en excluant les parts listées dans `ownParts`
// (les parts gelées par LE paiement considéré sont sa propre cible, pas un
// obstacle). Le pot commun ne se pose jamais sur une capacité tenue.
function heldCapacityCents(l: LedgerLine, now: number, ownParts?: Set<string>): number {
  return (l.holds ?? []).reduce((s, h) => {
    if (ownParts?.has(h.partId)) return s
    const active = h.state === "paiement_attente" || (h.expiresAt ?? 0) > now
    return active ? s + h.capacityCents : s
  }, 0)
}

// Chemin d'écriture UNIQUE de la confirmation — remplace reconcileTablePatch.
// Appelé par les 3 chemins existants (confirmPayment webhook, auto-confirm
// démo dans create, backfillDemoPending), dans la MÊME mutation que le passage
// à "Encaissé" : compteur (table.paidCents), ventilation (lignes.paidCents) et
// statut sont écrits ensemble, jamais l'un sans l'autre.
//
// Ventilation de pmt.subtotalCents (ledger §4) :
//   a. pmt.allocation présent (nouveau client)   → honorée, plafonnée au restant
//      confirmé de chaque ligne ;
//   b. pmt.paidItemNames présent (client legacy) → traduit en allocation sur les
//      lignes matchées par nom, dans l'ordre, partiel sur la dernière ;
//   c. reste à placer (parts égales / montant libre / débordement de a-b) →
//      méthode du plus grand reste sur la capacité LIBRE ET NON PAYÉE (jamais
//      sur une portion tenue par un hold actif d'un autre paiement).
// Un article n'est marqué `paid` que quand son paidCents atteint son prix —
// PLUS de bulk-flip quand la table passe à 100 % (fix Bug 1 : plus jamais
// d'article marqué payé sans argent le couvrant, y compris pour le legacy).
// L'excédent final non plaçable est tracé dans pmt.overflowCents + alerte
// gérant (table.alert) — jamais ajouté aux tips en silence, jamais perdu.
// Les parts gelées par ce paiement sont consommées (hold retiré : la part est
// désormais représentée par l'argent). Rejeu de webhook : appliedAllocation
// déjà écrit → no-op, on ne re-ventile jamais.
async function applyConfirmedPayment(
  ctx: MutationCtx,
  table: Doc<"tables">,
  pmt: Doc<"payments">,
): Promise<void> {
  // Idempotence de la confirmation (en plus du garde status === "Encaissé"
  // des appelants) : la ventilation réelle n'est écrite qu'une fois.
  if (pmt.appliedAllocation !== undefined) return

  const now = Date.now()
  const ownParts = new Set((pmt.heldParts ?? []).map(p => p.partId))
  const lines = (table.orderItems ?? []).map(l => ({
    ...l,
    holds: (l.holds ?? []).map(h => ({ ...h })),
  }))
  // lineId paresseux : une ligne legacy touchée par la réécriture reçoit son
  // identifiant (même principe que le backfill, sans éclater qty — l'argent
  // reste exact au niveau ligne via paidCents cumulatif).
  for (const l of lines) if (l.lineId === undefined) l.lineId = crypto.randomUUID()

  let toPlace = pmt.subtotalCents
  const applied = new Map<string, number>()
  const place = (l: (typeof lines)[number], amountCents: number): void => {
    const amount = Math.min(amountCents, lineTotalCents(l) - linePaidCents(l), toPlace)
    if (amount <= 0) return
    l.paidCents = linePaidCents(l) + amount
    l.paid = l.paidCents >= lineTotalCents(l)
    applied.set(l.lineId!, (applied.get(l.lineId!) ?? 0) + amount)
    toPlace -= amount
  }

  if (pmt.allocation?.length) {
    // a. allocation explicite du nouveau contrat
    for (const a of pmt.allocation) {
      const l = lines.find(x => x.lineId === a.lineId)
      if (l) place(l, a.amountCents)
    }
  } else if (pmt.paidItemNames?.length && lines.length) {
    // b. legacy : noms → lignes, dans l'ordre, partiel sur la dernière.
    // Deux passes : d'abord les lignes SANS hold actif d'un autre paiement —
    // sinon l'argent du legacy se pose sur une unité déjà tenue (et donc payée
    // par ailleurs), et l'allocation du paiement gelé déborde sur une unité
    // que personne n'a désignée. Le legacy ne « traverse » une réclamation
    // qu'en dernier recours, si aucune ligne libre ne porte le nom.
    const remainingNames = [...pmt.paidItemNames]
    for (const preferFree of [true, false]) {
      for (const l of lines) {
        if (toPlace <= 0 || remainingNames.length === 0) break
        if (linePaidCents(l) >= lineTotalCents(l)) continue
        if (preferFree && heldCapacityCents(l, now, ownParts) > 0) continue
        let count = 0
        for (let i = remainingNames.length - 1; i >= 0 && count < l.qty; i--) {
          if (remainingNames[i] === l.name) { remainingNames.splice(i, 1); count++ }
        }
        if (count > 0) place(l, count * l.unitCents)
      }
    }
  }

  // c. pot commun + débordement de a/b : plus grand reste, déterministe
  // (tri par capacité libre décroissante, départage par position), uniquement
  // sur la capacité libre et non payée (holds actifs d'autrui exclus).
  if (toPlace > 0 && lines.length) {
    const freeOf = (l: (typeof lines)[number]) =>
      Math.max(0, lineTotalCents(l) - linePaidCents(l) - heldCapacityCents(l, now, ownParts))
    const candidates = lines
      .map((l, i) => ({ l, i, free: freeOf(l) }))
      .filter(c => c.free > 0)
      .sort((a, b) => b.free - a.free || a.i - b.i)
    for (const c of candidates) {
      if (toPlace <= 0) break
      place(c.l, c.free)
    }
  }

  // Parts gelées par CE paiement : consommées (la part devient de l'argent).
  if (ownParts.size) {
    for (const l of lines) {
      if (l.holds.length) l.holds = l.holds.filter(h => !ownParts.has(h.partId))
    }
  }

  const overflowCents = toPlace > 0 ? toPlace : undefined
  const paidCents = (table.paidCents ?? 0) + pmt.subtotalCents
  const paidTipCents = (table.paidTipCents ?? 0) + pmt.tipCents
  const billCents = table.amountCents ?? 0
  const status = billCents > 0 && paidCents >= billCents ? "paid" as const : "payment" as const

  // Patch atomique : compteur + ventilation + statut ensemble (même mutation).
  const tablePatch: Record<string, unknown> = { paidCents, paidTipCents, status, orderItems: lines }
  if (overflowCents) tablePatch.alert = true // alerte gérant (mécanisme existant)
  await ctx.db.patch(table._id, tablePatch)
  await ctx.db.patch(pmt._id, {
    appliedAllocation: [...applied].map(([lineId, amountCents]) => ({ lineId, amountCents })),
    ...(overflowCents !== undefined ? { overflowCents } : {}),
  })
}

// Convives réels, jamais inventés : après le patch argent (applyConfirmedPayment,
// logique guests intouchée), remonte table.guests au meilleur signal disponible — le déclaré du
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
    // GOAL_PAIEMENTS_04 — confirmation TARDIVE (après clôture / nouvelle
    // sitting) : le rattachement se fait sur le sittingStartedAt DU PAIEMENT
    // (figé à sa création), jamais celui de la table au moment du webhook.
    // Si la sitting a changé (table libérée, ou rouverte pour d'autres
    // clients), l'argent est encaissé (le paiement passe "Encaissé" — les
    // analytics le comptent) mais la table du service SUIVANT n'est jamais
    // créditée. Tables legacy sans sittingStartedAt (des deux côtés) :
    // comportement inchangé.
    const sameSitting = table
      && table.status !== "free"
      && (pmt.sittingStartedAt === undefined
        || table.sittingStartedAt === undefined
        || pmt.sittingStartedAt === table.sittingStartedAt)
    if (table && sameSitting) {
      await applyConfirmedPayment(ctx, table, pmt)
      // Convives réels — STRICTEMENT après le patch argent, table relue pour
      // voir le paidCents crédité (les lectures voient les écritures de la
      // même mutation).
      const fresh = await ctx.db.get(pmt.tableId)
      if (fresh) {
        const guestsPatch = await computeGuestsPatch(ctx, fresh, pmt)
        if (guestsPatch) await ctx.db.patch(pmt.tableId, guestsPatch)
      }
    } else if (table) {
      console.warn(`[webhook] confirmation tardive ${provider}/${providerRef} — sitting close, table non créditée`)
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

    // GOAL_PAIEMENTS_04 — REMBOURSEMENT = inverse comptable du paiement, dans
    // UNE seule mutation : débit du paidCents des lignes couvertes
    // (appliedAllocation inversée, jamais sous 0), débit des compteurs table,
    // et recalcul du statut de table ENSEMBLE — une table `paid` qui repasse
    // sous son total dû redescend à `payment` atomiquement. Jamais paidCents
    // et status ne divergent, même temporairement.
    if (status === 'Remboursé' && pmt.status === 'Encaissé') {
      const table = await ctx.db.get(pmt.tableId)
      // On ne corrige la table que si le remboursement concerne la sitting
      // encore en cours (même règle de rattachement que la confirmation).
      const sameSitting = table
        && table.status !== 'free'
        && (pmt.sittingStartedAt === undefined
          || table.sittingStartedAt === undefined
          || pmt.sittingStartedAt === table.sittingStartedAt)
      if (table && sameSitting) {
        const refunds = new Map((pmt.appliedAllocation ?? []).map(a => [a.lineId, a.amountCents]))
        const lines = (table.orderItems ?? []).map(l => {
          const r = l.lineId !== undefined ? refunds.get(l.lineId) : undefined
          if (!r) return l
          const paidCents = Math.max(0, linePaidCents(l) - r)
          return { ...l, paidCents, paid: paidCents >= lineTotalCents(l) }
        })
        const paidCents = Math.max(0, (table.paidCents ?? 0) - pmt.subtotalCents)
        const paidTipCents = Math.max(0, (table.paidTipCents ?? 0) - pmt.tipCents)
        const billCents = table.amountCents ?? 0
        const tableStatus = billCents > 0 && paidCents >= billCents
          ? 'paid' as const
          : table.status === 'paid' || table.status === 'payment' ? 'payment' as const : table.status
        await ctx.db.patch(pmt.tableId, { orderItems: lines, paidCents, paidTipCents, status: tableStatus })
      }
    }
    // Ré-encaisser un paiement remboursé recréerait de l'argent sans trace —
    // interdit (passer par un nouveau paiement).
    if (pmt.status === 'Remboursé' && status === 'Encaissé') {
      throw new Error("Paiement déjà remboursé — créer un nouveau paiement")
    }

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
