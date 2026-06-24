import { query, action, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import { api, internal } from "./_generated/api"
import { requireRestaurantAccess } from "./authz"

// M11-B — Calcul de la répartition des pourboires à la clôture de service.
// Lit restaurants.tipSettings (M11-A) ; défaut "equal" si absent. Les tables
// "paid" portent paidTipCents (pourboire encaissé) et amountCents (CA), et
// assignedMemberId (serveur). Les shifts du jour donnent les heures travaillées.

// Répartit `amount` (cents entiers) proportionnellement à `weights`, en
// préservant la somme exacte via la méthode du plus grand reste.
function distributeCents(amount: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0)
  if (amount <= 0 || total <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (amount * w) / total)
  const floored = raw.map((x) => Math.floor(x))
  let remainder = amount - floored.reduce((s, x) => s + x, 0)
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    floored[order[k].i] += 1
  }
  return floored
}

// Heures d'un shift : réel (checkedInAt/Out) si dispo, sinon planifié
// (startTime/endTime "HH:MM"). Gère le service de nuit (fin < début).
function shiftHours(s: {
  startTime?: string
  endTime?: string
  checkedInAt?: number
  checkedOutAt?: number
}): number {
  if (s.checkedInAt && s.checkedOutAt && s.checkedOutAt > s.checkedInAt) {
    return (s.checkedOutAt - s.checkedInAt) / 3_600_000
  }
  const toMin = (t?: string) => {
    if (!t) return null
    const [h, m] = t.split(":").map(Number)
    if (Number.isNaN(h)) return null
    return h * 60 + (Number.isNaN(m) ? 0 : m)
  }
  const a = toMin(s.startTime)
  const b = toMin(s.endTime)
  if (a == null || b == null) return 0
  let d = b - a
  if (d < 0) d += 24 * 60 // service de nuit
  return d / 60
}

export const getTipDistribution = query({
  args: { restaurantId: v.id("restaurants"), serviceDate: v.string() }, // "2026-06-24"
  handler: async (ctx, args) => {
    await requireRestaurantAccess(ctx, args.restaurantId, ["owner", "manager"])

    const restaurant = await ctx.db.get(args.restaurantId)
    const mode = restaurant?.tipSettings?.mode ?? "equal"
    const kitchenPct = restaurant?.tipSettings?.kitchenSharePct ?? 0
    const coeffs = {
      owner: restaurant?.tipSettings?.roleCoefficients?.owner ?? 1,
      manager: restaurant?.tipSettings?.roleCoefficients?.manager ?? 1,
      staff: restaurant?.tipSettings?.roleCoefficients?.staff ?? 1,
    }

    const [tables, shifts, members] = await Promise.all([
      ctx.db
        .query("tables")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
        .filter((q) => q.eq(q.field("status"), "paid"))
        .collect(),
      ctx.db
        .query("shifts")
        .withIndex("by_restaurant_date", (q) =>
          q.eq("restaurantId", args.restaurantId).eq("date", args.serviceDate),
        )
        .collect(),
      ctx.db
        .query("members")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
        .collect(),
    ])

    const totalTips = tables.reduce((s, t) => s + (t.paidTipCents ?? 0), 0)
    // "table" / "revenue" répartissent déjà par contribution → pas de part cuisine.
    const effKitchenPct = mode === "table" || mode === "revenue" ? 0 : kitchenPct
    const kitchenShare = Math.round((totalTips * effKitchenPct) / 100)
    const toDistribute = totalTips - kitchenShare

    const memberById = new Map(members.map((m) => [m._id as string, m]))

    // Tables servies + CA par membre (depuis les tables payées assignées).
    const stats = new Map<string, { tablesServed: number; revenueCents: number }>()
    for (const t of tables) {
      if (!t.assignedMemberId) continue
      const k = t.assignedMemberId as string
      const cur = stats.get(k) ?? { tablesServed: 0, revenueCents: 0 }
      cur.tablesServed += 1
      cur.revenueCents += t.amountCents ?? 0
      stats.set(k, cur)
    }

    // Heures travaillées par membre (somme des shifts du jour).
    const hoursByMember = new Map<string, number>()
    for (const s of shifts) {
      const k = s.memberId as string
      hoursByMember.set(k, (hoursByMember.get(k) ?? 0) + shiftHours(s))
    }

    // Participants + poids selon le mode.
    let participantIds: string[]
    let weightFn: (id: string) => number
    if (mode === "table") {
      participantIds = [...stats.entries()].filter(([, s]) => s.tablesServed > 0).map(([k]) => k)
      weightFn = (id) => stats.get(id)?.tablesServed ?? 0
    } else if (mode === "revenue") {
      participantIds = [...stats.entries()].filter(([, s]) => s.revenueCents > 0).map(([k]) => k)
      weightFn = (id) => stats.get(id)?.revenueCents ?? 0
    } else {
      // equal / hours / points → membres planifiés ce jour (roster).
      participantIds = [...new Set(shifts.map((s) => s.memberId as string))]
      if (mode === "hours") {
        weightFn = (id) => hoursByMember.get(id) ?? 0
      } else if (mode === "points") {
        weightFn = (id) => {
          const role = (memberById.get(id)?.role ?? "staff") as "owner" | "manager" | "staff"
          return coeffs[role] ?? 1
        }
      } else {
        weightFn = () => 1 // equal
      }
    }

    let weights = participantIds.map(weightFn)
    // Garde-fou : si tous les poids sont nuls mais des participants existent,
    // répartir également (évite de tout verser à personne).
    if (weights.length > 0 && weights.every((w) => w === 0)) {
      weights = participantIds.map(() => 1)
    }

    const amounts = distributeCents(toDistribute, weights)

    const distribution = participantIds
      .map((id, i) => {
        const m = memberById.get(id)
        const name =
          m?.displayName ??
          (m?.firstName ? `${m.firstName} ${m.lastName ?? ""}`.trim() : null) ??
          m?.name ??
          "Inconnu"
        const st = stats.get(id) ?? { tablesServed: 0, revenueCents: 0 }
        return {
          memberId: id,
          firstName: m?.firstName ?? null,
          lastName: m?.lastName ?? null,
          name,
          role: m?.role ?? "staff",
          tablesServed: st.tablesServed,
          amountCents: amounts[i],
        }
      })
      .sort((a, b) => b.amountCents - a.amountCents)

    return { mode, totalTips, kitchenShare, toDistribute, distribution }
  },
})

