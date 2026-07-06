// GOAL_PAIEMENTS_02 — Réclamation par PART (hold + TTL).
//
// Réclamer un plat = poser une PART sur une unité d'orderItems (lineId).
// Le hold est un compteur de capacité, pas un drapeau : une unité peut porter
// plusieurs parts actives (splitFactor ÷2/÷3/÷4), chacune avec sa propre
// expiration et son propre cycle de vie :
//
//   part : libre → reclamee (TTL 5 min) → paiement_attente (gel) → payée
//
// INVARIANT DE SÉCURITÉ (non négociable) : un hold ne touche JAMAIS
// `paidCents` ni le total payé de la table. Les états de hold vivent dans
// `orderItems[].holds` et n'entrent jamais dans le calcul de l'argent. Seul
// le webhook PSP signé (http.ts → confirmPayment) fait bouger l'argent —
// ce fichier n'y touche pas.
//
// PORTÉE : confort d'usage entre convives honnêtes (évite que deux personnes
// paient le même plat sans le vouloir). Ce n'est PAS un verrou anti-fraude :
// le flux convive est anonyme (pas d'auth, comme aujourd'hui) — ne jamais
// s'appuyer sur une réclamation comme mur de sécurité.
//
// Planification : `ctx.scheduler.runAfter` est enregistré dans la MÊME
// transaction que la pose du hold (garantie Convex) — pas de Redis, pas de
// cron externe.

import { ConvexError, v } from "convex/values"
import { mutation, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"

// Décision fondateur A : délai fixe 5 min, pas de heartbeat (parcours < 1 min).
export const CLAIM_TTL_MS = 5 * 60 * 1000

type Hold = {
  partId: string
  claimedBy?: string
  capacityCents: number
  state: "reclamee" | "paiement_attente"
  expiresAt?: number
}

// Une part `paiement_attente` est TOUJOURS active (sortie du régime TTL — gel,
// voir payments.create). Une part `reclamee` expirée ne bloque plus la
// capacité même si expirePart n'est pas encore passée (élagage opportuniste).
function isActiveHold(h: Hold, now: number): boolean {
  if (h.state === "paiement_attente") return true
  return (h.expiresAt ?? 0) > now
}

// Copie profonde lignes + holds (les docs Convex sont gelés en lecture).
function cloneLines(orderItems: Array<Record<string, unknown>> | undefined) {
  return (orderItems ?? []).map(l => ({
    ...l,
    holds: ((l.holds as Hold[] | undefined) ?? []).map(h => ({ ...h })),
  })) as Array<{ lineId?: string; qty: number; unitCents: number; paidCents?: number; holds: Hold[] } & Record<string, unknown>>
}

// Réclamer une part d'une unité. Verrou atomique SUR LA CAPACITÉ RESTANTE :
// prix de l'unité − paidCents − Σ capacités des parts actives. Deux parts
// partielles coexistent (A ½ maintenant, B ½ plus tard) ; une réclamation qui
// excède le restant est rejetée proprement (ConvexError explicite, jamais un
// plafonnement silencieux). L'expiration de CETTE part est planifiée dans la
// même mutation.
//
// `ttlMs` (optionnel, borné 1 s – 5 min) ne sert qu'aux tests E2E — la valeur
// par défaut et le plafond restent CLAIM_TTL_MS : personne ne peut poser un
// hold plus long que 5 min.
export const claimPart = mutation({
  args: {
    tableId: v.id("tables"),
    lineId: v.string(),
    capacityCents: v.number(),
    claimedBy: v.optional(v.string()),
    ttlMs: v.optional(v.number()),
  },
  handler: async (ctx, { tableId, lineId, capacityCents, claimedBy, ttlMs }) => {
    const table = await ctx.db.get(tableId)
    if (!table) throw new ConvexError({ code: "NOT_FOUND", message: "Table introuvable" })

    const lines = cloneLines(table.orderItems as never)
    const line = lines.find(l => l.lineId === lineId)
    if (!line) throw new ConvexError({ code: "LINE_NOT_FOUND", message: "Unité introuvable — commande modifiée entre-temps" })

    const now = Date.now()
    // Élagage opportuniste : même effet qu'expirePart, sans en dépendre.
    line.holds = line.holds.filter(h => isActiveHold(h, now))

    const unitTotal = line.qty * line.unitCents
    const remaining = unitTotal - (line.paidCents ?? 0) - line.holds.reduce((s, h) => s + h.capacityCents, 0)
    const cap = Math.floor(capacityCents)
    if (!(cap > 0)) throw new ConvexError({ code: "INVALID_CAPACITY", message: "Capacité demandée invalide" })
    if (cap > remaining) {
      // Unité pleine ou capacité insuffisante : refus PROPRE, jamais silencieux.
      throw new ConvexError({
        code: "CAPACITY_EXCEEDED",
        message: "Cette part n'est plus disponible",
        remainingCents: Math.max(0, remaining),
      })
    }

    const ttl = Math.max(1_000, Math.min(CLAIM_TTL_MS, Math.floor(ttlMs ?? CLAIM_TTL_MS)))
    const partId = crypto.randomUUID()
    const expiresAt = now + ttl
    line.holds.push({
      partId,
      claimedBy: claimedBy ? String(claimedBy).slice(0, 60) : undefined,
      capacityCents: cap,
      state: "reclamee",
      expiresAt,
    })

    await ctx.db.patch(tableId, { orderItems: lines as never })
    // Même transaction que la pose du hold : l'expiration de CETTE part est
    // garantie enregistrée avec elle (atomicité Convex mutation + scheduler).
    await ctx.scheduler.runAfter(ttl, internal.claims.expirePart, { tableId, lineId, partId })

    return { partId, expiresAt, remainingCents: remaining - cap }
  },
})

// Expiration planifiée d'UNE part précise. Ne libère que si la part est
// encore en `reclamee` pure ET que son expiration n'a pas été repoussée.
// Une part `paiement_attente` (gelée par un paiement en cours) n'est JAMAIS
// libérée ici — c'est le point critique anti double-encaissement (brief §4) :
// un 3D Secure de 8 minutes ne libère rien.
export const expirePart = internalMutation({
  args: { tableId: v.id("tables"), lineId: v.string(), partId: v.string() },
  handler: async (ctx, { tableId, lineId, partId }) => {
    const table = await ctx.db.get(tableId)
    if (!table?.orderItems?.length) return { released: false }

    const now = Date.now()
    let released = false
    const lines = cloneLines(table.orderItems as never).map(l => {
      if (l.lineId !== lineId || l.holds.length === 0) return l
      l.holds = l.holds.filter(h => {
        if (h.partId !== partId) return true
        if (h.state !== "reclamee") return true          // gelée : ne rien faire
        if ((h.expiresAt ?? 0) > now) return true        // repoussée : pas encore due
        released = true
        return false                                     // libère SA capacité seule
      })
      return l
    })

    if (released) await ctx.db.patch(tableId, { orderItems: lines as never })
    return { released }
  },
})

// GOAL_PAIEMENTS_04 — Libération des parts gelées d'UN paiement.
// Ne libère que les parts encore en `paiement_attente` ET seulement si le
// paiement est toujours "En attente" (un paiement confirmé a déjà consommé ses
// holds dans applyConfirmedPayment ; un paiement remboursé aussi). Appelée :
//   - par le filet de secours planifié à la création du paiement (~15 min,
//     couvre le cas « aucun webhook, succès ou échec, n'arrive jamais ») ;
//   - par failPayment ci-dessous (échec PSP explicite).
async function releaseFrozenPartsOf(
  ctx: { db: { get: (id: any) => Promise<any>; patch: (id: any, patch: any) => Promise<void> } },
  pmt: { _id: unknown; status: string; tableId: unknown; heldParts?: { partId: string }[] },
): Promise<{ released: number }> {
  if (pmt.status !== "En attente") return { released: 0 }
  const partIds = new Set((pmt.heldParts ?? []).map(p => p.partId))
  if (partIds.size === 0) return { released: 0 }

  const table = await ctx.db.get(pmt.tableId)
  if (!table?.orderItems?.length) return { released: 0 }

  let released = 0
  const lines = cloneLines(table.orderItems as never).map(l => {
    if (l.holds.length === 0) return l
    l.holds = l.holds.filter(h => {
      if (!partIds.has(h.partId)) return true
      if (h.state !== "paiement_attente") return true
      released++
      return false
    })
    return l
  })
  if (released > 0) await ctx.db.patch(pmt.tableId, { orderItems: lines as never })
  return { released }
}

export const releaseFrozenParts = internalMutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, { paymentId }) => {
    const pmt = await ctx.db.get(paymentId)
    if (!pmt) return { released: 0 }
    return releaseFrozenPartsOf(ctx, pmt)
  },
})

