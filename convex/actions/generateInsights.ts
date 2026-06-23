"use node"
import { action, internalAction } from "../_generated/server"
import { v } from "convex/values"
import { api, internal } from "../_generated/api"
import type { Doc } from "../_generated/dataModel"

type Insight = {
  type: string
  priority: string
  title: string
  body: string
  metric?: string
  action?: string
}

// Formate un montant en centimes vers "12,50 €" (virgule FR, jamais de float stocké).
function eur(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`
}

// Construit les 3 insights thématiques (réputation, financier, service) à partir
// des données brutes. Fonction pure — réutilisée par l'action publique (guardée)
// et l'action interne (cron). Chaque insight gère son propre cas "pas de données".
function buildInsights(
  feedbacks: Doc<"feedbacks">[],
  payments: Doc<"payments">[],
  tables: Doc<"tables">[],
  now: number,
): Insight[] {
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
  const insights: Insight[] = []

  // ── Insight 1 — Réputation ──────────────────────────────────────
  if (feedbacks.length === 0) {
    insights.push({
      type: "reputation",
      priority: "low",
      title: "Pas encore de données",
      body: "Aucun feedback reçu pour le moment. Les insights réputation apparaîtront une fois que vos clients auront laissé leurs premiers avis.",
    })
  } else {
    const total = feedbacks.length
    const avg = feedbacks.reduce((s, f) => s + f.stars, 0) / total
    const negCount = feedbacks.filter(f => f.stars <= 2).length
    const posCount = feedbacks.filter(f => f.stars >= 4).length
    const recentFbs = feedbacks.filter(f => f.createdAt >= oneWeekAgo)
    const recentAvg = recentFbs.length >= 3
      ? recentFbs.reduce((s, f) => s + f.stars, 0) / recentFbs.length
      : null

    const tagCount: Record<string, number> = {}
    for (const fb of feedbacks) {
      for (const tag of fb.tags) {
        tagCount[tag] = (tagCount[tag] ?? 0) + 1
      }
    }
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t)

    const priority = avg < 3.5 ? "high" : avg < 4 ? "medium" : "low"

    let title: string
    let body: string
    let actionText: string | undefined

    if (avg >= 4.5) {
      title = "Excellente réputation — continuez ainsi"
      body = `Note moyenne de ${avg.toFixed(1)}/5 sur ${total} avis. ${Math.round(posCount / total * 100)}% des clients ont donné 4 étoiles ou plus.${topTags.length ? ` Points forts : ${topTags.join(", ")}.` : ""}`
    } else if (avg >= 4) {
      title = "Bonne réputation avec marge de progression"
      body = `Note moyenne de ${avg.toFixed(1)}/5 sur ${total} avis. ${negCount > 0 ? `${negCount} avis très négatif${negCount > 1 ? "s" : ""} (≤ 2 étoiles) à traiter.` : "Aucun avis très négatif."}${topTags.length ? ` Thèmes récurrents : ${topTags.join(", ")}.` : ""}`
      if (negCount > 0) actionText = "Analyser les avis négatifs pour identifier les axes d'amélioration"
    } else if (avg >= 3) {
      title = "Réputation mitigée — action recommandée"
      body = `Note moyenne de ${avg.toFixed(1)}/5 sur ${total} avis. ${Math.round(negCount / total * 100)}% des clients ont donné 2 étoiles ou moins.${topTags.length ? ` Problèmes signalés : ${topTags.join(", ")}.` : ""}`
      actionText = "Identifier les points de friction et contacter les clients insatisfaits"
    } else {
      title = "Réputation dégradée — intervention urgente"
      body = `Note critique de ${avg.toFixed(1)}/5 sur ${total} avis. ${Math.round(negCount / total * 100)}% d'avis très négatifs. Une action immédiate est nécessaire.${topTags.length ? ` Problèmes signalés : ${topTags.join(", ")}.` : ""}`
      actionText = "Réunion d'équipe prioritaire pour corriger les problèmes identifiés"
    }

    if (recentAvg !== null) {
      const diff = recentAvg - avg
      if (diff > 0.3) body += ` Tendance positive cette semaine (+${diff.toFixed(1)} pt).`
      else if (diff < -0.3) body += ` Tendance négative cette semaine (${diff.toFixed(1)} pt).`
    }

    insights.push({
      type: "reputation",
      priority,
      title,
      body,
      metric: `${avg.toFixed(1)}/5`,
      ...(actionText ? { action: actionText } : {}),
    })
  }

  // ── Insight 2 — Financier ───────────────────────────────────────
  const enc = payments.filter(p => p.status === "Encaissé" && p.createdAt >= oneWeekAgo)
  const ca = enc.reduce((s, p) => s + p.subtotalCents, 0)
  const tips = enc.reduce((s, p) => s + (p.tipCents ?? 0), 0)
  const ticket = enc.length > 0 ? ca / enc.length : 0

  if (enc.length === 0) {
    insights.push({
      type: "revenue",
      priority: "low",
      title: "Aucune vente cette semaine",
      body: "Aucun paiement encaissé sur les 7 derniers jours. L'analyse financière apparaîtra dès vos premières ventes.",
      metric: "0 €",
    })
  } else {
    const tipPct = ca > 0 ? Math.round((tips / ca) * 100) : 0
    insights.push({
      type: "revenue",
      priority: "low",
      title: "Activité financière de la semaine",
      body: `CA de ${eur(ca)} sur ${enc.length} ticket${enc.length > 1 ? "s" : ""} encaissé${enc.length > 1 ? "s" : ""}. Ticket moyen de ${eur(ticket)}. Pourboires : ${eur(tips)} (${tipPct}% du CA).`,
      metric: `${(ca / 100).toFixed(0)} €`,
    })
  }

  // ── Insight 3 — Service ─────────────────────────────────────────
  const couverts = enc.reduce((s, p) => s + (p.guests ?? 0), 0)
  const rotation = tables.length > 0 ? (couverts / tables.length).toFixed(1) : "—"

  if (enc.length === 0 || tables.length === 0) {
    insights.push({
      type: "service",
      priority: "low",
      title: "Pas assez de données service",
      body: tables.length === 0
        ? "Aucune table configurée. Ajoutez vos tables pour suivre la rotation et les couverts."
        : "Aucun couvert encaissé cette semaine. Les indicateurs de service apparaîtront dès vos premières ventes.",
      metric: `${rotation} cov/table`,
    })
  } else {
    insights.push({
      type: "service",
      priority: "low",
      title: "Rotation et couverts de la semaine",
      body: `${couverts} couvert${couverts > 1 ? "s" : ""} servi${couverts > 1 ? "s" : ""} sur ${enc.length} ticket${enc.length > 1 ? "s" : ""}. Rotation moyenne de ${rotation} couverts par table (${tables.length} table${tables.length > 1 ? "s" : ""}).`,
      metric: `${rotation} cov/table`,
    })
  }

  return insights
}

