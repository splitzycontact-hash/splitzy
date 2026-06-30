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

// ── Réponse extra à une convocation (liens publics dans l'email) ────────────────
// Confirmation en 2 temps — anti-SafeLinks/antivirus : un scanner qui PRÉFETCHE le
// lien GET ne doit pas pouvoir brûler le token à usage unique.
//   GET  /api/extra-response          → page HTML avec un bouton (n'enregistre RIEN).
//   POST /api/extra-response-confirm  → enregistre définitivement (1ʳᵉ réponse) + redirige.
// 100% public (pas de Clerk). Réponse à usage unique, cf. extras.recordResponse.

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const confirmationPage = "https://www.splitzy.fr/extra-response-confirmation"
const redirectTo = (location: string) =>
  new Response(null, { status: 302, headers: { Location: location } })

// Page intermédiaire : aucun effet de bord, juste un formulaire POST. Un prefetch
// (SafeLinks, antivirus) charge cette page sans jamais enregistrer la réponse.
function renderExtraConfirmPage(opts: {
  firstName: string
  dateLabel: string
  timeLabel: string
  token: string
  answer: "yes" | "no"
}): string {
  const firstName = htmlEscape(opts.firstName)
  const token = htmlEscape(opts.token)
  const accepted = opts.answer === "yes"
  const when = [opts.dateLabel, opts.timeLabel].filter(Boolean).map(htmlEscape).join(" · ")
  const question = accepted
    ? "confirmez-vous votre disponibilité"
    : "confirmez-vous votre indisponibilité"
  const buttonLabel = accepted ? "Confirmer ma disponibilité" : "Confirmer mon indisponibilité"
  const buttonBg = accepted ? "#E8920A" : "#374151"
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Confirmer votre réponse — Splitzy</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#18181B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px">
  <div style="max-width:380px;width:100%;text-align:center">
    <h2 style="color:#E8920A;font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 28px">Splitzy</h2>
    <h1 style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.02em;margin:0 0 10px">Bonjour ${firstName},</h1>
    <p style="color:#A1A1AA;font-size:14.5px;line-height:1.6;margin:0 0 24px">${question}${when ? " pour le " + when : ""} ?</p>
    <form method="POST" action="/api/extra-response-confirm">
      <input type="hidden" name="token" value="${token}">
      <input type="hidden" name="answer" value="${accepted ? "yes" : "no"}">
      <button type="submit" style="display:inline-block;width:100%;background:${buttonBg};color:#fff;padding:14px 20px;border:0;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">${buttonLabel}</button>
    </form>
    <p style="color:#71717A;font-size:12px;line-height:1.6;margin:20px 0 0">Cliquez sur le bouton pour valider votre réponse auprès du restaurant.</p>
  </div>
</body></html>`
}

http.route({
  path: "/api/extra-response",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")
    const answer = url.searchParams.get("answer")
    if (!token || (answer !== "yes" && answer !== "no")) {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    const info = await ctx.runQuery(internal.extras.getConvocationByToken, { token })
    // Déjà répondue (ou token inconnu) → page « lien invalide ou déjà utilisé ».
    if (!info || info.alreadyResponded) {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    const timeLabel = info.shiftStart
      ? `${info.shiftStart}${info.shiftEnd ? " – " + info.shiftEnd : ""}`
      : ""
    const html = renderExtraConfirmPage({
      firstName: info.firstName,
      dateLabel: info.dateLabel,
      timeLabel,
      token,
      answer,
    })
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }),
})

// POST — enregistre définitivement la réponse (1ʳᵉ = définitive) puis redirige vers
// la page de confirmation publique. Corps form-urlencoded (token + answer).
http.route({
  path: "/api/extra-response-confirm",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = new URLSearchParams(await request.text())
    const token = body.get("token")
    const answer = body.get("answer")
    if (!token || (answer !== "yes" && answer !== "no")) {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    const result = await ctx.runMutation(internal.extras.recordResponse, { token, answer })
    if (!result.ok) return redirectTo(`${confirmationPage}?status=invalid`)
    return redirectTo(`${confirmationPage}?answer=${answer}`)
  }),
})

// ── Contre-proposition d'horaire (liens publics dans l'email) ───────────────────
// Côté extra : un lien GET ouvre un formulaire (saisie créneau souhaité), le POST
// enregistre la contre-proposition. Côté gérant : confirmation 2 temps anti-SafeLinks
// (GET page bouton → POST décision). 100% public, tokens non devinables.

function renderCounterFormPage(opts: {
  firstName: string
  dateLabel: string
  timeLabel: string
  token: string
}): string {
  const firstName = htmlEscape(opts.firstName)
  const token = htmlEscape(opts.token)
  const dateLabel = htmlEscape(opts.dateLabel)
  const timeLabel = htmlEscape(opts.timeLabel)
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Proposer un autre horaire — Splitzy</title></head>
<body style="margin:0;min-height:100vh;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px;box-sizing:border-box">
  <div style="max-width:480px;margin:0 auto">
    <h2 style="color:#E8920A;font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 24px;text-align:center">Splitzy</h2>
    <h1 style="color:#18181B;font-size:20px;font-weight:800;letter-spacing:-0.02em;margin:0 0 8px">Bonjour ${firstName},</h1>
    <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 6px">Proposer un autre horaire pour le <strong>${dateLabel}</strong></p>
    <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 24px">Horaire original : ${timeLabel || "—"}</p>
    <form method="POST" action="/api/extra-counter-confirm">
      <input type="hidden" name="token" value="${token}">
      <label style="display:block;color:#374151;font-size:14px;font-weight:600;margin:0 0 6px">De :</label>
      <input type="time" name="start" required style="width:100%;box-sizing:border-box;padding:12px;font-size:16px;border:1px solid #E5E7EB;border-radius:8px;margin:0 0 16px">
      <label style="display:block;color:#374151;font-size:14px;font-weight:600;margin:0 0 6px">À :</label>
      <input type="time" name="end" required style="width:100%;box-sizing:border-box;padding:12px;font-size:16px;border:1px solid #E5E7EB;border-radius:8px;margin:0 0 16px">
      <label style="display:block;color:#374151;font-size:14px;font-weight:600;margin:0 0 6px">Message (optionnel)</label>
      <textarea name="message" rows="3" placeholder="Ex : je dois déposer mes enfants avant..." style="width:100%;box-sizing:border-box;padding:12px;font-size:16px;border:1px solid #E5E7EB;border-radius:8px;margin:0 0 20px;font-family:inherit;resize:vertical"></textarea>
      <button type="submit" style="display:block;width:100%;background:#E8920A;color:#fff;padding:14px 20px;border:0;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">Envoyer ma contre-proposition →</button>
    </form>
  </div>
</body></html>`
}

