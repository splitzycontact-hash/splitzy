import { query, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"
import type { Doc } from "./_generated/dataModel"

const DAY_MS = 86_400_000
const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

// Insight calculé à la volée (déterministe, pas d'appel LLM). Porte `priority`
// (consommé par la config couleur de l'UI) ET `severity` (sémantique métier).
type DynamicInsight = {
  type: "forecast" | "dormant_item" | "low_basket"
  severity: "info" | "warning"
  priority: "low" | "medium" | "high"
  title: string
  body: string
  metric?: string
  action?: string
}

// "1850" cents → "18€" (euros entiers, lecture rapide pour un ticket moyen).
function euro(cents: number): string {
  return `${Math.round(cents / 100)}€`
}

// ── 1 — Prévision d'affluence ─────────────────────────────────────
// Regarde les 4 dernières occurrences du même jour de semaine (hors semaine
// courante), bucketise les couverts par heure et retourne l'heure de pic + la
// moyenne de couverts par jour. ⚠ heures/jour en UTC (runtime Convex) — décalé
// de ~1-2h vs Paris, suffisant pour une heuristique de pic.
function forecastAffluence(payments: Doc<"payments">[], now: number): DynamicInsight | null {
  const dayOfWeek = new Date(now).getDay()
  const weekAgo = now - 7 * DAY_MS
  const dayKey = (ts: number) => Math.floor(ts / DAY_MS)

  const sameWeekday = payments.filter(
    p => p.status === "Encaissé" && p.createdAt < weekAgo && new Date(p.createdAt).getDay() === dayOfWeek,
  )
  if (sameWeekday.length === 0) return null

  // 4 dates les plus récentes de ce jour de semaine.
  const recentDates = [...new Set(sameWeekday.map(p => dayKey(p.createdAt)))].sort((a, b) => b - a).slice(0, 4)
  const window = new Set(recentDates)
  const sample = sameWeekday.filter(p => window.has(dayKey(p.createdAt)))
  const sampleDays = recentDates.length

  const hourBuckets: Record<number, number> = {}
  for (const p of sample) {
    const h = new Date(p.createdAt).getHours()
    hourBuckets[h] = (hourBuckets[h] ?? 0) + (p.guests ?? 1)
  }
  const peak = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0]
  if (!peak) return null

  const peakHour = Number(peak[0])
  const totalCovers = sample.reduce((s, p) => s + (p.guests ?? 1), 0)
  const avgCovers = Math.round(totalCovers / sampleDays)
  const jour = WEEKDAYS_FR[dayOfWeek]

  return {
    type: "forecast",
    severity: "info",
    priority: "low",
    title: "Prévision d'affluence",
    body: `Pic attendu vers ${peakHour}h (moy. ${avgCovers} couvert${avgCovers > 1 ? "s" : ""} sur les ${sampleDays} dernier${sampleDays > 1 ? "s" : ""} ${jour}${sampleDays > 1 ? "s" : ""}).`,
    metric: `${peakHour}h`,
  }
}

// ── 2 — Article dormant ───────────────────────────────────────────
// Compte les articles payés sur 30 jours via `payments.paidItemNames` (source
// historique réelle — les `tables.orderItems` sont remis à zéro à la libération,
// donc inexploitables sur une fenêtre glissante). Flague les articles commandés
// < 2 fois → candidat au retrait de la carte.
function dormantItem(payments: Doc<"payments">[], now: number): DynamicInsight | null {
  const monthAgo = now - 30 * DAY_MS
  const counts: Record<string, number> = {}
  for (const p of payments) {
    if (p.status !== "Encaissé" || p.createdAt < monthAgo) continue
    for (const name of p.paidItemNames ?? []) {
      counts[name] = (counts[name] ?? 0) + 1
    }
  }
  const dormant = Object.entries(counts)
    .filter(([, c]) => c < 2)
    .sort((a, b) => a[1] - b[1])
  if (dormant.length === 0) return null

  const [name, count] = dormant[0]
  const others = dormant.length - 1
  const suffix = others > 0 ? ` (et ${others} autre${others > 1 ? "s" : ""} article${others > 1 ? "s" : ""} peu commandé${others > 1 ? "s" : ""})` : ""

  return {
    type: "dormant_item",
    severity: "info",
    priority: "low",
    title: "Article dormant",
    body: `${name} : commandé ${count} fois en 30 jours${suffix} — envisager de le retirer de la carte.`,
    metric: `${count}×`,
    action: "Revoir la carte",
  }
}

// ── 3 — Panier faible ─────────────────────────────────────────────
// Compare le ticket moyen d'aujourd'hui vs la moyenne sur 30 jours. Si le ticket
// du jour tombe sous 80% de la moyenne → alerte (warning, orange).
function lowBasket(payments: Doc<"payments">[], now: number): DynamicInsight | null {
  const monthAgo = now - 30 * DAY_MS
  const todayStart = now - (now % DAY_MS) // minuit UTC ≈ minuit Paris pour le service du soir

  let monthCA = 0, monthCov = 0, todayCA = 0, todayCov = 0
  for (const p of payments) {
    if (p.status !== "Encaissé" || p.createdAt < monthAgo) continue
    monthCA += p.subtotalCents
    monthCov += p.guests ?? 1
    if (p.createdAt >= todayStart) {
      todayCA += p.subtotalCents
      todayCov += p.guests ?? 1
    }
  }
  if (todayCov === 0 || monthCov === 0) return null

  const avgMonth = monthCA / monthCov
  const avgToday = todayCA / todayCov
  if (avgToday >= avgMonth * 0.8) return null

  const pct = Math.round((1 - avgToday / avgMonth) * 100)
  return {
    type: "low_basket",
    severity: "warning",
    priority: "medium",
    title: "Panier moyen faible ce soir",
    body: `Ticket moyen ce soir : ${euro(avgToday)} vs ${euro(avgMonth)} habituellement (-${pct}%).`,
    metric: `-${pct}%`,
    action: "Suggérer entrées / desserts en salle",
  }
}

// Agrège les 3 insights dynamiques. Chacun retourne null s'il n'a pas assez de
// données → seuls les insights pertinents apparaissent.
function buildDynamicInsights(payments: Doc<"payments">[], now: number): DynamicInsight[] {
  const out: DynamicInsight[] = []
  for (const fn of [forecastAffluence, dormantItem, lowBasket]) {
    const ins = fn(payments, now)
    if (ins) out.push(ins)
  }
  return out
}

export const getLatestInsights = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    // SECURITY (M4) : garde cross-tenant — l'appelant doit avoir accès au restaurant.
    await requireRestaurantAccess(ctx, restaurantId)

    const stored = await ctx.db
      .query("insights")
      .withIndex("by_restaurant_date", q => q.eq("restaurantId", restaurantId))
      .order("desc")
      .first()

    // Insights dynamiques (prévision / article dormant / panier faible) calculés
    // à la lecture car sensibles au temps ("ce soir", jour de semaine courant) —
    // un snapshot nocturne serait périmé en journée.
    const now = Date.now()
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const dynamic = buildDynamicInsights(payments, now)

    if (!stored && dynamic.length === 0) return null

    return {
      ...(stored ?? { restaurantId, generatedAt: now, period: "live" }),
      insights: [...(stored?.insights ?? []), ...dynamic],
    }
  },
})

export const store = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    generatedAt: v.number(),
    period: v.string(),
    insights: v.array(v.object({
      type: v.string(),
      priority: v.string(),
      title: v.string(),
      body: v.string(),
      metric: v.optional(v.string()),
      action: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("insights", args)
  },
})
