"use node"
import { action } from "../_generated/server"
import { v } from "convex/values"
import { api, internal } from "../_generated/api"

export const generateInsightsForRestaurant = action({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const feedbacks = await ctx.runQuery(api.feedbacks.list, { restaurantId })
    const now = Date.now()
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000

    if (feedbacks.length === 0) {
      await ctx.runMutation(internal.insights.store, {
        restaurantId,
        generatedAt: now,
        period: "all",
        insights: [{
          type: "reputation",
          priority: "low",
          title: "Pas encore de données",
          body: "Aucun feedback reçu pour le moment. Les insights apparaîtront une fois que vos clients auront laissé leurs premiers avis.",
        }],
      })
      return
    }

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
      body = `Note moyenne de ${avg.toFixed(1)}/5 sur ${total} avis. ${Math.round(posCount / total * 100)}% des clients ont donné 4 étoiles ou plus.${topTags.length ? ` Points forts : ${topTags.join(', ')}.` : ''}`
    } else if (avg >= 4) {
      title = "Bonne réputation avec marge de progression"
      body = `Note moyenne de ${avg.toFixed(1)}/5 sur ${total} avis. ${negCount > 0 ? `${negCount} avis très négatif${negCount > 1 ? 's' : ''} (≤ 2 étoiles) à traiter.` : 'Aucun avis très négatif.'}${topTags.length ? ` Thèmes récurrents : ${topTags.join(', ')}.` : ''}`
      if (negCount > 0) actionText = "Analyser les avis négatifs pour identifier les axes d'amélioration"
    } else if (avg >= 3) {
      title = "Réputation mitigée — action recommandée"
      body = `Note moyenne de ${avg.toFixed(1)}/5 sur ${total} avis. ${Math.round(negCount / total * 100)}% des clients ont donné 2 étoiles ou moins.${topTags.length ? ` Problèmes signalés : ${topTags.join(', ')}.` : ''}`
      actionText = "Identifier les points de friction et contacter les clients insatisfaits"
    } else {
      title = "Réputation dégradée — intervention urgente"
      body = `Note critique de ${avg.toFixed(1)}/5 sur ${total} avis. ${Math.round(negCount / total * 100)}% d'avis très négatifs. Une action immédiate est nécessaire.${topTags.length ? ` Problèmes signalés : ${topTags.join(', ')}.` : ''}`
      actionText = "Réunion d'équipe prioritaire pour corriger les problèmes identifiés"
    }

    if (recentAvg !== null) {
      const diff = recentAvg - avg
      if (diff > 0.3) body += ` Tendance positive cette semaine (+${diff.toFixed(1)} pt).`
      else if (diff < -0.3) body += ` Tendance négative cette semaine (${diff.toFixed(1)} pt).`
    }

    await ctx.runMutation(internal.insights.store, {
      restaurantId,
      generatedAt: now,
      period: "all",
      insights: [{
        type: "reputation",
        priority,
        title,
        body,
        metric: `${avg.toFixed(1)}/5`,
        ...(actionText ? { action: actionText } : {}),
      }],
    })
  },
})
