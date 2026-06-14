import { query, mutation, internalMutation, internalQuery, action } from "./_generated/server"
import { internal } from "./_generated/api"
import { v, ConvexError } from "convex/values"
import { requireRestaurantAccess } from "./authz"

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
    role: v.union(v.literal("gerant"), v.literal("manager"), v.literal("viewer")),
    token: v.string(),
    status: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("restaurantInvitations", args)
  },
})

// assertCanInvite — internalQuery appelée par l'action `create` (qui n'a pas
// ctx.db). Renvoie le rôle du caller pour ce restaurant : "owner" si
// propriétaire, sinon le rôle de sa ligne `members` active (owner/manager),
// sinon null (pas le droit d'inviter).
export const assertCanInvite = internalQuery({
  args: { restaurantId: v.id("restaurants"), clerkUserId: v.string() },
  handler: async (ctx, { restaurantId, clerkUserId }): Promise<"owner" | "manager" | null> => {
    const restaurant = await ctx.db.get(restaurantId)
    if (!restaurant) return null
    if (restaurant.clerkUserId && restaurant.clerkUserId === clerkUserId) return "owner"
    const members = await ctx.db
      .query("members")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId))
      .collect()
    const me = members.find(m => m.clerkUserId === clerkUserId && m.status === "active")
    if (!me) return null
    if (me.role === "owner") return "owner"
    if (me.role === "manager") return "manager"
    return null
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
    // Auth + appartenance owner/manager AVANT tout insert (une action n'a pas
    // ctx.db → on passe par l'internalQuery assertCanInvite).
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Non authentifié")
    const callerRole = await ctx.runQuery(internal.invitations.assertCanInvite, {
      restaurantId,
      clerkUserId: identity.subject,
    })
    if (!callerRole) throw new Error("Accès refusé")

    // Borne de rôle : rôles d'invitation valides + qui peut inviter quoi.
    // - Seul un owner peut inviter un "gerant".
    // - Un manager ne peut inviter que "manager" ou "viewer".
    if (role !== "gerant" && role !== "manager" && role !== "viewer") {
      throw new Error("Rôle d'invitation invalide")
    }
    if (role === "gerant" && callerRole !== "owner") {
      throw new Error("Seul le propriétaire peut inviter un gérant")
    }

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
    const isExpired = inv.status === "expired" || inv.expiresAt < Date.now()
    // Redacté : l'invité n'est pas connecté. Pas de token, restaurantId, ni _id.
    return {
      restaurantName: restaurant?.name ?? "ce restaurant",
      role: inv.role,
      email: inv.email,
      status: inv.status,
      isExpired,
    }
  },
})

// listByRestaurant — invitations d'un restaurant, plus récentes d'abord.
export const listByRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    await requireRestaurantAccess(ctx, restaurantId)
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
  args: {
    token: v.string(),
    // Prénom / nom Clerk de l'invité (passés par le front à l'acceptation) pour
    // afficher son vrai nom dans l'équipe plutôt qu'un libellé dérivé de l'email.
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, { token, firstName, lastName }) => {
    const identity = await ctx.auth.getUserIdentity()
    // Diagnostic prod : on logge l'identité complète pour voir ce que le JWT
    // Clerk transmet réellement (en particulier si le claim `email` est émis).
    // Visible via `npx convex logs`. À retirer une fois le template JWT stabilisé.
    console.log("[invitations.accept] identity:", JSON.stringify(identity))
    if (!identity) {
      // JWT Clerk non reçu côté Convex : template "convex" absent ou token pas
      // encore rafraîchi. ConvexError → le message remonte au client (un
      // `throw new Error` brut est masqué en "Server Error" en prod).
      throw new ConvexError("Session non authentifiée — reconnectez-vous puis réessayez.")
    }
    const clerkUserId = identity.subject

    const inv = await ctx.db
      .query("restaurantInvitations")
      .withIndex("by_token", q => q.eq("token", token))
      .first()
    // Messages distincts (et en ConvexError) pour diagnostiquer côté client.
    if (!inv) throw new ConvexError("Invitation introuvable.")
    if (inv.status !== "pending") throw new ConvexError("Invitation déjà acceptée ou annulée.")
    if (inv.expiresAt < Date.now()) throw new ConvexError("Invitation expirée.")

    // L'invitation est nominative. Défense en profondeur : SI le JWT fournit le
    // claim `email`, il doit correspondre à l'invité. S'il est absent (template
    // Clerk "convex" sans claim email), on n'échoue PAS : la possession du token
    // (secret, envoyé par email) + l'auth non usurpable via `identity.subject`
    // suffisent. Évite de bloquer toutes les invitations sur un détail de JWT.
    // SECURITY (Vuln 6) : l'invitation est nominative. Le claim email du JWT DOIT
    // être présent ET correspondre à l'invité. On n'accepte plus le contournement
    // "best-effort" (token + subject seuls) : un token intercepté/transféré ne doit
    // pas permettre à un compte tiers d'accepter. Le template JWT Clerk "convex"
    // émet le claim email sur les deux instances.
    const identityEmail = (identity.email ?? "").toLowerCase()
    if (!identityEmail) {
      throw new ConvexError(
        "Email manquant dans la session — reconnectez-vous. Si le problème persiste, " +
        'le template JWT Clerk "convex" doit émettre le claim email.',
      )
    }
    if (identityEmail !== inv.email.toLowerCase()) {
      throw new ConvexError("Cette invitation ne correspond pas à votre adresse.")
    }

    const memberRole = inviteRoleToMemberRole(inv.role)
    const now = Date.now()
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim()

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
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(fullName ? { name: fullName } : {}),
      })
    } else {
      await ctx.db.insert("members", {
        restaurantId: inv.restaurantId,
        email: inv.email,
        name: fullName || nameFromEmail(inv.email),
        firstName,
        lastName,
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
