import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { Check, X, Mail, LogIn } from 'lucide-react'
import { api } from '../../../convex/_generated/api'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

const ROLE_LABEL: Record<string, string> = {
  gerant: 'Gérant', manager: 'Manager', viewer: 'Viewer',
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <div className="text-3xl font-black tracking-tight text-dark mb-1">
          Split<span className="text-brand">zy</span>
        </div>
        <div className="text-sm text-muted">Interface gérant</div>
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card border border-border p-7">
        {children}
      </div>
    </div>
  )
}

export function AcceptInvite() {
  // Sans Clerk configuré on ne peut pas authentifier l'invité — on l'envoie
  // vers la connexion. (Évite d'appeler les hooks Clerk sans ClerkProvider.)
  if (!clerkReady) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-bg flex items-center justify-center">
            <LogIn className="text-brand" size={22} />
          </div>
          <div className="text-lg font-bold text-dark">Connexion requise</div>
          <p className="text-sm text-muted">Connectez-vous pour accepter votre invitation.</p>
          <Link
            to="/restaurant/sign-in"
            className="mt-2 inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </Shell>
    )
  }
  return <AcceptInviteInner />
}

function AcceptInviteInner() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()

  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const invitation = useQuery(api.invitations.getByToken, token ? { token } : 'skip')
  const accept = useMutation(api.invitations.accept)

  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoAcceptDone = useRef(false)

  const signInHref = `/restaurant/sign-in?redirect=${encodeURIComponent(`/restaurant/accept-invite?token=${token}`)}`

  // Auto-acceptation : dès que l'invité est connecté ET que l'invitation est
  // valide (pending, non expirée), on appelle `accept` au montage — sans bouton.
  // C'est le chemin nominal après un retour de Clerk (cf. PendingInviteWatcher
  // dans RestaurantApp qui ramène ici via le token stocké en sessionStorage).
  useEffect(() => {
    if (autoAcceptDone.current) return
    if (!authLoaded || !isSignedIn || !user || !token) return
    if (!invitation) return // undefined (chargement) ou null (introuvable)
    if (invitation.status !== 'pending' || invitation.isExpired) return

    autoAcceptDone.current = true
    setAccepting(true)
    setError(null)
    accept({ token })
      .then(() => navigate('/restaurant', { replace: true }))
      .catch(() => {
        autoAcceptDone.current = false
        setError('Cette invitation est invalide ou expirée.')
        setAccepting(false)
      })
  }, [authLoaded, isSignedIn, user, token, invitation, accept, navigate])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!token || invitation === undefined || !authLoaded) {
    if (!token) {
      return (
        <Shell>
          <ErrorBlock
            title="Lien invalide"
            message="Aucun token d'invitation trouvé dans le lien."
          />
        </Shell>
      )
    }
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Vérification de l'invitation…</span>
        </div>
      </Shell>
    )
  }

  // ── Invalid / not found ─────────────────────────────────────────────────
  if (invitation === null) {
    return (
      <Shell>
        <ErrorBlock
          title="Invitation introuvable"
          message="Ce lien d'invitation n'existe pas ou a été supprimé."
        />
      </Shell>
    )
  }

  // ── Already accepted ─────────────────────────────────────────────────────
  if (invitation.status === 'accepted') {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="text-green-600" size={24} />
          </div>
          <div className="text-lg font-bold text-dark">Invitation déjà acceptée</div>
          <p className="text-sm text-muted">Vous faites déjà partie de l'équipe de {invitation.restaurantName}.</p>
          <Link
            to="/restaurant"
            className="mt-2 inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
          >
            Aller au dashboard
          </Link>
        </div>
      </Shell>
    )
  }

  // ── Expired ──────────────────────────────────────────────────────────────
  if (invitation.isExpired) {
    return (
      <Shell>
        <ErrorBlock
          title="Invitation expirée"
          message="Ce lien a expiré. Demandez au gérant de vous renvoyer une invitation."
        />
      </Shell>
    )
  }

  // ── Valid & pending ────────────────────────────────────────────────────────
  const roleLabel = ROLE_LABEL[invitation.role] ?? invitation.role

  async function handleAccept() {
    if (!user) return
    setAccepting(true)
    setError(null)
    try {
      await accept({ token })
      navigate('/restaurant', { replace: true })
    } catch {
      setError('Cette invitation est invalide ou expirée.')
      setAccepting(false)
    }
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-brand-bg flex items-center justify-center">
          <Mail className="text-brand" size={22} />
        </div>
        <div className="text-lg font-bold text-dark">Vous êtes invité(e)</div>
        <p className="text-sm text-muted">
          Rejoignez <strong className="text-dark">{invitation.restaurantName}</strong> sur Splitzy en tant que
        </p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold bg-brand-bg text-brand border border-brand/20">
          {roleLabel}
        </span>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mt-2">
            {error}
          </div>
        )}

        {isSignedIn ? (
          error ? (
            // L'auto-acceptation a échoué → bouton de réessai manuel.
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {accepting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Acceptation…</>
                : <><Check size={16} /> Réessayer</>}
            </button>
          ) : (
            // Chemin nominal : connecté → on accepte automatiquement (effet ci-dessus).
            <div className="mt-3 inline-flex items-center justify-center gap-2 text-sm text-muted">
              <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              Ajout à votre équipe…
            </div>
          )
        ) : (
          <>
            <button
              onClick={() => {
                // Stocke le token AVANT la redirection Clerk : il survit à tout le
                // flow sign-up/verify (même onglet) même si Clerk ne préserve pas
                // le query param `redirect`. Récupéré par PendingInviteWatcher.
                if (token) sessionStorage.setItem('pendingInviteToken', token)
                navigate(signInHref)
              }}
              className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
            >
              <LogIn size={16} /> Se connecter pour accepter
            </button>
            <p className="text-[11.5px] text-muted">
              Connectez-vous avec l'adresse <strong>{invitation.email}</strong>.
            </p>
          </>
        )}
      </div>
    </Shell>
  )
}

function ErrorBlock({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <X className="text-red-600" size={24} />
      </div>
      <div className="text-lg font-bold text-dark">{title}</div>
      <p className="text-sm text-muted">{message}</p>
      <Link
        to="/restaurant/sign-in"
        className="mt-2 inline-flex items-center justify-center w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-dark hover:bg-bg transition-colors"
      >
        Retour à la connexion
      </Link>
    </div>
  )
}
