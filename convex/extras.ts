import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { requireRestaurantAccess } from "./authz"
import type { Id } from "./_generated/dataModel"

// Résout la ligne `members` de l'appelant pour ce restaurant (createdBy).
// Le propriétaire (restaurants.clerkUserId) n'a pas de ligne `members` → undefined.
async function currentMemberId(
  ctx: any,
  restaurantId: Id<"restaurants">,
): Promise<Id<"members"> | undefined> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return undefined
  const members = await ctx.db
    .query("members")
    .withIndex("by_restaurant", (q: any) => q.eq("restaurantId", restaurantId))
    .collect()
  return members.find((m: any) => m.clerkUserId === identity.subject)?._id
}

// Liste les extras actifs d'un restaurant, enrichis de la date de leur dernière
// convocation (affichée sur la carte). owner/manager uniquement.
export const list = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId, ["owner", "manager"])
    const extras = await ctx.db
      .query("extras")
      .withIndex("by_restaurant_active", q =>
        q.eq("restaurantId", restaurantId).eq("isActive", true),
      )
      .collect()
    const enriched = await Promise.all(
      extras.map(async extra => {
        const last = await ctx.db
          .query("extraConvocations")
          .withIndex("by_extra", q => q.eq("extraId", extra._id))
          .order("desc")
          .first()
        return { ...extra, lastConvokedAt: last?.sentAt ?? null }
      }),
    )
    enriched.sort((a, b) => a.firstName.localeCompare(b.firstName, "fr"))
    return enriched
  },
})

export const add = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    skills: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRestaurantAccess(ctx, args.restaurantId, ["owner", "manager"])
    const createdBy = await currentMemberId(ctx, args.restaurantId)
    return await ctx.db.insert("extras", {
      restaurantId: args.restaurantId,
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      email: args.email.trim(),
      phone: args.phone?.trim() || undefined,
      skills: args.skills,
      notes: args.notes?.trim() || undefined,
      isActive: true,
      createdAt: Date.now(),
      ...(createdBy ? { createdBy } : {}),
    })
  },
})

