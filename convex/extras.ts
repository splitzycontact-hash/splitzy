import { query, mutation, action, internalQuery, internalMutation, internalAction } from "./_generated/server"
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

// ─── Pool de confiance — notation d'un extra après un service ────────────────────
// addRating : le manager note un extra (1..5 ★ + commentaire optionnel) sur une
// convocation passée. Une note par convocation (re-noter remplace l'ancienne). La
// convocation doit appartenir à l'extra. owner/manager uniquement.
export const addRating = mutation({
  args: {
    extraId: v.id("extras"),
    convocationId: v.id("extraConvocations"),
    stars: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, { extraId, convocationId, stars, comment }) => {
    const extra = await ctx.db.get(extraId)
    if (!extra) throw new Error("Extra introuvable")
    await requireRestaurantAccess(ctx, extra.restaurantId, ["owner", "manager"])
    const convocation = await ctx.db.get(convocationId)
    if (!convocation || convocation.extraId !== extraId) {
      throw new Error("Convocation invalide")
    }
    const s = Math.max(1, Math.min(5, Math.round(stars)))
    const ratedBy = await currentMemberId(ctx, extra.restaurantId)
    const existing = extra.ratings ?? []
    // Une note par convocation : on remplace si déjà notée.
    const next = existing.filter(r => r.convocationId !== convocationId)
    next.push({
      convocationId,
      stars: s,
      comment: comment?.trim() || undefined,
      ratedAt: Date.now(),
      ...(ratedBy ? { ratedBy } : {}),
    })
    await ctx.db.patch(extraId, { ratings: next })
  },
})

// ─── Convocation par email (Resend) ─────────────────────────────────────────────
// Même pattern que invitations.create : action `fetch` (runtime Convex par défaut,
// PAS de "use node" → aucune dépendance npm) + internalQuery pour l'authz (l'action
// n'a pas ctx.db) + internalMutation pour écrire l'historique. L'envoi ne fait
// jamais planter : succès comme échec, on enregistre un doc extraConvocations.

// Token de réponse opaque pour l'endpoint public : UUID aléatoire + timestamp,
// encodé base64 url-safe (aucun caractère à échapper dans l'URL). Non devinable.
export function makeResponseToken(): string {
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

export function renderConvocationEmail(opts: {
  firstName: string
  restaurantName: string
  address?: string
  shiftDate?: string
  shiftStart?: string
  shiftEnd?: string
  message: string
  yesUrl: string
  noUrl: string
  counterUrl?: string
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
  ${opts.counterUrl ? `<p style="text-align:center;margin-top:16px">
    <a href="${opts.counterUrl}" style="color:#6B7280;font-size:14px;text-decoration:underline">
      🔄 Proposer un autre horaire
    </a>
  </p>` : ""}
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
    // Lien de contre-proposition → endpoint public Convex (formulaire HTML).
    const siteUrl = process.env.CONVEX_SITE_URL ?? ""
    const counterUrl = siteUrl
      ? `${siteUrl}/api/extra-counter-form?token=${encodeURIComponent(responseToken)}`
      : undefined

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
      counterUrl,
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

// getConvocationByToken — lecture publique (via HTTP action) des infos minimales
// pour la page de confirmation : prénom de l'extra, date/horaire du service, et si
// la convocation a déjà reçu une réponse. Aucune donnée sensible exposée.
export const getConvocationByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const convocation = await ctx.db
      .query("extraConvocations")
      .withIndex("by_token", q => q.eq("responseToken", token))
      .unique()
    if (!convocation) return null
    const extra = await ctx.db.get(convocation.extraId)
    return {
      firstName: extra?.firstName ?? "",
      dateLabel: frDate(convocation.shiftDate),
      shiftStart: convocation.shiftStart ?? "",
      shiftEnd: convocation.shiftEnd ?? "",
      alreadyResponded:
        convocation.response === "accepted" || convocation.response === "declined",
    }
  },
})

