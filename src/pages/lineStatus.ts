// GOAL_PAIEMENTS_10 — dérivation PURE de l'état de repos d'une unité de la
// liste « Mes articles » (aucun import React : testée telle quelle par
// e2e/scripts/verify-partial-no-hold-label.ts sur des documents Convex réels).
//
// L'état de repos = ce que voit un convive AVANT toute interaction. Il se base
// exclusivement sur l'état réel du grand livre (paidCents + holds actifs),
// jamais sur une approximation :
//   - paidCents >= prix                      → « Payé ✓ »
//   - holds actifs couvrent tout le reste    → « Réservé pour toi » si tous les
//     holds bloquants portent mon clientId (part posée puis sélection locale
//     perdue, ex. rechargement), sinon « Réservé par un autre convive » —
//     montant affiché = VRAI reste (prix − paidCents), jamais 0€.
//   - 0 < paidCents < prix, capacité libre   → « Reste X » et l'unité reste
//     sélectionnable, exactement comme une unité à 0 % payée.
import { formatEur } from '../utils/formatCurrency'

export type LineHold = {
  partId: string
  claimedBy?: string
  capacityCents: number
  state: 'reclamee' | 'paiement_attente'
  expiresAt?: number
}

export type LineInput = {
  qty: number
  unitCents: number
  paid?: boolean
  paidCents?: number
  holds?: LineHold[]
}

export type LineStatusContext = {
  // Parts que J'AI réclamées dans CETTE session (elles ne bloquent pas ma vue).
  myPartIds: ReadonlySet<string>
  // Identité anonyme stable de l'onglet — reconnaît mes holds après perte de
  // la sélection locale (claimedBy posé par claims:claimPart).
  clientId?: string
  nowMs: number
}

export type LineStatus = {
  isPaid: boolean
  remainingCents: number     // vrai reste : prix − paidCents
  availableCents: number     // reste − capacité tenue par les holds actifs d'autrui
  restingLabel: string       // libellé à l'état de repos (hors sélection active)
  restingAmountCents: number // montant de la colonne prix à l'état de repos
}

// Une part `paiement_attente` est toujours active (gel) ; une part `reclamee`
// n'est active que jusqu'à son expiration — mêmes règles que claims.ts.
const isActiveHold = (h: LineHold, nowMs: number) =>
  h.state === 'paiement_attente' || (h.expiresAt ?? 0) > nowMs

export function computeLineStatus(line: LineInput, ctx: LineStatusContext): LineStatus {
  const total = line.qty * line.unitCents
  const paidC = line.paidCents ?? (line.paid ? total : 0)
  const remainingCents = Math.max(0, total - paidC)
  const isPaid = total > 0 && paidC >= total

  const blockingHolds = (line.holds ?? []).filter(h =>
    !ctx.myPartIds.has(h.partId) && isActiveHold(h, ctx.nowMs))
  const heldByOthers = blockingHolds.reduce((s, h) => s + h.capacityCents, 0)
  const availableCents = Math.max(0, remainingCents - heldByOthers)

  if (isPaid) {
    return { isPaid, remainingCents, availableCents, restingLabel: 'Payé ✓', restingAmountCents: total }
  }

  if (availableCents <= 0 && remainingCents > 0) {
    // Tout le reste est tenu par des holds actifs. « pour toi » seulement si
    // TOUS les holds bloquants sont les miens (claimedBy === mon clientId).
    const mine = !!ctx.clientId && blockingHolds.length > 0
      && blockingHolds.every(h => h.claimedBy === ctx.clientId)
    return {
      isPaid, remainingCents, availableCents,
      restingLabel: mine ? 'Réservé pour toi' : 'Réservé par un autre convive',
      restingAmountCents: remainingCents,
    }
  }

  if (remainingCents > 0 && remainingCents < total) {
    // Partiellement payée SANS blocage total : disponible, on affiche le reste.
    return {
      isPaid, remainingCents, availableCents,
      restingLabel: `Reste ${formatEur(remainingCents)}`
        + (availableCents < remainingCents ? ` · dispo ${formatEur(availableCents)}` : ''),
      restingAmountCents: availableCents < remainingCents ? availableCents : remainingCents,
    }
  }

  // Unité à 0 % payée (ou prix nul) — éventuellement en partie tenue par autrui.
  return {
    isPaid, remainingCents, availableCents,
    restingLabel: availableCents < remainingCents
      ? `Dispo ${formatEur(availableCents)} (part réservée ailleurs)`
      : '',
    restingAmountCents: availableCents < remainingCents ? availableCents : total,
  }
}