export const update = mutation({
  args: {
    extraId: v.id("extras"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { extraId, ...fields }) => {
    const extra = await ctx.db.get(extraId)
    if (!extra) throw new Error("Extra introuvable")
    await requireRestaurantAccess(ctx, extra.restaurantId, ["owner", "manager"])
    const patch: Record<string, unknown> = {}
    if (fields.firstName !== undefined) patch.firstName = fields.firstName.trim()
    if (fields.lastName !== undefined) patch.lastName = fields.lastName.trim()
    if (fields.email !== undefined) patch.email = fields.email.trim()
    // `undefined` supprime le champ optionnel côté Convex (téléphone/notes vidés).
    if (fields.phone !== undefined) patch.phone = fields.phone.trim() || undefined
    if (fields.skills !== undefined) patch.skills = fields.skills
    if (fields.notes !== undefined) patch.notes = fields.notes.trim() || undefined
    await ctx.db.patch(extraId, patch)
  },
})

// Archivage doux : on ne supprime jamais un extra (préserve son historique de
// convocations), on le retire seulement de la liste active.
export const archive = mutation({
  args: { extraId: v.id("extras") },
  handler: async (ctx, { extraId }) => {
    const extra = await ctx.db.get(extraId)
    if (!extra) throw new Error("Extra introuvable")
    await requireRestaurantAccess(ctx, extra.restaurantId, ["owner", "manager"])
    await ctx.db.patch(extraId, { isActive: false })
  },
})

// ─── Convocation par email (Resend) ─────────────────────────────────────────────
// Même pattern que invitations.create : action `fetch` (runtime Convex par défaut,
// PAS de "use node" → aucune dépendance npm) + internalQuery pour l'authz (l'action
// n'a pas ctx.db) + internalMutation pour écrire l'historique. L'envoi ne fait
// jamais planter : succès comme échec, on enregistre un doc extraConvocations.

// Token de réponse opaque pour l'endpoint public : UUID aléatoire + timestamp,
// encodé base64 url-safe (aucun caractère à échapper dans l'URL). Non devinable.
function makeResponseToken(): string {
  const raw = `${crypto.randomUUID()}:${Date.now()}`
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// "2026-06-21" → "21/06/2026" (sans dépendre de l'ICU/locale du runtime Convex).
function frDate(iso?: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  return y && m && d ? `${d}/${m}/${y}` : iso
}

function renderConvocationEmail(opts: {
  firstName: string
  restaurantName: string
  address?: string
  shiftDate?: string
  shiftStart?: string
  shiftEnd?: string
  message: string
  yesUrl: string
  noUrl: string
}): string {
  const firstName = escapeHtml(opts.firstName)
  const restaurantName = escapeHtml(opts.restaurantName)
  const message = escapeHtml(opts.message).replace(/\n/g, "<br/>")
  const dateLabel = frDate(opts.shiftDate)
  const timeLabel = opts.shiftStart
    ? `${opts.shiftStart}${opts.shiftEnd ? " – " + opts.shiftEnd : ""}`
    : ""

  const detail = (emoji: string, label: string, value: string) =>
    value
      ? `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 6px">${emoji} <strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</p>`
      : ""

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:8px">
  <h2 style="color:#E8920A;margin:0 0 16px">Splitzy</h2>
  <p style="color:#18181B;font-size:15px;line-height:1.6;margin:0 0 6px">Bonjour ${firstName},</p>
  <p style="color:#18181B;font-size:15px;line-height:1.6;margin:0 0 16px"><strong>${restaurantName}</strong> fait appel à vous.</p>
  ${detail("📅", "Date", dateLabel)}
  ${detail("⏰", "Horaire", timeLabel)}
  ${detail("📍", "Lieu", opts.address ?? "")}
  <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:14px 16px;margin:16px 0">
    <p style="color:#9CA3AF;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin:0 0 6px">Message du manager</p>
    <p style="color:#18181B;font-size:14px;line-height:1.6;margin:0">${message}</p>
  </div>
  <div style="margin:20px 0">
    <a href="${opts.yesUrl}" style="display:inline-block;background:#E8920A;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin:0 8px 8px 0">Je suis disponible ✓</a>
    <a href="${opts.noUrl}" style="display:inline-block;background:#F3F4F6;color:#374151;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin:0 0 8px 0">Je ne suis pas disponible ✗</a>
  </div>
  <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:8px 0 0">Cet email vous a été envoyé par Splitzy pour le compte de ${restaurantName}.</p>
</div>`
}

// Authz + données pour l'action convoke (l'action n'a pas ctx.db). Renvoie null
// si l'extra/restaurant est introuvable ou si le caller n'est pas owner/manager.
export const getConvokeContext = internalQuery({
  args: { extraId: v.id("extras"), clerkUserId: v.string() },
  handler: async (ctx, { extraId, clerkUserId }) => {
    const extra = await ctx.db.get(extraId)
    if (!extra) return null
    const restaurant = await ctx.db.get(extra.restaurantId)
    if (!restaurant) return null
    const members = await ctx.db
      .query("members")
      .withIndex("by_restaurant", q => q.eq("restaurantId", extra.restaurantId))
      .collect()
    const me = members.find(m => m.clerkUserId === clerkUserId && m.status === "active")
    const isOwner = restaurant.clerkUserId === clerkUserId
    if (!isOwner && me?.role !== "owner" && me?.role !== "manager") return null
    return {
      restaurantId: extra.restaurantId,
      email: extra.email,
      firstName: extra.firstName,
      restaurantName: restaurant.name,
      address: restaurant.address,
      restaurantEmail: restaurant.email,
      sentBy: me?._id,
    }
  },
})

export const recordConvocation = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    extraId: v.id("extras"),
    sentBy: v.optional(v.id("members")),
    subject: v.string(),
    message: v.string(),
    shiftDate: v.optional(v.string()),
    shiftStart: v.optional(v.string()),
    shiftEnd: v.optional(v.string()),
    sentAt: v.number(),
    emailStatus: v.union(v.literal("sent"), v.literal("failed")),
    responseToken: v.optional(v.string()),
    response: v.optional(
      v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("extraConvocations", args)
  },
})

// convoke — envoie l'email de convocation à l'extra et enregistre l'historique.
// owner/manager uniquement (vérifié via getConvokeContext). managerEmail (email
// de l'expéditeur, pour les liens de réponse mailto + reply_to) : on prend l'arg
// front en priorité, puis le claim email du JWT, puis l'email du restaurant.
export const convoke = action({
  args: {
    extraId: v.id("extras"),
    subject: v.string(),
    message: v.string(),
    shiftDate: v.optional(v.string()),
    shiftStart: v.optional(v.string()),
    shiftEnd: v.optional(v.string()),
    managerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Non authentifié")
    const context = await ctx.runQuery(internal.extras.getConvokeContext, {
      extraId: args.extraId,
      clerkUserId: identity.subject,
    })
    if (!context) throw new Error("Accès refusé")

    const managerEmail =
      args.managerEmail?.trim() ||
      identity.email?.trim() ||
      context.restaurantEmail?.trim() ||
      ""

    // Token de réponse : secret d'URL non devinable. L'extra répond via l'endpoint
    // public /api/extra-response (cf. http.ts) sans aucune authentification.
    const responseToken = makeResponseToken()
    const responseBase = "https://www.splitzy.fr/api/extra-response"
    const yesUrl = `${responseBase}?token=${encodeURIComponent(responseToken)}&answer=yes`
    const noUrl = `${responseBase}?token=${encodeURIComponent(responseToken)}&answer=no`

    const html = renderConvocationEmail({
      firstName: context.firstName,
      restaurantName: context.restaurantName,
      address: context.address,
      shiftDate: args.shiftDate,
      shiftStart: args.shiftStart,
      shiftEnd: args.shiftEnd,
      message: args.message,
      yesUrl,
      noUrl,
    })

    let emailStatus: "sent" | "failed" = "failed"
    let error: string | undefined
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      error = "Envoi indisponible (RESEND_API_KEY absente côté Convex)"
      console.error("[Extras.convoke] " + error)
    } else {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Splitzy <noreply@splitzy.fr>",
            to: context.email,
            ...(managerEmail ? { reply_to: managerEmail } : {}),
            subject: args.subject,
            html,
          }),
        })
        if (res.ok) {
          emailStatus = "sent"
        } else {
          error = `Erreur d'envoi (Resend ${res.status})`
          console.error("[Extras.convoke] Resend error:", res.status, await res.text())
        }
      } catch (err) {
        error = "Échec réseau lors de l'envoi"
        console.error("[Extras.convoke] send threw:", err)
      }
    }

    // Historique écrit dans tous les cas (succès comme échec).
    await ctx.runMutation(internal.extras.recordConvocation, {
      restaurantId: context.restaurantId,
      extraId: args.extraId,
      sentBy: context.sentBy,
      subject: args.subject,
      message: args.message,
      shiftDate: args.shiftDate,
      shiftStart: args.shiftStart,
      shiftEnd: args.shiftEnd,
      sentAt: Date.now(),
      emailStatus,
      responseToken,
      response: "pending",
    })

    return emailStatus === "sent" ? { success: true } : { success: false, error }
  },
})

