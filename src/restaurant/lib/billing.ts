// Formules de facturation partagées entre Tables live, Vue d'ensemble,
// Analytics et CRM. Toujours passer par ces helpers plutôt que de
// recalculer localement — historique : Tables.tsx et le CRM avaient
// chacun leur version divergente (reste, %, panier moyen).
// Convention : tous les montants sont en centimes (integer cents).

/** Pourcentage payé d'une addition (0-100, borné). 0 si total inconnu/nul. */
export function paidPct(paidCents: number, totalCents: number): number {
  if (totalCents <= 0) return 0
  return Math.min(100, Math.round((paidCents / totalCents) * 100))
}

/** Reste à payer, jamais négatif. */
export function remainingCents(totalCents: number, paidCents: number): number {
  return Math.max(0, totalCents - paidCents)
}

/** Montant par couvert. null si données insuffisantes (afficher "—"). */
export function perGuestCents(totalCents: number, guests: number): number | null {
  if (totalCents <= 0 || guests <= 0) return null
  return Math.round(totalCents / guests)
}

/** Panier moyen par couvert sur un ensemble de paiements. null si aucun couvert. */
export function avgBasketCents(subtotalSumCents: number, guestsTotal: number): number | null {
  if (guestsTotal <= 0) return null
  return Math.round(subtotalSumCents / guestsTotal)
}

/** Variation en % entre deux montants. null si la base est nulle (afficher "—"). */
export function deltaPct(currentCents: number, previousCents: number): number | null {
  if (previousCents <= 0) return null
  return Math.round(((currentCents - previousCents) / previousCents) * 100)
}