// Action publique — déclenchée depuis le dashboard. La lecture api.feedbacks.list
// applique requireRestaurantAccess : garde d'accès conservée (throw si non autorisé).
// Délègue ensuite le calcul réel à l'action interne (mêmes données via internal.*).
export const generateInsightsForRestaurant = action({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await ctx.runQuery(api.feedbacks.list, { restaurantId })
    await ctx.runAction(
      internal.actions.generateInsights.generateInsightsForRestaurantInternal,
      { restaurantId },
    )
  },
})

// Action interne — pas de garde d'auth (appelée par le cron / l'action publique).
// Lit toutes les données via internal.* puis stocke les 3 insights thématiques.
export const generateInsightsForRestaurantInternal = internalAction({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const now = Date.now()
    const [feedbacks, payments, tables] = await Promise.all([
      ctx.runQuery(internal.feedbacks.listAll, { restaurantId }),
      ctx.runQuery(internal.payments.listAll, { restaurantId }),
      ctx.runQuery(internal.tables.listAll, { restaurantId }),
    ])
    const insights = buildInsights(feedbacks, payments, tables, now)
    await ctx.runMutation(internal.insights.store, {
      restaurantId,
      generatedAt: now,
      period: "all",
      insights,
    })
  },
})

// Cron quotidien — régénère les insights de tous les restaurants. Chaque restaurant
// est isolé (.catch) pour qu'un échec n'interrompe pas le batch.
export const generateInsightsForAllRestaurants = internalAction({
  args: {},
  handler: async (ctx) => {
    const ids = await ctx.runQuery(internal.restaurants.listAllIds, {})
    await Promise.all(
      ids.map(restaurantId =>
        ctx.runAction(
          internal.actions.generateInsights.generateInsightsForRestaurantInternal,
          { restaurantId },
        ).catch(() => null),
      ),
    )
  },
})
