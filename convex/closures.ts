import { query } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"

// M11-B — Calcul de la répartition des pourboires à la clôture de service.
// Lit restaurants.tipSettings (M11-A) ; défaut "equal" si absent. Les tables
// "paid" portent paidTipCents (pourboire encaissé) et amountCents (CA), et
// assignedMemberId (serveur). Les shifts du jour donnent les heures travaillées.

// Répartit `amount` (cents entiers) proportionnellement à `weights`, en
// préservant la somme exacte via la méthode du plus grand reste.
function distributeCents(amount: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0)
  if (amount <= 0 || total <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (amount * w) / total)
  const floored = raw.map((x) => Math.floor(x))
  let remainder = amount - floored.reduce((s, x) => s + x, 0)
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    floored[order[k].i] += 1
  }
  return floored
}

// Heures d'un shift : réel (checkedInAt/Out) si dispo, sinon planifié
// (startTime/endTime "HH:MM"). Gère le service de nuit (fin < début).
function shiftHours(s: {
  startTime?: string
  endTime?: string
  checkedInAt?: number
  checkedOutAt?: number
}): number {
  if (s.checkedInAt && s.checkedOutAt && s.checkedOutAt > s.checkedInAt) {
    return (s.checkedOutAt - s.checkedInAt) / 3_600_000
  }
  const toMin = (t?: string) => {
    if (!t) return null
    const [h, m] = t.split(":").map(Number)
    if (Number.isNaN(h)) return null
    return h * 60 + (Number.isNaN(m) ? 0 : m)
  }
  const a = toMin(s.startTime)
  const b = toMin(s.endTime)
  if (a == null || b == null) return 0
  let d = b - a
  if (d < 0) d += 24 * 60 // service de nuit
  return d / 60
}

export const getTipDistribution = query({
  args: { restaurantId: v.id("restaurants"), serviceDate: v.string() }, // "2026-06-24"
  handler: async (ctx, args) => {
    await requireRestaurantAccess(ctx, args.restaurantId, ["owner", "manager"])

    const restaurant = await ctx.db.get(args.restaurantId)
    const mode = restaurant?.tipSettings?.mode ?? "equal"
    const kitchenPct = restaurant?.tipSettings?.kitchenSharePct ?? 0
    const coeffs = {
      owner: restaurant?.tipSettings?.roleCoefficients?.owner ?? 1,
      manager: restaurant?.tipSettings?.roleCoefficients?.manager ?? 1,
      staff: restaurant?.tipSettings?.roleCoefficients?.staff ?? 1,
    }

    const [tables, shifts, members] = await Promise.all([
      ctx.db
        .query("tables")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
        .filter((q) => q.eq(q.field("status"), "paid"))
        .collect(),
      ctx.db
        .query("shifts")
        .withIndex("by_restaurant_date", (q) =>
          q.eq("restaurantId", args.restaurantId).eq("date", args.serviceDate),
        )
        .collect(),
      ctx.db
        .query("members")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
        .collect(),
    ])

    const totalTips = tables.reduce((s, t) => s + (t.paidTipCents ?? 0), 0)
    // "table" / "revenue" répartissent déjà par contribution → pas de part cuisine.
    const effKitchenPct = mode === "table" || mode === "revenue" ? 0 : kitchenPct
    const kitchenShare = Math.round((totalTips * effKitchenPct) / 100)
    const toDistribute = totalTips - kitchenShare

    const memberById = new Map(members.map((m) => [m._id as string, m]))

    // Tables servies + CA par membre (depuis les tables payées assignées).
    const stats = new Map<string, { tablesServed: number; revenueCents: number }>()
    for (const t of tables) {
      if (!t.assignedMemberId) continue
      const k = t.assignedMemberId as string
      const cur = stats.get(k) ?? { tablesServed: 0, revenueCents: 0 }
      cur.tablesServed += 1
      cur.revenueCents += t.amountCents ?? 0
      stats.set(k, cur)
    }

    // Heures travaillées par membre (somme des shifts du jour).
    const hoursByMember = new Map<string, number>()
    for (const s of shifts) {
      const k = s.memberId as string
      hoursByMember.set(k, (hoursByMember.get(k) ?? 0) + shiftHours(s))
    }

    // Participants + poids selon le mode.
    let participantIds: string[]
    let weightFn: (id: string) => number
    if (mode === "table") {
      participantIds = [...stats.entries()].filter(([, s]) => s.tablesServed > 0).map(([k]) => k)
      weightFn = (id) => stats.get(id)?.tablesServed ?? 0
    } else if (mode === "revenue") {
      participantIds = [...stats.entries()].filter(([, s]) => s.revenueCents > 0).map(([k]) => k)
      weightFn = (id) => stats.get(id)?.revenueCents ?? 0
    } else {
      // equal / hours / points → membres planifiés ce jour (roster).
      participantIds = [...new Set(shifts.map((s) => s.memberId as string))]
      if (mode === "hours") {
        weightFn = (id) => hoursByMember.get(id) ?? 0
      } else if (mode === "points") {
        weightFn = (id) => {
          const role = (memberById.get(id)?.role ?? "staff") as "owner" | "manager" | "staff"
          return coeffs[role] ?? 1
        }
      } else {
        weightFn = () => 1 // equal
      }
    }

    let weights = participantIds.map(weightFn)
    // Garde-fou : si tous les poids sont nuls mais des participants existent,
    // répartir également (évite de tout verser à personne).
    if (weights.length > 0 && weights.every((w) => w === 0)) {
      weights = participantIds.map(() => 1)
    }

    const amounts = distributeCents(toDistribute, weights)

    const distribution = participantIds
      .map((id, i) => {
        const m = memberById.get(id)
        const name =
          m?.displayName ??
          (m?.firstName ? `${m.firstName} ${m.lastName ?? ""}`.trim() : null) ??
          m?.name ??
          "Inconnu"
        const st = stats.get(id) ?? { tablesServed: 0, revenueCents: 0 }
        return {
          memberId: id,
          firstName: m?.firstName ?? null,
          lastName: m?.lastName ?? null,
          name,
          role: m?.role ?? "staff",
          tablesServed: st.tablesServed,
          amountCents: amounts[i],
        }
      })
      .sort((a, b) => b.amountCents - a.amountCents)

    return { mode, totalTips, kitchenShare, toDistribute, distribution }
  },
})