// GET — formulaire de contre-proposition. Aucun effet de bord.
http.route({
  path: "/api/extra-counter-form",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")
    if (!token) return redirectTo(`${confirmationPage}?status=invalid`)
    const info = await ctx.runQuery(internal.extras.getConvocationByToken, { token })
    // Déjà répondue (ou token inconnu) → page « lien invalide ou déjà utilisé ».
    if (!info || info.alreadyResponded) {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    const timeLabel = info.shiftStart
      ? `${info.shiftStart}${info.shiftEnd ? " – " + info.shiftEnd : ""}`
      : ""
    const html = renderCounterFormPage({
      firstName: info.firstName,
      dateLabel: info.dateLabel,
      timeLabel,
      token,
    })
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }),
})

// POST — enregistre la contre-proposition puis redirige. recordCounterProposal throw
// si la convocation a déjà reçu une réponse (response !== "pending").
http.route({
  path: "/api/extra-counter-confirm",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = new URLSearchParams(await request.text())
    const token = body.get("token")
    const start = body.get("start")
    const end = body.get("end")
    const message = body.get("message") ?? undefined
    if (!token || !start || !end) {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    try {
      await ctx.runMutation(internal.extras.recordCounterProposal, {
        token,
        start,
        end,
        message: message || undefined,
      })
    } catch {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    return redirectTo(`${confirmationPage}?answer=counter`)
  }),
})

