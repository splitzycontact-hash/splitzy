"use node"
import { action } from "./_generated/server"
import { api, internal } from "./_generated/api"
import { v } from "convex/values"
import { Resend } from "resend"
import { requireIdentity } from "./authz"

// Échappe le HTML pour que le sujet / corps saisis par le gérant ne puissent
// pas casser le template ni injecter de markup.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Template email — header dark #0A0A0A avec le nom du restaurant, corps du
// message gérant, footer gris 12px avec mention + lien de désabonnement (RGPD).
function renderEmail(opts: { restaurantName: string; body: string; customerId: string }): string {
  const name = escapeHtml(opts.restaurantName)
  const body = escapeHtml(opts.body).replace(/\n/g, "<br/>")
  const unsubUrl = `https://www.splitzy.fr/unsubscribe?id=${opts.customerId}`
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;">
      <div style="background:#0A0A0A;padding:30px 32px;">
        <div style="color:#ffffff;font-size:21px;font-weight:700;letter-spacing:-0.02em;">${name}</div>
      </div>
      <div style="padding:32px;color:#18181B;font-size:15px;line-height:1.7;">${body}</div>
      <div style="padding:20px 32px 30px;border-top:1px solid #E5E7EB;color:#6B7280;font-size:12px;line-height:1.6;">
        Vous recevez cet email car vous avez accepté les offres de ${name} via Splitzy.<br/>
        <a href="${unsubUrl}" style="color:#6B7280;text-decoration:underline;">Se désabonner</a>
      </div>
    </div>
  </body>
</html>`
}

// Envoi d'une campagne email à une liste de clients.
// Double vérification côté backend : pour CHAQUE customerId on revérifie que le
// client a bien un email non vide ET marketingConsent === true avant d'envoyer
// (le front ne doit jamais être la seule barrière RGPD).
export const sendCampaign = action({
  args: {
    restaurantId: v.id("restaurants"),
    customerIds: v.array(v.id("customers")),
    subject: v.string(),
    body: v.string(),
    restaurantName: v.string(),
  },
  handler: async (ctx, args): Promise<{ sent: number; failed: number }> => {
    // Vérification ownership : l'action est PUBLIC (appelable directement via
    // POST /api/action), donc on revérifie côté backend que l'appelant possède
    // bien le restaurant ciblé par la campagne. Les actions n'ont pas ctx.db,
    // on passe donc par la query owner-scoped restaurants.getByClerkId.
    await requireIdentity(ctx)
    const ownerRestaurant = await ctx.runQuery(api.restaurants.getByClerkId, {})
    if (!ownerRestaurant || ownerRestaurant._id !== args.restaurantId) {
      throw new Error("Accès refusé")
    }

    // Rate limit : max 3 campagnes par heure et par restaurant.
    await ctx.runMutation(internal.rateLimits.checkAndIncrement, {
      key: `campaign:${args.restaurantId}`,
      limit: 3,
      windowMs: 3_600_000,
    })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("[Campaign] RESEND_API_KEY not set")
      return { sent: 0, failed: args.customerIds.length }
    }
    const resend = new Resend(apiKey)

    const customers = await ctx.runQuery(internal.customers.getManyForCampaign, {
      restaurantId: args.restaurantId,
      customerIds: args.customerIds,
    })

    let sent = 0
    let failed = 0

    for (const c of customers) {
      const email = (c.email ?? "").trim()
      // Double check RGPD : email présent + consentement marketing actif.
      if (!email || c.marketingConsent !== true) {
        failed++
        continue
      }
      try {
        const res = await resend.emails.send({
          from: "Splitzy <noreply@splitzy.fr>",
          to: email,
          subject: args.subject,
          html: renderEmail({ restaurantName: args.restaurantName, body: args.body, customerId: c._id }),
        })
        if (res.error) {
          console.error("[Campaign] Resend error:", res.error)
          failed++
        } else {
          sent++
        }
      } catch (err) {
        console.error("[Campaign] send threw:", err)
        failed++
      }
    }

    console.log(`[Campaign] ${args.restaurantName} — sent=${sent} failed=${failed}`)
    return { sent, failed }
  },
})