// ---------------------------------------------------------------------------
// M11-C — Envoi du rapport de répartition par email (Resend, via fetch REST →
// aucune dépendance npm, comme invitations.ts). Deux emails :
//   1. à chaque serveur éligible → son montant + ses tables ;
//   2. à l'owner / aux managers → le tableau complet (justificatif/archive).
// La répartition est RE-CALCULÉE côté serveur via getTipDistribution (qui
// re-vérifie l'accès owner/manager) — le front n'est jamais la source de vérité.
// ---------------------------------------------------------------------------

const eur = (cents: number) =>
  `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

const TIP_MODE_LABEL_FR: Record<string, string> = {
  equal: "parts égales",
  hours: "au prorata des heures",
  table: "par tables servies",
  revenue: "par chiffre d'affaires",
  points: "par coefficients de rôle",
}

const EMAIL_SHELL = (title: string, restaurantName: string, body: string) => `
<div style="background:#F4F4F5;padding:24px 0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB">
    <div style="background:#0A0A0A;padding:22px 28px">
      <div style="color:#E8920A;font-weight:700;font-size:13px;letter-spacing:.5px">SPLITZY</div>
      <div style="color:#fff;font-size:18px;font-weight:700;margin-top:4px">${title}</div>
      <div style="color:#9CA3AF;font-size:13px;margin-top:2px">${restaurantName}</div>
    </div>
    <div style="padding:24px 28px;color:#111827;font-size:14px;line-height:1.55">${body}</div>
    <div style="padding:16px 28px;border-top:1px solid #E5E7EB;color:#9CA3AF;font-size:12px">
      Rapport généré automatiquement à la clôture du service. Montants indicatifs.
    </div>
  </div>
