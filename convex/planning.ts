import { query, action, internalQuery, internalMutation } from "./_generated/server"
import type { QueryCtx } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"
import { makeResponseToken, renderConvocationEmail } from "./extras"
import type { Id } from "./_generated/dataModel"

// Une ligne de planning = une convocation enrichie du contact extra (firstName /
// lastName / skills). Lecture seule, owner/manager. Le détail UI est en partie 2 ;
// partie 1 alimente surtout les cartes de résumé + la structure du tableau.
type PlanningRow = {
  convocationId: Id<"extraConvocations">
  extraId: Id<"extras">
  firstName: string
  lastName: string
  skills: string[]
  shiftDate: string
  shiftStart: string
  shiftEnd: string
  response: "pending" | "accepted" | "declined" | null
  respondedAt: number | null
  sentAt: number
  subject: string
}

// Convocations d'un restaurant dont shiftDate ∈ [dateFrom, dateTo]. La comparaison
// lexicographique sur "YYYY-MM-DD" équivaut à l'ordre chronologique. Jointure extras
// pour nom + skills. Tri shiftDate ASC puis sentAt ASC. Les convocations sans
// shiftDate sont ignorées (pas de place dans un planning daté).
async function collectRows(
  ctx: QueryCtx,
  restaurantId: Id<"restaurants">,
  dateFrom: string,
  dateTo: string,
): Promise<PlanningRow[]> {
  const convocations = await ctx.db
    .query("extraConvocations")
    .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
    .collect()
  const inRange = convocations.filter(
    c => c.shiftDate && c.shiftDate >= dateFrom && c.shiftDate <= dateTo,
  )
  const rows = await Promise.all(
    inRange.map(async c => {
      const extra = await ctx.db.get(c.extraId)
      return {
        convocationId: c._id,
        extraId: c.extraId,
        firstName: extra?.firstName ?? "",
        lastName: extra?.lastName ?? "",
        skills: extra?.skills ?? [],
        shiftDate: c.shiftDate ?? "",
        shiftStart: c.shiftStart ?? "",
        shiftEnd: c.shiftEnd ?? "",
        response: c.response ?? null,
        respondedAt: c.respondedAt ?? null,
        sentAt: c.sentAt,
        subject: c.subject,
      }
    }),
  )
  rows.sort((a, b) => a.shiftDate.localeCompare(b.shiftDate) || a.sentAt - b.sentAt)
  return rows
}

// "YYYY-MM-DD" à J+offset (UTC — suffisant pour une fenêtre « à venir » de 30 jours).
function isoAtOffset(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)
}

export const getByPeriod = query({
  args: {
    restaurantId: v.id("restaurants"),
    dateFrom: v.string(),
    dateTo: v.string(),
  },
  handler: async (ctx, { restaurantId, dateFrom, dateTo }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    return await collectRows(ctx, restaurantId, dateFrom, dateTo)
  },
})

// Vue par défaut à l'ouverture de la page : J+0 → J+30 (aucun paramètre de date).
export const getUpcoming = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    return await collectRows(ctx, restaurantId, isoAtOffset(0), isoAtOffset(30))
  },
})

// ─── Relance d'une convocation ──────────────────────────────────────────────────
// resend (action — fetch Resend) régénère le token de réponse (le nouveau lien
// invalide l'ancien : l'ancien token ne pointe plus sur la convocation), renvoie le
// même email puis met à jour sentAt. Authz owner/manager via getResendContext.

// Authz + données pour resend (l'action n'a pas ctx.db). null si introuvable ou
// si l'appelant n'est pas owner/manager du restaurant de la convocation.
export const getResendContext = internalQuery({
  args: { convocationId: v.id("extraConvocations"), clerkUserId: v.string() },
  handler: async (ctx, { convocationId, clerkUserId }) => {
    const convocation = await ctx.db.get(convocationId)
    if (!convocation) return null
    const restaurant = await ctx.db.get(convocation.restaurantId)
    if (!restaurant) return null
    const members = await ctx.db
      .query("members")
      .withIndex("by_restaurant", q => q.eq("restaurantId", convocation.restaurantId))
      .collect()
    const me = members.find(m => m.clerkUserId === clerkUserId && m.status === "active")
    const isOwner = restaurant.clerkUserId === clerkUserId
    if (!isOwner && me?.role !== "owner" && me?.role !== "manager") return null
    const extra = await ctx.db.get(convocation.extraId)
    if (!extra) return null
    return {
      email: extra.email,
      firstName: extra.firstName,
      restaurantName: restaurant.name,
      address: restaurant.address,
      restaurantEmail: restaurant.email,
      subject: convocation.subject,
      message: convocation.message,
      shiftDate: convocation.shiftDate,
      shiftStart: convocation.shiftStart,
      shiftEnd: convocation.shiftEnd,
    }
  },
})

// Applique la relance : nouveau token (invalide l'ancien), sentAt rafraîchi, réponse
// remise à "pending" (re-sollicitation). Appelé seulement si l'envoi a réussi.
export const applyResend = internalMutation({
  args: { convocationId: v.id("extraConvocations"), responseToken: v.string(), sentAt: v.number() },
  handler: async (ctx, { convocationId, responseToken, sentAt }) => {
    await ctx.db.patch(convocationId, {
      responseToken,
      sentAt,
      response: "pending",
      respondedAt: undefined,
    })
  },
})

export const resend = action({
  args: { convocationId: v.id("extraConvocations") },
  handler: async (ctx, { convocationId }): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Non authentifié")
    const c = await ctx.runQuery(internal.planning.getResendContext, {
      convocationId,
      clerkUserId: identity.subject,
    })
    if (!c) throw new Error("Accès refusé")

    // Nouveau token : le lien régénéré remplace l'ancien dans extraConvocations,
    // donc l'ancien lien ne retrouve plus la convocation (by_token) → invalidé.
    const responseToken = makeResponseToken()
    const responseBase = "https://www.splitzy.fr/api/extra-response"
    const yesUrl = `${responseBase}?token=${encodeURIComponent(responseToken)}&answer=yes`
    const noUrl = `${responseBase}?token=${encodeURIComponent(responseToken)}&answer=no`
    const html = renderConvocationEmail({
      firstName: c.firstName,
      restaurantName: c.restaurantName,
      address: c.address,
      shiftDate: c.shiftDate,
      shiftStart: c.shiftStart,
      shiftEnd: c.shiftEnd,
      message: c.message,
      yesUrl,
      noUrl,
    })

    const replyTo = identity.email?.trim() || c.restaurantEmail?.trim() || ""
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      const error = "Envoi indisponible (RESEND_API_KEY absente côté Convex)"
      console.error("[planning.resend] " + error)
      return { success: false, error }
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Splitzy <noreply@splitzy.fr>",
          to: c.email,
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: c.subject,
          html,
        }),
      })
      if (!res.ok) {
        console.error("[planning.resend] Resend error:", res.status, await res.text())
        return { success: false, error: `Erreur d'envoi (Resend ${res.status})` }
      }
    } catch (err) {
      console.error("[planning.resend] send threw:", err)
      return { success: false, error: "Échec réseau lors de l'envoi" }
    }

    // Envoi OK → on grave le nouveau token + sentAt (sinon on garde l'ancien lien).
    await ctx.runMutation(internal.planning.applyResend, {
      convocationId,
      responseToken,
      sentAt: Date.now(),
    })
    return { success: true }
  },
})