// ─── Réponse de l'extra (endpoint public /api/extra-response) ───────────────────
// recordResponse : appelée par l'HTTP action après lecture du token. Atomique —
// trouve la convocation par token, refuse si déjà répondue (1ʳᵉ réponse = définitive),
// sinon fige response + respondedAt puis déclenche la notification (corps = partie 2).
export const recordResponse = internalMutation({
  args: {
    token: v.string(),
    answer: v.union(v.literal("yes"), v.literal("no")),
  },
  handler: async (ctx, { token, answer }): Promise<{ ok: boolean }> => {
    const convocation = await ctx.db
      .query("extraConvocations")
      .withIndex("by_token", q => q.eq("responseToken", token))
      .unique()
    if (!convocation) return { ok: false }
    // Token à usage unique : une réponse déjà figée est définitive.
    if (convocation.response === "accepted" || convocation.response === "declined") {
      return { ok: false }
    }
    await ctx.db.patch(convocation._id, {
      response: answer === "yes" ? "accepted" : "declined",
      respondedAt: Date.now(),
    })
    // Notifie le restaurant de la réponse — corps implémenté en partie 2.
    await ctx.scheduler.runAfter(0, internal.extras.notifyConvocationResponse, {
      convocationId: convocation._id,
    })
    return { ok: true }
  },
})

// notifyConvocationResponse — notifie le gérant qu'un extra a répondu à sa convocation.
// Stub partie 1 : le corps (email/notification dashboard) est implémenté en partie 2.
export const notifyConvocationResponse = internalMutation({
  args: { convocationId: v.id("extraConvocations") },
  handler: async () => {
    // TODO(partie 2) : notifier le restaurant de la réponse de l'extra.
  },
})