// getResponseNotifyContext — données de l'email de notification au gérant. Cible =
// email du membre qui a convoqué (sentBy), sinon email du restaurant.
export const getResponseNotifyContext = internalQuery({
  args: { convocationId: v.id("extraConvocations") },
  handler: async (ctx, { convocationId }) => {
    const convocation = await ctx.db.get(convocationId)
    if (!convocation) return null
    const extra = await ctx.db.get(convocation.extraId)
    const restaurant = await ctx.db.get(convocation.restaurantId)
    let memberEmail: string | undefined
    if (convocation.sentBy) {
      const member = await ctx.db.get(convocation.sentBy)
      memberEmail = member?.email
    }
    return {
      notifyEmail: memberEmail?.trim() || restaurant?.email?.trim() || "",
      restaurantName: restaurant?.name ?? "",
      extraFirstName: extra?.firstName ?? "",
      extraLastName: extra?.lastName ?? "",
      response: convocation.response ?? null,
      subject: convocation.subject,
      dateLabel: frDate(convocation.shiftDate),
      shiftStart: convocation.shiftStart ?? "",
      shiftEnd: convocation.shiftEnd ?? "",
    }
  },
})

function renderResponseNotificationEmail(opts: {
  extraName: string
  accepted: boolean
  restaurantName: string
  dateLabel: string
  timeLabel: string
}): string {
  const extraName = escapeHtml(opts.extraName || "Un extra")
  const restaurantName = escapeHtml(opts.restaurantName)
  const verdict = opts.accepted ? "est disponible ✓" : "n'est pas disponible ✗"
  const color = opts.accepted ? "#10B981" : "#EF4444"
  const detail = (emoji: string, label: string, value: string) =>
    value
      ? `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 6px">${emoji} <strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</p>`
      : ""
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:8px">
  <h2 style="color:#E8920A;margin:0 0 16px">Splitzy</h2>
  <p style="color:#18181B;font-size:15px;line-height:1.6;margin:0 0 6px">Réponse à votre convocation${restaurantName ? " — " + restaurantName : ""}</p>
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-left:4px solid ${color};border-radius:8px;padding:14px 16px;margin:16px 0">
    <p style="color:#18181B;font-size:16px;font-weight:700;margin:0">${extraName} ${verdict}</p>
  </div>
  ${detail("📅", "Date", opts.dateLabel)}
  ${detail("⏰", "Horaire", opts.timeLabel)}
  <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:16px 0 0">Notification automatique envoyée par Splitzy suite à la réponse de votre extra.</p>
</div>`
}

// notifyConvocationResponse — email au gérant dès qu'un extra répond. internalAction
// (et non mutation) car l'envoi Resend nécessite un fetch réseau, interdit dans une
// mutation. Best-effort : ne fait jamais planter le flux de réponse, log seulement.
export const notifyConvocationResponse = internalAction({
  args: { convocationId: v.id("extraConvocations") },
  handler: async (ctx, { convocationId }) => {
    const c = await ctx.runQuery(internal.extras.getResponseNotifyContext, { convocationId })
    if (!c) return
    if (c.response !== "accepted" && c.response !== "declined") return
    if (!c.notifyEmail) {
      console.error("[notifyConvocationResponse] aucune adresse de notification")
      return
    }
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("[notifyConvocationResponse] RESEND_API_KEY absente côté Convex")
      return
    }
    const accepted = c.response === "accepted"
    const extraName = `${c.extraFirstName} ${c.extraLastName}`.trim()
    const timeLabel = c.shiftStart ? `${c.shiftStart}${c.shiftEnd ? " – " + c.shiftEnd : ""}` : ""
    const subject = `${extraName || "Un extra"} ${accepted ? "est disponible" : "n'est pas disponible"} — ${c.subject}`
    const html = renderResponseNotificationEmail({
      extraName,
      accepted,
      restaurantName: c.restaurantName,
      dateLabel: c.dateLabel,
      timeLabel,
    })
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Splitzy <noreply@splitzy.fr>",
          to: c.notifyEmail,
          subject,
          html,
        }),
      })
      if (!res.ok) {
        console.error("[notifyConvocationResponse] Resend error:", res.status, await res.text())
      }
    } catch (err) {
      console.error("[notifyConvocationResponse] send threw:", err)
    }
  },
})

// ─── Contre-proposition d'horaire par l'extra ───────────────────────────────────
// L'extra, plutôt que d'accepter/décliner, propose un autre créneau via la page de
// réponse publique. recordCounterProposal fige la contre-proposition et notifie le
// gérant par email avec deux liens de décision (accept/decline) portés par un second
// token (managerResponseToken). Le gérant peut aussi décider depuis le dashboard
// (acceptCounter / declineCounter, authentifiées).

// Token de décision du gérant : même schéma que makeResponseToken (UUID + timestamp
// encodé base64). Le goal le décrit comme btoa(crypto.randomUUID()+Date.now()) ;
// makeResponseToken applique en plus un encodage url-safe (aucun caractère à échapper).

export const getCounterProposalContext = internalQuery({
  args: { convoId: v.id("extraConvocations") },
  handler: async (ctx, { convoId }) => {
    const convocation = await ctx.db.get(convoId)
    if (!convocation) return null
    const extra = await ctx.db.get(convocation.extraId)
    const restaurant = await ctx.db.get(convocation.restaurantId)
    let memberEmail: string | undefined
    if (convocation.sentBy) {
      const member = await ctx.db.get(convocation.sentBy)
      memberEmail = member?.email
    }
    const managerEmail = memberEmail?.trim() || restaurant?.email?.trim() || ""
    return { convocation, extra, managerEmail }
  },
})

// recordCounterProposal — appelée par l'HTTP action après lecture du responseToken.
// Atomique : refuse si la convocation a déjà reçu une réponse (response !== "pending").
export const recordCounterProposal = internalMutation({
  args: {
    token: v.string(),
    start: v.string(),
    end: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, { token, start, end, message }): Promise<{ ok: boolean }> => {
    const convocation = await ctx.db
      .query("extraConvocations")
      .withIndex("by_token", q => q.eq("responseToken", token))
      .unique()
    if (!convocation) throw new Error("Convocation introuvable")
    if (convocation.response !== "pending") throw new Error("Déjà répondu")
    const managerResponseToken = btoa(crypto.randomUUID() + Date.now().toString())
    await ctx.db.patch(convocation._id, {
      response: "counter_proposed",
      counterProposedStart: start,
      counterProposedEnd: end,
      counterMessage: message?.trim() || undefined,
      managerResponseToken,
      respondedAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.extras.notifyCounterProposal, {
      convoId: convocation._id,
    })
    return { ok: true }
  },
})

function renderCounterProposalEmail(opts: {
  firstName: string
  lastName: string
  shiftDate: string
  shiftStart: string
  shiftEnd: string
  counterStart: string
  counterEnd: string
  counterMessage?: string
  acceptUrl: string
  declineUrl: string
}): string {
  const name = escapeHtml(`${opts.firstName} ${opts.lastName}`.trim())
  const originalTime = opts.shiftStart
    ? `${opts.shiftStart}${opts.shiftEnd ? " – " + opts.shiftEnd : ""}`
    : ""
  const counterTime = `${opts.counterStart} – ${opts.counterEnd}`
  const messageBlock = opts.counterMessage
    ? `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:14px 16px;margin:16px 0">
    <p style="color:#9CA3AF;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin:0 0 6px">Message de l'extra</p>
    <p style="color:#18181B;font-size:14px;line-height:1.6;margin:0">${escapeHtml(opts.counterMessage).replace(/\n/g, "<br/>")}</p>
  </div>`
    : ""
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:8px;background:#ffffff">
  <h2 style="color:#F59E0B;margin:0 0 16px">Splitzy</h2>
  <p style="color:#18181B;font-size:15px;line-height:1.6;margin:0 0 16px">Bonjour, <strong>${name}</strong> propose un autre horaire.</p>
  <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 6px">📅 <strong>${escapeHtml(frDate(opts.shiftDate))}</strong>${originalTime ? `  ⏰ ${escapeHtml(originalTime)}` : ""}</p>
  <div style="background:#FEF3C7;border-radius:8px;padding:14px 16px;margin:16px 0">
    <p style="color:#18181B;font-size:15px;font-weight:700;margin:0">🔄 ${escapeHtml(counterTime)}</p>
  </div>
  ${messageBlock}
  <div style="margin:20px 0">
    <a href="${opts.acceptUrl}" style="display:inline-block;background:#F59E0B;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin:0 8px 8px 0">✓ Accepter ce créneau</a>
    <a href="${opts.declineUrl}" style="display:inline-block;background:#F3F4F6;color:#374151;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;margin:0 0 8px 0">✗ Décliner</a>
  </div>
  <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:8px 0 0">Notification automatique envoyée par Splitzy.</p>
</div>`
}