// GOAL_PAIEMENTS_04 — Échec de paiement signalé par le PSP (carte refusée,
// erreur banque). internalMutation : SEUL un chemin serveur vérifié peut
// l'appeler — la règle « ne jamais toucher http.ts ni la vérification de
// signature » du chantier fait que le branchement webhook d'échec est différé ;
// cette mutation est la cible prête à câbler (même modèle que confirmPayment :
// match par provider+providerRef). En attendant, le filet de secours temporel
// (releaseFrozenParts planifié à la création) couvre tous les cas.
export const failPayment = internalMutation({
  args: { provider: v.string(), providerRef: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, { provider, providerRef, reason }) => {
    const pmt = await ctx.db
      .query("payments")
      .withIndex("by_provider_ref", q => q.eq("provider", provider).eq("providerRef", providerRef))
      .first()
    if (!pmt) return { ok: false, reason: "not_found" }
    // Un paiement déjà confirmé ne peut pas « échouer » rétroactivement ici —
    // l'argent est encaissé ; un litige passe par le remboursement.
    if (pmt.status !== "En attente") return { ok: false, reason: "not_pending" }
    const res = await releaseFrozenPartsOf(ctx, pmt)
    console.warn(`[failPayment] ${provider}/${providerRef} — ${reason ?? "échec PSP"} — ${res.released} part(s) libérée(s)`)
    return { ok: true, released: res.released }
  },
})

// Bouton « libérer ma part » : même logique que l'expiration, déclenchée
// manuellement — ne libère que si la part est encore en `reclamee`.
export const releasePart = mutation({
  args: { tableId: v.id("tables"), lineId: v.string(), partId: v.string() },
  handler: async (ctx, { tableId, lineId, partId }) => {
    const table = await ctx.db.get(tableId)
    if (!table?.orderItems?.length) return { released: false }

    let released = false
    const lines = cloneLines(table.orderItems as never).map(l => {
      if (l.lineId !== lineId || l.holds.length === 0) return l
      l.holds = l.holds.filter(h => {
        if (h.partId !== partId) return true
        if (h.state !== "reclamee") return true          // en paiement : intouchable
        released = true
        return false
      })
      return l
    })

    if (released) await ctx.db.patch(tableId, { orderItems: lines as never })
    return { released }
  },
})
