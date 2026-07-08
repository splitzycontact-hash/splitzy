import { mutation, internalQuery, internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"

// Formulaire /contact (GOAL_WEB_08) — point d'entrée principal des demandes de
// démo depuis GOAL_WEB_06. Chaque soumission est persistée dans `demoRequests`
// puis notifiée par email interne (Resend, même pattern que convex/leads.ts).
//
// Table distincte de `leads` : leads est propre au calculateur de rentabilité
// (champs chiffrés requis, incompatibles avec un message libre).

// Sujets acceptés — doit rester aligné avec SUBJECTS dans ContactPage.tsx.
const SUBJECTS: Record<string, string> = {
  demo:    "Demande de démo",
  support: "Support technique",
  press:   "Presse & médias",
  partner: "Partenariat",
  other:   "Autre",
}

const NOTIFY_EMAIL = "splitzy.contact@gmail.com"
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

// Rate limit inline sur ctx.db (même sémantique que leads.checkRateLimit —
// une mutation ne peut pas appeler une autre mutation via ctx.runMutation).
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

// submitContact — mutation PUBLIQUE (appelée sans auth depuis /contact via
// httpMutation). Valide les champs, insère la demande puis planifie l'email
// de notification interne.
export const submitContact = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    restaurantName: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const firstName = args.firstName.trim()
    const lastName = args.lastName.trim()
    const email = args.email.trim().toLowerCase()
    const restaurantName = args.restaurantName?.trim() || undefined
    const message = args.message.trim()

    if (!firstName || firstName.length > 100) throw new Error("Prénom invalide")
    if (!lastName || lastName.length > 100) throw new Error("Nom invalide")
    if (!EMAIL_RE.test(email) || email.length > 200) throw new Error("Email invalide")
    if (restaurantName && restaurantName.length > 200) throw new Error("Nom de restaurant trop long")
    if (!SUBJECTS[args.subject]) throw new Error("Sujet inconnu")
    if (message.length < 10 || message.length > 1000) {
      throw new Error("Message invalide (10 à 1000 caractères)")
    }

    // Anti-spam : la mutation est publique et déclenche un email interne.
    await checkRateLimit(ctx, "contact:submitContact", 20, 3_600_000,
      "Trop de demandes en ce moment. Réessayez dans quelques minutes.")
    await checkRateLimit(ctx, `contact:email:${email}`, 3, 86_400_000,
      "Un message a déjà été envoyé avec cet email aujourd'hui.")

    const requestId = await ctx.db.insert("demoRequests", {
      firstName,
      lastName,
      email,
      restaurantName,
      subject: args.subject,
      message,
      createdAt: Date.now(),
    })

    await ctx.scheduler.runAfter(0, internal.contact.notifyContactRequest, { requestId })

    return { ok: true }
  },
})

export const getById = internalQuery({
  args: { requestId: v.id("demoRequests") },
  handler: async (ctx, { requestId }) => ctx.db.get(requestId),
})

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// notifyContactRequest — email interne de notification à l'équipe Splitzy.
// Échec d'envoi non bloquant : la demande est déjà persistée, on logge seulement.
export const notifyContactRequest = internalAction({
  args: { requestId: v.id("demoRequests") },
  handler: async (ctx, { requestId }) => {
    const req = await ctx.runQuery(internal.contact.getById, { requestId })
    if (!req) return
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("[Contact] RESEND_API_KEY not set — notification non envoyée")
      return
    }

    const subjectLabel = SUBJECTS[req.subject] ?? req.subject

    const row = (k: string, val: string) =>
      `<tr><td style="padding:6px 16px 6px 0;color:#9CA3AF;font-size:13px;white-space:nowrap;vertical-align:top">${k}</td>
       <td style="padding:6px 0;color:#18181B;font-size:14px;font-weight:600">${val}</td></tr>`

    const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <div style="background:#0A0A0A;border-radius:12px 12px 0 0;padding:18px 24px">
      <span style="color:#fff;font-size:16px;font-weight:800">Splitzy</span>
      <span style="color:#E8920A;font-size:13px;font-weight:600;float:right">${esc(subjectLabel)} — /contact</span>
    </div>
    <div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;padding:20px 24px">
      <table style="border-collapse:collapse">
        ${row("Nom", esc(`${req.firstName} ${req.lastName}`))}
        ${row("Email", esc(req.email))}
        ${req.restaurantName ? row("Restaurant", esc(req.restaurantName)) : ""}
        ${row("Sujet", esc(subjectLabel))}
      </table>
      <p style="margin:16px 0 0;padding:14px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px;color:#18181B;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(req.message)}</p>
      <p style="margin:16px 0 0;color:#9CA3AF;font-size:12px">
        Répondre directement à cet email répond au contact (reply-to configuré).
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
          reply_to: req.email,
          subject: `[Contact] ${subjectLabel} — ${req.firstName} ${req.lastName}`,
          html,
        }),
      })
      if (!res.ok) console.error("[Contact] Resend error:", res.status, await res.text())
    } catch (err) {
      console.error("[Contact] notification send threw:", err)
    }
  },
})