// notifyCounterProposal — email au gérant avec les deux liens de décision. Les liens
// pointent vers l'endpoint public /api/manager-counter (base = CONVEX_SITE_URL).
export const notifyCounterProposal = internalAction({
  args: { convoId: v.id("extraConvocations") },
  handler: async (ctx, { convoId }) => {
    const ctx2 = await ctx.runQuery(internal.extras.getCounterProposalContext, { convoId })
    if (!ctx2 || !ctx2.convocation || !ctx2.extra) return
    const { convocation, extra, managerEmail } = ctx2
    if (!managerEmail) {
      console.error("[notifyCounterProposal] aucune adresse de notification")
      return
    }
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("[notifyCounterProposal] RESEND_API_KEY absente côté Convex")
      return
    }
    const siteUrl = process.env.CONVEX_SITE_URL ?? ""
    const token = convocation.managerResponseToken ?? ""
    const acceptUrl = `${siteUrl}/api/manager-counter?token=${encodeURIComponent(token)}&action=accept`
    const declineUrl = `${siteUrl}/api/manager-counter?token=${encodeURIComponent(token)}&action=decline`
    const html = renderCounterProposalEmail({
      firstName: extra.firstName,
      lastName: extra.lastName,
      shiftDate: convocation.shiftDate ?? "",
      shiftStart: convocation.shiftStart ?? "",
      shiftEnd: convocation.shiftEnd ?? "",
      counterStart: convocation.counterProposedStart ?? "",
      counterEnd: convocation.counterProposedEnd ?? "",
      counterMessage: convocation.counterMessage,
      acceptUrl,
      declineUrl,
    })
    const subject = `[Splitzy] Contre-proposition de ${`${extra.firstName} ${extra.lastName}`.trim()}`
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Splitzy <noreply@splitzy.fr>",
          to: managerEmail,
          subject,
          html,
        }),
      })
      if (!res.ok) {
        console.error("[notifyCounterProposal] Resend error:", res.status, await res.text())
      }
    } catch (err) {
      console.error("[notifyCounterProposal] send threw:", err)
    }
  },
})

