import { mutation, internalQuery, internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"

// Leads du calculateur de rentabilité (/rentabilite — GOAL_WEB_07).
//
// RÈGLE ABSOLUE (voir GOAL_WEB_07) : le calcul est une ESTIMATION basée sur un
// coût matière de référence générique — jamais présenté comme une analyse des
// vraies données du restaurant, jamais adossé à une fausse étude.
//
// L'écart est recalculé CÔTÉ SERVEUR ici : la valeur affichée en teaser par le
// front (même barème, constantes miroir dans CalculateurRentabilite.tsx) n'est
// jamais celle qu'on persiste.

// Coût matière de référence utilisé pour l'écart. Ordre de grandeur courant en
// restauration — hypothèse de travail assumée, PAS une statistique sourcée.
export const REFERENCE_FOOD_COST_PERCENT = 29

// Tranches de CA mensuel proposées à l'écran 1. Le point médian sert de base
// de calcul (la borne ouverte utilise une valeur conservatrice).
const REVENUE_RANGES: Record<string, { label: string; midpointEuros: number }> = {
  "lt15k":   { label: "Moins de 15 000 €",   midpointEuros: 10_000 },
  "15k-30k": { label: "15 000 – 30 000 €",   midpointEuros: 22_500 },
  "30k-50k": { label: "30 000 – 50 000 €",   midpointEuros: 40_000 },
  "50k-80k": { label: "50 000 – 80 000 €",   midpointEuros: 65_000 },
  "gt80k":   { label: "Plus de 80 000 €",    midpointEuros: 100_000 },
}

const RESTAURANT_TYPES: Record<string, string> = {
  traditionnel:  "Restaurant traditionnel",
  brasserie:     "Brasserie / Bistrot",
  fast_food:     "Fast-food / Snack",
  gastronomique: "Gastronomique",
  bar_cafe:      "Bar / Café",
  autre:         "Autre",
}

const NOTIFY_EMAIL = "splitzy.contact@gmail.com"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

// Rate limit inline (table rateLimits, même sémantique que
// rateLimits.checkAndIncrement — qu'une mutation ne peut pas appeler via
// ctx.runMutation, donc dupliqué ici sur ctx.db).
async function checkRateLimit(
  ctx: { db: any },
  key: string,
  limit: number,
  windowMs: number,
  message: string,
) {
  const now = Date.now()
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique()
  if (!existing) {
    await ctx.db.insert("rateLimits", { key, count: 1, windowStart: now })
    return
  }
  if (now - existing.windowStart > windowMs) {
    await ctx.db.patch(existing._id, { count: 1, windowStart: now })
    return
  }
  if (existing.count >= limit) throw new Error(message)
  await ctx.db.patch(existing._id, { count: existing.count + 1 })
}

// submitLead — mutation PUBLIQUE (appelée sans auth depuis /rentabilite via
// httpMutation). Valide les entrées contre les barèmes serveur, calcule l'écart,
// insère le lead puis planifie l'email de notification interne (Resend).
export const submitLead = mutation({
  args: {
    email: v.string(),
    restaurantType: v.string(),
    monthlyRevenueRange: v.string(),
    foodCostPercent: v.number(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email) || email.length > 200) {
      throw new Error("Email invalide")
    }
    const range = REVENUE_RANGES[args.monthlyRevenueRange]
    if (!range) throw new Error("Tranche de CA inconnue")
    if (!RESTAURANT_TYPES[args.restaurantType]) {
      throw new Error("Type d'établissement inconnu")
    }
    if (
      !Number.isFinite(args.foodCostPercent) ||
      args.foodCostPercent < 5 ||
      args.foodCostPercent > 70
    ) {
      throw new Error("Coût matière hors bornes")
    }

    // Anti-spam : la mutation est publique et déclenche un email interne.
    await checkRateLimit(ctx, "leads:submitLead", 20, 3_600_000,
      "Trop de demandes en ce moment. Réessayez dans quelques minutes.")
    await checkRateLimit(ctx, `leads:email:${email}`, 3, 86_400_000,
      "Une estimation a déjà été envoyée pour cet email aujourd'hui.")

    // Écart mensuel estimé vs coût matière de référence (peut être négatif si
    // le déclaratif est meilleur que la référence — on le stocke tel quel).
    const computedGapEuros = Math.round(
      (range.midpointEuros * (args.foodCostPercent - REFERENCE_FOOD_COST_PERCENT)) / 100,
    )

    const leadId = await ctx.db.insert("leads", {
      email,
      restaurantType: args.restaurantType,
      monthlyRevenueRange: args.monthlyRevenueRange,
      foodCostPercent: args.foodCostPercent,
      computedGapEuros,
      source: "calculateur_rentabilite",
      createdAt: Date.now(),
    })

    await ctx.scheduler.runAfter(0, internal.leads.notifyNewLead, { leadId })

    return { gapEuros: computedGapEuros, referencePercent: REFERENCE_FOOD_COST_PERCENT }
  },
})

export const getById = internalQuery({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => ctx.db.get(leadId),
})

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

const eur = (n: number) => `${Math.abs(n).toLocaleString("fr-FR")} €`

// notifyNewLead — email interne de notification à l'équipe Splitzy. Échec
// d'envoi non bloquant : le lead est déjà persisté, on logge seulement.
export const notifyNewLead = internalAction({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const lead = await ctx.runQuery(internal.leads.getById, { leadId })
    if (!lead) return
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("[Leads] RESEND_API_KEY not set — notification non envoyée")
      return
    }

    const typeLabel = RESTAURANT_TYPES[lead.restaurantType] ?? lead.restaurantType
    const rangeLabel = REVENUE_RANGES[lead.monthlyRevenueRange]?.label ?? lead.monthlyRevenueRange
    const gapLine = lead.computedGapEuros > 0
      ? `${eur(lead.computedGapEuros)}/mois au-dessus de la référence ${REFERENCE_FOOD_COST_PERCENT}%`
      : `au niveau ou sous la référence ${REFERENCE_FOOD_COST_PERCENT}% (${eur(lead.computedGapEuros)}/mois d'avance)`

    const row = (k: string, val: string) =>
      `<tr><td style="padding:6px 16px 6px 0;color:#9CA3AF;font-size:13px;white-space:nowrap">${k}</td>
       <td style="padding:6px 0;color:#18181B;font-size:14px;font-weight:600">${val}</td></tr>`

    const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#0A0A0A;border-radius:12px 12px 0 0;padding:18px 24px">
      <span style="color:#fff;font-size:16px;font-weight:800">Splitzy</span>
      <span style="color:#E8920A;font-size:13px;font-weight:600;float:right">Nouveau lead — calculateur rentabilité</span>
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;padding:20px 24px">
      <table style="border-collapse:collapse">
        ${row("Email", esc(lead.email))}
        ${row("Établissement", esc(typeLabel))}
        ${row("CA mensuel", esc(rangeLabel))}
        ${row("Coût matière déclaré", `${lead.foodCostPercent}%`)}
        ${row("Écart estimé", esc(gapLine))}
      </table>
      <p style="margin:16px 0 0;color:#9CA3AF;font-size:12px">
        Estimation sectorielle générique (déclaratif du visiteur) — pas une analyse de ses données réelles.
      </p>
    </div>
  </div>`

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Splitzy <noreply@splitzy.fr>",
          to: NOTIFY_EMAIL,
          subject: `Nouveau lead rentabilité — ${lead.email}`,
          html,
        }),
      })
      if (!res.ok) console.error("[Leads] Resend error:", res.status, await res.text())
    } catch (err) {
      console.error("[Leads] notification send threw:", err)
    }
  },
})