function renderManagerCounterPage(opts: {
  firstName: string
  dateLabel: string
  counterStart: string
  counterEnd: string
  token: string
  action: "accept" | "decline"
}): string {
  const firstName = htmlEscape(opts.firstName)
  const token = htmlEscape(opts.token)
  const dateLabel = htmlEscape(opts.dateLabel)
  const slot = htmlEscape(`${opts.counterStart}–${opts.counterEnd}`)
  const accept = opts.action === "accept"
  const question = accept
    ? `Confirmer l'acceptation du créneau ${slot} ?`
    : "Confirmer le refus de la contre-proposition ?"
  const buttonLabel = accept ? "✓ Confirmer l'acceptation" : "✗ Confirmer le refus"
  const buttonBg = accept ? "#E8920A" : "#374151"
  const when = [firstName, dateLabel].filter(Boolean).join(" · ")
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Confirmer votre réponse — Splitzy</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#18181B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px">
  <div style="max-width:380px;width:100%;text-align:center">
    <h2 style="color:#E8920A;font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 28px">Splitzy</h2>
    <h1 style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.02em;margin:0 0 10px">${question}</h1>
    <p style="color:#A1A1AA;font-size:14.5px;line-height:1.6;margin:0 0 24px">${when}</p>
    <form method="POST" action="/api/manager-counter-confirm">
      <input type="hidden" name="token" value="${token}">
      <input type="hidden" name="action" value="${accept ? "accept" : "decline"}">
      <button type="submit" style="display:inline-block;width:100%;background:${buttonBg};color:#fff;padding:14px 20px;border:0;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">${buttonLabel}</button>
    </form>
    <p style="color:#71717A;font-size:12px;line-height:1.6;margin:20px 0 0">Cliquez sur le bouton pour valider votre réponse.</p>
  </div>
</body></html>`
}

function renderManagerCounterResult(): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Réponse enregistrée — Splitzy</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#18181B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px">
  <div style="max-width:380px;width:100%;text-align:center">
    <h2 style="color:#E8920A;font-size:24px;font-weight:800;letter-spacing:-0.02em;margin:0 0 28px">Splitzy</h2>
    <p style="color:#fff;font-size:16px;line-height:1.6;margin:0">Votre réponse a bien été enregistrée. L'extra a été notifié.</p>
  </div>
</body></html>`
}

const htmlResponse = (html: string) =>
  new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })

// GET — page de décision du gérant (confirmation 2 temps). Aucun effet de bord.
http.route({
  path: "/api/manager-counter",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")
    const action = url.searchParams.get("action")
    if (!token || (action !== "accept" && action !== "decline")) {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    const info = await ctx.runQuery(internal.extras.getManagerCounterByToken, { token })
    if (!info || info.alreadyDecided) {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    const html = renderManagerCounterPage({
      firstName: info.firstName,
      dateLabel: info.dateLabel,
      counterStart: info.counterProposedStart,
      counterEnd: info.counterProposedEnd,
      token,
      action,
    })
    return htmlResponse(html)
  }),
})

// POST — enregistre la décision du gérant. recordManagerResponse throw si déjà décidé.
http.route({
  path: "/api/manager-counter-confirm",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = new URLSearchParams(await request.text())
    const token = body.get("token")
    const action = body.get("action")
    if (!token || (action !== "accept" && action !== "decline")) {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    try {
      await ctx.runMutation(internal.extras.recordManagerResponse, { token, action })
    } catch {
      return redirectTo(`${confirmationPage}?status=invalid`)
    }
    return htmlResponse(renderManagerCounterResult())
  }),
})