// applyManagerDecision — logique partagée entre recordManagerResponse (endpoint public,
// par token) et acceptCounter/declineCounter (dashboard, authentifié). Idempotente :
// throw si une décision est déjà figée. Applique l'horaire contre-proposé si accept.
async function applyManagerDecision(
  ctx: any,
  convocation: any,
  action: "accept" | "decline",
): Promise<void> {
  if (convocation.managerResponse) throw new Error("Déjà répondu")
  const patch: Record<string, unknown> = {
    managerResponse: action === "accept" ? "accepted" : "declined",
    managerRespondedAt: Date.now(),
  }
  if (action === "accept") {
    patch.response = "accepted"
    if (convocation.counterProposedStart) patch.shiftStart = convocation.counterProposedStart
    if (convocation.counterProposedEnd) patch.shiftEnd = convocation.counterProposedEnd
  } else {
    patch.response = "declined"
  }
  await ctx.db.patch(convocation._id, patch)
  await ctx.scheduler.runAfter(0, internal.extras.notifyManagerDecision, {
    convoId: convocation._id,
    action,
  })
}

// recordManagerResponse — appelée par l'HTTP action /api/manager-counter (par token).
export const recordManagerResponse = internalMutation({
  args: {
    token: v.string(),
    action: v.union(v.literal("accept"), v.literal("decline")),
  },
  handler: async (ctx, { token, action }): Promise<{ ok: boolean }> => {
    const convocation = await ctx.db
      .query("extraConvocations")
      .filter(q => q.eq(q.field("managerResponseToken"), token))
      .unique()
    if (!convocation) throw new Error("Convocation introuvable")
    await applyManagerDecision(ctx, convocation, action)
    return { ok: true }
  },
})

export const getManagerDecisionContext = internalQuery({
  args: { convoId: v.id("extraConvocations") },
  handler: async (ctx, { convoId }) => {
    const convocation = await ctx.db.get(convoId)
    if (!convocation) return null
    const extra = await ctx.db.get(convocation.extraId)
    return {
      email: extra?.email ?? "",
      firstName: extra?.firstName ?? "",
      shiftDate: convocation.shiftDate ?? "",
      shiftStart: convocation.shiftStart ?? "",
      shiftEnd: convocation.shiftEnd ?? "",
    }
  },
})

