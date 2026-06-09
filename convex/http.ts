import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { internal } from "./_generated/api"

// ── Webhooks PSP (Vuln 1) ─────────────────────────────────────────────────────
// SECURITY : un paiement n'est marqué "Encaissé" QUE par ces handlers, après
// vérification de la signature du PSP. payments.create ne crée plus qu'un état
// "En attente" (cf. convex/payments.ts). Tout payload non signé / mal signé / sans
// secret configuré est rejeté (401, fail-closed) — aucun traitement.
//
// Les secrets sont des clés de signature fournies par chaque PSP (Square dashboard
// → Webhooks ; SumUp / Worldline → clé HMAC). Stockés en env vars Convex :
//   WEBHOOK_SECRET_SQUARE, WEBHOOK_SECRET_SUMUP, WEBHOOK_SECRET_WORLDLINE
//   (+ SQUARE_WEBHOOK_URL = URL exacte configurée côté Square, requise par leur
//    schéma de signature url+body).

const enc = new TextEncoder()

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
}

async function hmacBase64(secret: string, message: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(message))
  let bin = ""
  for (const b of new Uint8Array(sig)) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(message))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("")
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

// Vérifie une signature HMAC-SHA256 sur le corps brut, en base64 OU hex.
async function verifyBodyHmac(secret: string, body: string, provided: string): Promise<boolean> {
  const b64 = await hmacBase64(secret, body)
  const hex = await hmacHex(secret, body)
  return timingSafeEqual(provided, b64) || timingSafeEqual(provided.toLowerCase(), hex)
}

const unauthorized = (msg: string) => new Response(msg, { status: 401 })

const http = httpRouter()

// ── Square ────────────────────────────────────────────────────────────────────
// Signature : header `x-square-hmacsha256-signature` = base64(HMAC-SHA256(key,
// notificationUrl + rawBody)). notificationUrl doit être l'URL EXACTE déclarée
// dans le dashboard Square (sinon la signature ne matche jamais).
http.route({
  path: "/square-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.WEBHOOK_SECRET_SQUARE
    if (!secret) return unauthorized("Square webhook secret not configured")
    const provided = request.headers.get("x-square-hmacsha256-signature")
    if (!provided) return unauthorized("Missing Square signature")

    const body = await request.text()
    const notificationUrl = process.env.SQUARE_WEBHOOK_URL ?? request.url
    const expected = await hmacBase64(secret, notificationUrl + body)
    if (!timingSafeEqual(provided, expected)) return unauthorized("Invalid Square signature")

    let event: any
    try { event = JSON.parse(body) } catch { return new Response("Bad JSON", { status: 400 }) }

    const payment = event?.data?.object?.payment
    if (event?.type === "payment.updated" && payment?.status === "COMPLETED") {
      await ctx.runMutation(internal.payments.confirmPayment, {
        provider: "square",
        // reference_id = ref Splitzy passée à la création de la charge Square ;
        // fallbacks pour les intégrations qui ne la propagent pas.
        providerRef: payment.reference_id ?? payment.order_id ?? payment.id,
        amountCents: payment.amount_money?.amount ?? -1,
      })
    }
    return new Response(null, { status: 200 })
  }),
})

// ── SumUp ───────────────────────────────────────────────────────────────────
// SumUp ne signe pas nativement : on impose un secret partagé (HMAC-SHA256 du
// corps brut), header `x-webhook-signature`. À aligner sur la conf SumUp réelle.
http.route({
  path: "/sumup-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.WEBHOOK_SECRET_SUMUP
    if (!secret) return unauthorized("SumUp webhook secret not configured")
    const provided = request.headers.get("x-webhook-signature")
    if (!provided) return unauthorized("Missing SumUp signature")

    const body = await request.text()
    if (!(await verifyBodyHmac(secret, body, provided))) return unauthorized("Invalid SumUp signature")

    let event: any
    try { event = JSON.parse(body) } catch { return new Response("Bad JSON", { status: 400 }) }

    const status = String(event?.status ?? event?.payload?.status ?? "").toUpperCase()
    if (status === "PAID" || status === "SUCCESSFUL") {
      const ref = event?.checkout_reference ?? event?.payload?.checkout_reference ?? event?.reference ?? event?.id
      const amount = event?.amount ?? event?.payload?.amount
      await ctx.runMutation(internal.payments.confirmPayment, {
        provider: "sumup",
        providerRef: String(ref ?? ""),
        // SumUp exprime les montants en unités décimales → centimes.
        amountCents: typeof amount === "number" ? Math.round(amount * 100) : -1,
      })
    }
    return new Response(null, { status: 200 })
  }),
})

// ── Worldline ─────────────────────────────────────────────────────────────────
// Worldline signe en HMAC-SHA256 (base64) du corps, header `x-gcs-signature`.
http.route({
  path: "/worldline-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.WEBHOOK_SECRET_WORLDLINE
    if (!secret) return unauthorized("Worldline webhook secret not configured")
    const provided = request.headers.get("x-gcs-signature") ?? request.headers.get("x-webhook-signature")
    if (!provided) return unauthorized("Missing Worldline signature")

    const body = await request.text()
    if (!(await verifyBodyHmac(secret, body, provided))) return unauthorized("Invalid Worldline signature")

    let event: any
    try { event = JSON.parse(body) } catch { return new Response("Bad JSON", { status: 400 }) }

    const payment = event?.payment ?? event?.payload?.payment
    const statusCode = payment?.status ?? event?.type
    const captured = statusCode === "CAPTURED" || statusCode === "PAID" || event?.type === "payment.captured"
    if (captured) {
      const out = payment?.paymentOutput ?? {}
      const ref = payment?.merchantReference ?? out?.references?.merchantReference ?? payment?.id
      const amount = out?.amountOfMoney?.amount ?? payment?.amountOfMoney?.amount
      await ctx.runMutation(internal.payments.confirmPayment, {
        provider: "worldline",
        providerRef: String(ref ?? ""),
        // Worldline exprime déjà les montants en plus petite unité (centimes).
        amountCents: typeof amount === "number" ? amount : -1,
      })
    }
    return new Response(null, { status: 200 })
  }),
})

export default http
