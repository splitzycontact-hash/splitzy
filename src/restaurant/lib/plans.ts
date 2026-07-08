// Paliers de facturation du dashboard restaurant (GOAL_BILLING_ESSENTIEL).
//
// `restaurants.plan` ∈ {free, essentiel, pro} — assigné UNIQUEMENT via la CLI
// (`restaurants.setPlanForTesting`, internalMutation) tant que Market Pay n'est
// pas intégré : aucun self-service, aucun tunnel de paiement. Le gating ci-dessous
// est UI-only, aligné sur la page Pricing du site (PricingPreview.tsx) :
//   Gratuit   → dashboard basique (vue d'ensemble) — pas d'analytics avancés.
//   Essentiel → tout le pilotage (salle, planning, chat, clôture, analytics, alertes).
//   Pro       → + Insights IA (seule gate backend réelle : convex/insights.ts).
//
// Un plan absent = "free" (décision fondateur, GOAL_BILLING_ESSENTIEL_FIX_RESIDUELS) :
// tout compte sans plan explicite se comporte comme Gratuit, partout. Les paliers
// payants ne s'obtiennent que par assignation explicite (setPlanForTesting).

export type RestaurantPlan = 'free' | 'essentiel' | 'pro'

export function normalizePlan(plan?: string | null): RestaurantPlan {
  const p = plan?.toLowerCase()
  if (p === 'pro') return 'pro'
  if (p === 'essentiel') return 'essentiel'
  return 'free'
}

export const PLAN_LABEL: Record<RestaurantPlan, string> = {
  free: 'Plan Gratuit',
  essentiel: 'Plan Essentiel',
  pro: 'Plan Pro',
}

export const PLAN_PRICE_LABEL: Record<RestaurantPlan, string> = {
  free: '0€',
  essentiel: '59€',
  pro: '99€',
}

// Fonctionnalités débloquées par palier (source de vérité : page Pricing du site).
export function planFeatures(plan: RestaurantPlan) {
  return {
    // Analytics avancés (page /restaurant/analytics) — Essentiel et Pro.
    advancedAnalytics: plan !== 'free',
    // Insights IA (Analytics + Overview) — Pro uniquement.
    insightsIA: plan === 'pro',
    // Intégrations POS (page /restaurant/integrations) — Pro uniquement.
    posIntegrations: plan === 'pro',
    // CRM Clients (page /restaurant/clients) — Pro uniquement.
    crmClients: plan === 'pro',
  }
}