// getManagerCounterByToken — lecture publique (via HTTP action) de la contre-proposition
// pour la page de décision du gérant (lien email anti-SafeLinks). Infos minimales :
// créneau proposé, prénom de l'extra, date, et si une décision a déjà été figée.
export const getManagerCounterByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const convocation = await ctx.db
      .query("extraConvocations")
      .filter(q => q.eq(q.field("managerResponseToken"), token))
      .unique()
    if (!convocation) return null
    const extra = await ctx.db.get(convocation.extraId)
    return {
      firstName: extra?.firstName ?? "",
      dateLabel: frDate(convocation.shiftDate),
      counterProposedStart: convocation.counterProposedStart ?? "",
      counterProposedEnd: convocation.counterProposedEnd ?? "",
      alreadyDecided: !!convocation.managerResponse,
    }
  },
})

// notifyManagerDecision — email à l'extra avec la décision du gérant sur sa
// contre-proposition. Best-effort, log seulement.
export const notifyManagerDecision = internalAction({
  args: {
    convoId: v.id("extraConvocations"),
    action: v.union(v.literal("accept"), v.literal("decline")),
  },
  handler: async (ctx, { convoId, action }) => {
    const c = await ctx.runQuery(internal.extras.getManagerDecisionContext, { convoId })
    if (!c || !c.email) {
      console.error("[notifyManagerDecision] aucune adresse extra")
      return
    }
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("[notifyManagerDecision] RESEND_API_KEY absente côté Convex")
      return
    }
    const dateLabel = frDate(c.shiftDate)
    const accepted = action === "accept"
    const subject = accepted
      ? "✅ Votre contre-proposition a été acceptée"
      : "❌ Votre contre-proposition n'a pas été retenue"
    const body = accepted
      ? `✅ Votre contre-proposition a été acceptée ! Rendez-vous le ${escapeHtml(dateLabel)} de ${escapeHtml(c.shiftStart)} à ${escapeHtml(c.shiftEnd)}.`
      : `❌ Votre contre-proposition n'a pas été retenue pour le ${escapeHtml(dateLabel)}.`
    const color = accepted ? "#10B981" : "#EF4444"
    const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:8px;background:#ffffff">
  <h2 style="color:#F59E0B;margin:0 0 16px">Splitzy</h2>
  <p style="color:#18181B;font-size:15px;line-height:1.6;margin:0 0 6px">Bonjour ${escapeHtml(c.firstName)},</p>
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-left:4px solid ${color};border-radius:8px;padding:14px 16px;margin:16px 0">
    <p style="color:#18181B;font-size:15px;line-height:1.6;margin:0">${body}</p>
  </div>
  <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:16px 0 0">Notification automatique envoyée par Splitzy.</p>
</div>`
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
          subject,
          html,
        }),
      })
      if (!res.ok) {
        console.error("[notifyManagerDecision] Resend error:", res.status, await res.text())
      }
    } catch (err) {
      console.error("[notifyManagerDecision] send threw:", err)
    }
  },
})

// acceptCounter / declineCounter — décision du gérant depuis le dashboard (authentifié).
// owner/manager uniquement. Même logique que recordManagerResponse.
export const acceptCounter = mutation({
  args: { convoId: v.id("extraConvocations") },
  handler: async (ctx, { convoId }) => {
    const convocation = await ctx.db.get(convoId)
    if (!convocation) throw new Error("Convocation introuvable")
    await requireRestaurantAccess(ctx, convocation.restaurantId, ["owner", "manager"])
    await applyManagerDecision(ctx, convocation, "accept")
  },
})

export const declineCounter = mutation({
  args: { convoId: v.id("extraConvocations") },
  handler: async (ctx, { convoId }) => {
    const convocation = await ctx.db.get(convoId)
    if (!convocation) throw new Error("Convocation introuvable")
    await requireRestaurantAccess(ctx, convocation.restaurantId, ["owner", "manager"])
    await applyManagerDecision(ctx, convocation, "decline")
  },
})