// ── Sentry Webhook → Telegram ─────────────────────────────────────────────────
// Reçoit les alertes Sentry (nouvelles erreurs, résolutions) et les envoie
// sur Telegram via le bot Hermes, avec stack trace enrichie via l'API Sentry.
//
// Env vars Convex requises :
//   TELEGRAM_BOT_TOKEN    — token du bot (BotFather)
//   TELEGRAM_CHAT_ID      — ton user ID Telegram
//   SENTRY_WEBHOOK_SECRET — secret Sentry (optionnel, recommandé)
//   SENTRY_AUTH_TOKEN     — token Internal Integration Sentry (pour stack trace)
//
// URL à configurer dans Sentry → Settings → Developer Settings → Splitzy Telegram Alerts :
//   https://mellow-chinchilla-481.eu-west-1.convex.site/sentry-webhook

function htmlEscapeTg(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

// Extrait les frames applicatives les plus pertinentes depuis un événement Sentry.
function extractStackFrames(event: any): string {
  const entries: any[] = event?.entries ?? []
  for (const entry of entries) {
    if (entry.type !== "exception") continue
    const frames: any[] = entry.data?.values?.[0]?.stacktrace?.frames ?? []
    // Garder uniquement les frames "in-app" (exclure react-dom, chunks, node_modules)
    const appFrames = frames
      .filter((f: any) =>
        f.inApp !== false &&
        !String(f.filename ?? "").includes("node_modules") &&
        !String(f.filename ?? "").includes("react-dom") &&
        !String(f.filename ?? "").includes("/chunk-") &&
        !String(f.filename ?? "").includes("@sentry"),
      )
      .slice(-4)
      .reverse()
    if (!appFrames.length) return ""
    const lines = appFrames.map((f: any) => {
      const fn   = htmlEscapeTg(f.function ?? f.module ?? "?")
      const file = htmlEscapeTg(String(f.filename ?? "").replace(/^.*\/src\//, "src/"))
      const line = f.lineNo ? `:${f.lineNo}` : ""
      return `  <code>${fn}()</code> ${file}${line}`
    })
    return "\n\n📍 <b>Stack :</b>\n" + lines.join("\n")
  }
  return ""
}

http.route({
  path: "/sentry-webhook",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const botToken    = process.env.TELEGRAM_BOT_TOKEN
    const chatId      = process.env.TELEGRAM_CHAT_ID
    const secret      = process.env.SENTRY_WEBHOOK_SECRET
    const sentryToken = process.env.SENTRY_AUTH_TOKEN

    const body = await request.text()

    // Vérification signature Sentry si secret configuré.
    if (secret) {
      const provided = request.headers.get("sentry-hook-signature")
      if (!provided) return unauthorized("Missing Sentry signature")
      if (!(await verifyBodyHmac(secret, body, provided))) return unauthorized("Invalid Sentry signature")
    }

    if (!botToken || !chatId) {
      console.error("[Sentry→Telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID manquants")
      return new Response(null, { status: 200 })
    }

    let payload: any
    try { payload = JSON.parse(body) } catch { return new Response("Bad JSON", { status: 400 }) }

    const action = payload?.action as string
    const issue  = payload?.data?.issue
    if (!issue) return new Response(null, { status: 200 })

    let message = ""

    if (action === "created") {
      const level = String(issue.level ?? "error")
      const emoji = level === "fatal" ? "🔴" : level === "error" ? "🚨" : level === "warning" ? "⚠️" : "ℹ️"

      // Titre enrichi depuis metadata (plus précis que issue.title)
      const errorType  = issue.metadata?.type ?? ""
      const errorValue = issue.metadata?.value ?? ""
      const title = htmlEscapeTg(
        errorType && errorValue ? `${errorType}: ${errorValue}` : (issue.title ?? "Erreur inconnue")
      )

      // Fichier source (metadata > culprit)
      const srcFile = issue.metadata?.filename ?? issue.metadata?.module ?? issue.culprit ?? ""
      const culprit = srcFile ? `\n📁 <code>${htmlEscapeTg(srcFile)}</code>` : ""

      // Tags → environnement, browser, OS
      const tags: Record<string, string> = {}
      if (Array.isArray(issue.tags)) {
        for (const t of issue.tags) { if (t?.key) tags[t.key] = t.value ?? "" }
      }
      const env     = tags["environment"] ?? tags["env"] ?? ""
      const browser = tags["browser.name"] ?? tags["browser"] ?? ""
      const os      = tags["os.name"] ?? tags["os"] ?? ""
      const envLine = env ? `\n🌍 <code>${htmlEscapeTg(env)}</code>` : ""
      const devLine = browser ? `\n🌐 ${htmlEscapeTg(browser)}${os ? ` · ${htmlEscapeTg(os)}` : ""}` : ""

      const count = Number(issue.count ?? 1)
      const users = Number(issue.userCount ?? 0)

      // Stack trace + user via API Sentry (si token configuré)
      let stackTrace = ""
      let userLine   = ""
      if (sentryToken && issue.id) {
        try {
          const resp = await fetch(
            `https://sentry.io/api/0/issues/${issue.id}/events/latest/`,
            { headers: { Authorization: `Bearer ${sentryToken}` } }
          )
          if (resp.ok) {
            const event = await resp.json()
            stackTrace = extractStackFrames(event)
            const user = event?.user
            if (user?.email) userLine = `\n👤 <code>${htmlEscapeTg(user.email)}</code>`
            else if (user?.username) userLine = `\n👤 <code>${htmlEscapeTg(user.username)}</code>`
            else if (user?.id) userLine = `\n👤 user <code>${htmlEscapeTg(String(user.id))}</code>`
          }
        } catch (e) {
          console.warn("[Sentry→Telegram] Impossible de récupérer l'event:", e)
        }
      }

      const link = issue.permalink ? `\n\n<a href="${issue.permalink}">🔗 Voir sur Sentry</a>` : ""

      message = `${emoji} <b>Nouvelle erreur Splitzy</b>\n\n`
              + `<b>${title}</b>${culprit}\n`
              + `⚠️ Niveau : <code>${level}</code>\n`
              + (count > 1 ? `🔁 ${count} occurrences\n` : "")
              + (users > 0 ? `👤 ${users} utilisateur${users > 1 ? "s" : ""} affecté${users > 1 ? "s" : ""}\n` : "")
              + envLine + devLine + userLine
              + stackTrace
              + link

    } else if (action === "resolved") {
      const title = htmlEscapeTg(issue.title ?? "Erreur")
      const link  = issue.permalink ? ` <a href="${issue.permalink}">→</a>` : ""
      message = `✅ <b>Erreur résolue</b>\n\n${title}${link}`

    } else {
      // assigned, archived, etc. → silencieux
      return new Response(null, { status: 200 })
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    })

    return new Response(null, { status: 200 })
  }),
})

// ── CSP Violation Reporting ───────────────────────────────────────────────────
// Reçoit les rapports de violation CSP envoyés par les navigateurs.
// Supporte les deux formats :
//   - report-uri (ancien, Chrome/Firefox) : POST JSON { "csp-report": { ... } }
//   - Reporting API (nouveau, Chrome 69+)  : POST JSON array [{ "body": { ... } }]
// Les violations sont loggées en console Convex (visibles dans le dashboard).
// Pour les envoyer vers Sentry, remplacer le console.warn par un fetch Sentry DSN.
http.route({
  path: "/csp-report",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    try {
      const body = await request.json()
      // Normaliser les deux formats en un objet unique.
      const report = Array.isArray(body)
        ? body[0]?.body ?? body[0]
        : body["csp-report"] ?? body
      console.warn("[CSP Violation]", JSON.stringify(report))
    } catch {
      // Corps invalide — ignorer silencieusement.
    }
    return new Response(null, { status: 204 })
  }),
})

// OPTIONS preflight pour /csp-report (Reporting API envoie un preflight CORS).
http.route({
  path: "/csp-report",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "https://www.splitzy.fr",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    })
  }),
})

export default http
