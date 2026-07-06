// Fabrique de ligne centralisée (GOAL_PAIEMENTS_01).
//
// TOUTE nouvelle unité d'orderItems naît ici : `lineId` neuf (uuid),
// `paidCents: 0`, `holds: []`. Granularité À L'UNITÉ : une entrée demandée
// avec qty N est éclatée en N unités de qty 1 — cohérent avec l'éclatement
// par qty déjà fait côté client (Items.tsx), l'adressage `lineId` s'ancre à
// l'unité, pas à la ligne agrégée. Les lignes legacy (qty > 1, sans lineId)
// restent valides tant que le backfill (tables.backfillLineIds) n'est pas
// passé — tout lecteur doit tolérer les deux formes.
//
// Règle non négociable (BRIEF_IMPLEMENTATION_DEFINITIF §8 Phase 1) : la
// fabrique n'incrémente JAMAIS le qty d'une unité existante — une recommande
// du même article obtient toujours une unité neuve avec un lineId neuf, même
// si le nom correspond à une unité déjà présente (a fortiori si elle porte un
// hold actif ou paidCents > 0). Le merge par nom d'addOrderItems est remplacé
// par un simple append d'unités neuves.
//
// SÉCURITÉ : le hold ne touche jamais l'argent — une unité naît paidCents: 0
// et les états de hold vivent dans `holds`, jamais dans le calcul du total.

export type OrderLineInput = { name: string; qty: number; unitCents: number }

export type OrderItemHold = {
  partId: string
  claimedBy?: string
  capacityCents: number
  state: "reclamee" | "paiement_attente"
  expiresAt?: number
}

export type OrderLine = {
  name: string
  qty: number
  unitCents: number
  paid?: boolean
  lineId?: string
  paidCents?: number
  holds?: OrderItemHold[]
}

// Plafond d'unités par appel — même ordre de grandeur que le plafond de lignes
// existant (Vuln 2 : 200 lignes). Après éclatement par qty, il borne le nombre
// d'UNITÉS produites, ce qui est strictement plus contraignant qu'avant (une
// entrée anonyme ne peut plus gonfler le document via qty 999 × 200 lignes).
const MAX_UNITS = 200

// Bornes Vuln 2 existantes (updateStatus / addOrderItems) : nom 120 chars,
// qty 0-999, prix 0-1M€. Centralisées ici pour que tous les chemins d'écriture
// partagent le même assainissement.
export function sanitizeLineInput(it: OrderLineInput): OrderLineInput {
  return {
    name: String(it.name).slice(0, 120),
    qty: Math.max(0, Math.min(999, Math.floor(it.qty))),
    unitCents: Math.max(0, Math.min(100_000_000, Math.floor(it.unitCents))),
  }
}

// items demandés → unités neuves, assainies, éclatées par qty, initialisées.
// Seule porte de création d'unités : updateStatus, addOrderItems, seed.ts (et
// tout futur chemin) doivent passer par ici.
export function makeUnits(items: OrderLineInput[]): OrderLine[] {
  const units: OrderLine[] = []
  for (const raw of items.slice(0, MAX_UNITS)) {
    const it = sanitizeLineInput(raw)
    if (it.qty <= 0) continue
    for (let i = 0; i < it.qty; i++) {
      if (units.length >= MAX_UNITS) return units
      units.push({
        name: it.name,
        qty: 1,
        unitCents: it.unitCents,
        lineId: crypto.randomUUID(),
        paidCents: 0,
        holds: [],
      })
    }
  }
  return units
}

// Somme des montants des unités produites — à utiliser pour incrémenter
// amountCents afin de rester exactement cohérent avec ce qui a été inséré
// (y compris si le plafond MAX_UNITS a tronqué la demande).
export function unitsTotalCents(units: OrderLine[]): number {
  return units.reduce((s, u) => s + u.qty * u.unitCents, 0)
}
