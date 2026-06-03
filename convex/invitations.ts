import { query, mutation, internalMutation, action } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"

// ─────────────────────────────────────────────────────────────────────────────
// Invitations d'équipe (dashboard gérant).
//
// Flow : Paramètres → Équipe → « Inviter » envoie un email Resend avec un lien
// /restaurant/accept-invite?token=<uuid>. À l'acceptation (utilisateur Clerk
// connecté), on crée/active une ligne `members` et on passe l'invitation à
// 'accepted'.
//
// Pas de `"use node"` : l'action utilise `fetch` (dispo dans le runtime Convex
// par défaut) + l'API REST Resend — donc aucune dépendance npm à installer.
// ─────────────────────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Rôles d'invitation (gerant/manager/viewer) → rôles de la table `members`
// (owner/manager/staff, déjà utilisée par l'UI Équipe existante).
function inviteRoleToMemberRole(role: string): "owner" | "manager" | "staff" {
  if (role === "gerant") return "owner"
  if (role === "manager") return "manager"
  return "staff" // viewer (ou inconnu) → staff (lecture seule)
}

// Nom lisible dérivé de l'adresse email tant que le membre n'a pas de profil.
function nameFromEmail(email: string): string {
  const local = (email.split("@")[0] ?? "").replace(/[._-]+/g, " ").trim()
  if (!local) return email
  return local
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const ROLE_LABEL: Record<string, string> = {
  gerant: "Gérant",
  manager: "Manager",
  viewer: "Viewer",
}

function renderInviteEmail(opts: { restaurantName: string; role: string; token: string }): string {
  const name = escapeHtml(opts.restaurantName)
  const roleLabel = escapeHtml(ROLE_LABEL[opts.role] ?? opts.role)
  const link = `https://www.splitzy.fr/restaurant/accept-invite?token=${encodeURIComponent(opts.token)}`
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:8px">
  <h2 style="color:#E8920A;margin:0 0 16px">Splitzy</h2>
  <p style="color:#18181B;font-size:15px;line-height:1.6;margin:0 0 8px">
    Vous avez été invité(e) à rejoindre <strong>${name}</strong> en tant que <strong>${roleLabel}</strong>.
  </p>
  <a href="${link}"
     style="display:inline-block;background:#E8920A;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
    Accepter l'invitation →
  </a>
  <p style="color:#9CA3AF;font-size:12px;line-height:1.6;margin:8px 0 0">
    Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, ignorez cet email.
  </p>
</div>`
}

// insert — écrit l'invitation en base. Internal : seulement appelée par `create`.
export const insert = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    email: v.string(),
    role: v.string(),
    token: v.string(),
    status: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("restaurantInvitations", args)
  },
})

// create — génère un token, persiste l'invitation, envoie l'email Resend.
// Renvoie { token, emailSent } pour que le front puisse adapter le toast.
export const create = action({
  args: {
    restaurantId: v.id("restaurants"),
    email: v.string(),
    role: v.string(),
    restaurantName: v.string(),
  },
  handler: async (ctx, { restaurantId, email, role, restaurantName }): Promise<{ token: string; emailSent: boolean }> => {
    const token = crypto.randomUUID()
    const now = Date.now()

    await ctx.runMutation(internal.invitations.insert, {
      restaurantId,
      email: email.trim().toLowerCase(),
      role,
      token,
      status: "pending",
      createdAt: now,
      expiresAt: now + SEVEN_DAYS_MS,
    })

    let emailSent = false
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("[Invitations] RESEND_API_KEY not set — invitation créée sans email")
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
            to: email.trim(),
            subject: `Invitation à gérer ${restaurantName} sur Splitzy`,
            html: renderInviteEmail({ restaurantName, role, token }),
          }),
        })
        if (res.ok) {
          emailSent = true
        } else {
          console.error("[Invitations] Resend error:", res.status, await res.text())
        }
      } catch (err) {
        console.error("[Invitations] send threw:", err)
      }
    }

    return { token, emailSent }
  },
})

// getByToken — query publique (l'invité n'est pas forcément connecté).
// Renvoie l'invitation enrichie du nom du restaurant + un flag d'expiration.
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const inv = await ctx.db
      .query("restaurantInvitations")
      .withIndex("by_token", q => q.eq("token", token))
      .first()
    if (!inv) return null
    const restaurant = await ctx.db.get(inv.restaurantId)
    return {
      ...inv,
      restaurantName: restaurant?.name ?? "ce restaurant",
      isExpired: inv.status === "expired" || inv.expiresAt < Date.now(),
    }
  },
})

// listByRestaurant — invitations d'un restaurant, plus récentes d'abord.
export const listByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const invitations = await ctx.db
      .query("restaurantInvitations")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    return invitations.sort((a, b) => b.createdAt - a.createdAt)
  },
})

// accept — appelée après login Clerk. Valide le token + l'expiration, crée ou
// réactive la ligne `members` correspondante, passe l'invitation à 'accepted'.
export const accept = mutation({
  args: { token: v.string(), clerkUserId: v.string() },
  handler: async (ctx, { token, clerkUserId }) => {
    const inv = await ctx.db
      .query("restaurantInvitations")
      .withIndex("by_token", q => q.eq("token", token))
      .first()
    if (!inv || inv.status !== "pending" || inv.expiresAt < Date.now()) {
      throw new Error("Invitation invalide ou expirée")
    }

    const memberRole = inviteRoleToMemberRole(inv.role)
    const now = Date.now()

    // Réutilise une éventuelle ligne `members` déjà créée pour cet email
    // (même restaurant) plutôt que de créer un doublon.
    const existing = (
      await ctx.db
        .query("members")
        .withIndex("by_restaurant", q => q.eq("restaurantId", inv.restaurantId))
        .collect()
    ).find(m => m.email.toLowerCase() === inv.email.toLowerCase())

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: memberRole,
        status: "active",
        joinedAt: now,
        clerkUserId,
      })
    } else {
      await ctx.db.insert("members", {
        restaurantId: inv.restaurantId,
        email: inv.email,
        name: nameFromEmail(inv.email),
        role: memberRole,
        status: "active",
        invitedAt: inv.createdAt,
        joinedAt: now,
        clerkUserId,
      })
    }

    await ctx.db.patch(inv._id, { status: "accepted" })
    return { restaurantId: inv.restaurantId }
  },
})