</div>`

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function renderServerTipEmail(p: {
  restaurantName: string
  serviceDate: string
  name: string
  amountCents: number
  tablesServed: number
  mode: string
}): string {
  const modeLabel = TIP_MODE_LABEL_FR[p.mode] ?? p.mode
  const body = `
    <p style="margin:0 0 16px">Bonjour ${esc(p.name)},</p>
    <p style="margin:0 0 16px">Voici ta part des pourboires pour le service du <strong>${esc(p.serviceDate)}</strong>.</p>
    <div style="background:#fffbf2;border:1px solid #FEF3C7;border-radius:12px;padding:18px;text-align:center;margin-bottom:16px">
      <div style="color:#9CA3AF;font-size:12px">Ta part ce soir</div>
      <div style="color:#111827;font-size:28px;font-weight:800;margin-top:4px">${eur(p.amountCents)}</div>
    </div>
    <p style="margin:0 0 4px;color:#374151">Tables servies : <strong>${p.tablesServed}</strong></p>
    <p style="margin:0;color:#9CA3AF;font-size:13px">Mode de répartition : ${esc(modeLabel)}</p>`
  return EMAIL_SHELL("Tes pourboires", p.restaurantName, body)
}

function renderOwnerRecapEmail(p: {
  restaurantName: string
  serviceDate: string
  totalTips: number
  kitchenShare: number
  mode: string
  distribution: { name: string; role: string; tablesServed: number; amountCents: number }[]
}): string {
  const modeLabel = TIP_MODE_LABEL_FR[p.mode] ?? p.mode
  const rows = p.distribution
    .map(
      (d) => `
      <tr>
        <td style="padding:8px 0;border-top:1px solid #E5E7EB">${esc(d.name)}</td>
        <td style="padding:8px 0;border-top:1px solid #E5E7EB;text-align:center;color:#374151">${d.tablesServed}</td>
        <td style="padding:8px 0;border-top:1px solid #E5E7EB;text-align:right;font-weight:700">${eur(d.amountCents)}</td>
      </tr>`,
    )
    .join("")
  const kitchenRow =
    p.kitchenShare > 0
      ? `<tr><td style="padding:8px 0;border-top:1px solid #E5E7EB;color:#374151">Cuisine</td><td style="padding:8px 0;border-top:1px solid #E5E7EB"></td><td style="padding:8px 0;border-top:1px solid #E5E7EB;text-align:right;font-weight:700">${eur(p.kitchenShare)}</td></tr>`
      : ""
  const body = `
    <p style="margin:0 0 16px">Répartition des pourboires du service du <strong>${esc(p.serviceDate)}</strong>.</p>
    <div style="background:#F4F4F5;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;justify-content:space-between">
      <span style="color:#9CA3AF;font-size:13px">Total collecté</span>
      <span style="font-size:18px;font-weight:800">${eur(p.totalTips)}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr>
        <th style="text-align:left;color:#9CA3AF;font-size:11px;text-transform:uppercase;padding-bottom:4px">Serveur</th>
        <th style="text-align:center;color:#9CA3AF;font-size:11px;text-transform:uppercase;padding-bottom:4px">Tables</th>
        <th style="text-align:right;color:#9CA3AF;font-size:11px;text-transform:uppercase;padding-bottom:4px">Montant</th>
      </tr></thead>
      <tbody>${rows}${kitchenRow}</tbody>
    </table>
    <p style="margin:16px 0 0;color:#9CA3AF;font-size:13px">Mode de répartition : ${esc(modeLabel)}</p>`
  return EMAIL_SHELL("Répartition des pourboires", p.restaurantName, body)
}

// getReportRecipients — emails des membres (par id) + emails owner/manager.
// internalQuery : appelée uniquement par l'action sendTipReport (pas exposée client).
export const getReportRecipients = internalQuery({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const restaurant = await ctx.db.get(restaurantId)
    const members = await ctx.db
      .query("members")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurantId))
      .collect()
    const emailByMember: Record<string, string> = {}
    const ownerEmails: string[] = []
    for (const m of members) {
      const email = m.email?.trim()
      if (!email) continue
      emailByMember[m._id as string] = email
      if ((m.role === "owner" || m.role === "manager") && m.status === "active") {
        ownerEmails.push(email)
      }
    }
    return {
      restaurantName: restaurant?.name ?? "votre restaurant",
      emailByMember,
      ownerEmails: [...new Set(ownerEmails)],
    }
  },
})

async function sendResendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Splitzy <noreply@splitzy.fr>", to, subject, html }),
    })
    if (res.ok) return true
    console.error("[Closures] Resend error:", res.status, await res.text())
    return false
  } catch (err) {
    console.error("[Closures] send threw:", err)
    return false
  }
}

export const sendTipReport = action({
  args: { restaurantId: v.id("restaurants"), serviceDate: v.string() },
  handler: async (
    ctx,
    { restaurantId, serviceDate },
  ): Promise<{
    sent: number
    failed: number
    skipped: number
    ownerSent: boolean
    emailDisabled?: boolean
    noTips?: boolean
  }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Non authentifié")

    // getTipDistribution re-vérifie l'accès owner/manager côté serveur.
    const dist = await ctx.runQuery(api.closures.getTipDistribution, { restaurantId, serviceDate })
    if (dist.totalTips <= 0) {
      return { sent: 0, failed: 0, skipped: 0, ownerSent: false, noTips: true }
    }

    const recip = await ctx.runQuery(internal.closures.getReportRecipients, { restaurantId })

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("[Closures] RESEND_API_KEY not set — rapport non envoyé")
      return { sent: 0, failed: 0, skipped: dist.distribution.length, ownerSent: false, emailDisabled: true }
    }

    // 1. Email individuel à chaque serveur éligible (amountCents > 0 + email connu).
    let sent = 0
    let failed = 0
    let skipped = 0
    for (const d of dist.distribution) {
      if (d.amountCents <= 0) continue
      const to = recip.emailByMember[d.memberId]
      if (!to) {
        skipped++
        continue
      }
      const ok = await sendResendEmail(
        apiKey,
        to,
        `Tes pourboires — ${recip.restaurantName} (${serviceDate})`,
        renderServerTipEmail({
          restaurantName: recip.restaurantName,
          serviceDate,
          name: d.name,
          amountCents: d.amountCents,
          tablesServed: d.tablesServed,
          mode: dist.mode,
        }),
      )
      if (ok) sent++
      else failed++
    }

    // 2. Récap complet à l'owner / aux managers (un seul email à plusieurs destinataires).
    let ownerSent = false
    if (recip.ownerEmails.length > 0) {
      ownerSent = await sendResendEmail(
        apiKey,
        recip.ownerEmails.join(", "),
        `Répartition des pourboires — ${serviceDate}`,
        renderOwnerRecapEmail({
          restaurantName: recip.restaurantName,
          serviceDate,
          totalTips: dist.totalTips,
          kitchenShare: dist.kitchenShare,
          mode: dist.mode,
          distribution: dist.distribution,
        }),
      )
    }

    return { sent, failed, skipped, ownerSent }
  },
})
