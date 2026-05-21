import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useSession } from '../context/SessionContext'
import { TABLE_TOTAL_CENTS } from '../data/session'

declare global {
  interface Window {
    __tableBootstrap?: Promise<unknown>
  }
}

type LiveContext = ReturnType<typeof useQuery<typeof api.restaurants.getTableContext>>
type Bootstrap = NonNullable<LiveContext> | null

function isBootstrap(v: unknown): v is NonNullable<Bootstrap> {
  return !!v && typeof v === 'object' && 'restaurant' in (v as object) && 'table' in (v as object)
}

export function TableEntry() {
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber: string }>()
  const navigate = useNavigate()
  const { dispatch } = useSession()
  const updateStatus = useMutation(api.tables.updateStatus)
  const [timedOut, setTimedOut] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [bootstrap, setBootstrap] = useState<NonNullable<Bootstrap> | null | undefined>(undefined)

  // Ref utilisé comme verrou : empêche le double-fire de l'effet en StrictMode
  // et sur les re-renders entre le dispatch et la navigation.
  const navigated = useRef(false)

  // Lit la pré-requête HTTP lancée depuis index.html avant même que le bundle
  // ne soit parsé. Court-circuite le cold start WebSocket Safari iOS.
  useEffect(() => {
    const promise = typeof window !== 'undefined' ? window.__tableBootstrap : undefined
    if (!promise) {
      setBootstrap(null)
      return
    }
    let cancelled = false
    promise.then(value => {
      if (cancelled) return
      setBootstrap(isBootstrap(value) ? (value as NonNullable<Bootstrap>) : null)
    })
    return () => { cancelled = true }
  }, [retryKey])

  const liveContext = useQuery(api.restaurants.getTableContext, {
    slug: slug ?? '',
    tableNumber: Number(tableNumber ?? 0),
  })

  // Priorité au résultat WebSocket (source de vérité, réactive).
  // Sinon, utilise le bootstrap HTTP s'il a renvoyé une donnée exploitable.
  // Si le bootstrap a fini sans donnée (null) ou échoué, on attend la WS comme avant.
  const context: LiveContext =
    liveContext !== undefined
      ? liveContext
      : (bootstrap && isBootstrap(bootstrap) ? bootstrap : undefined)

  // Countdown 20s. retryKey redémarre le timer sans reload complet.
  // Toutes les UI d'attente/erreur restent sur /t/:slug/:tableNumber.
  useEffect(() => {
    if (context !== undefined) return
    setTimedOut(false)
    const id = setTimeout(() => setTimedOut(true), 20_000)
    return () => clearTimeout(id)
  }, [context, retryKey])

  // Navigation vers /welcome — point unique de sortie de ce composant.
  // Conditions nécessaires avant de naviguer :
  //   1. context est défini (Convex a répondu)
  //   2. context n'est pas null (restaurant existe)
  //   3. restaurant.slug correspond à l'URL (pas de donnée cachée périmée)
  //   4. table existe dans Convex (sinon le flow de paiement n'a pas de convexTableId)
  //   5. restaurant non suspendu
  useEffect(() => {
    if (context === undefined) return
    if (!context) return
    if (context.restaurant.slug !== slug) return
    if (!context.table) return
    if (context.restaurant.suspended) return
    if (navigated.current) return

    navigated.current = true

    // flushSync garantit que le SessionContext est à jour avant que
    // react-router démonte ce composant et monte Landing.
    flushSync(() => {
      dispatch({
        type: 'SET_TABLE_CONTEXT',
        payload: {
          restaurantName: context.restaurant.name,
          tableNumber: context.table!.number,
          tableCapacity: context.table!.capacity ?? 4,
          convexRestaurantId: context.restaurant._id,
          convexTableId: context.table!._id,
          tableTotalCents: context.table!.amountCents ?? TABLE_TOTAL_CENTS,
        },
      })
    })

    updateStatus({
      tableId: context.table!._id,
      status: 'dining',
      guests: context.table!.capacity,
    }).catch(() => {})

    navigate('/welcome', { replace: true })
  }, [context])

  function handleRetry() {
    setTimedOut(false)
    setRetryKey(k => k + 1)
  }

  // ─── Erreur après 20s ────────────────────────────────────────────────────
  // L'URL reste /t/:slug/:tableNumber — un refresh relance le chargement.
  if (context === undefined && timedOut) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-2xl font-black tracking-tight" style={{ color: '#18181B' }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">📡</div>
        <div>
          <div className="text-base font-bold text-dark">Problème de connexion</div>
          <div className="text-sm text-muted mt-1">Vérifiez votre connexion internet et réessayez.</div>
        </div>
        <button
          type="button"
          onClick={handleRetry}
          style={{
            padding: '12px 28px', borderRadius: 12, border: 0,
            background: '#E8920A', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  // ─── Spinner — affiché pendant les 20s sur /t/:slug/:tableNumber ─────────
  if (context === undefined) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3">
        <div className="text-2xl font-black tracking-tight" style={{ color: '#18181B' }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div className="w-6 h-6 border-2 border-[#E8920A] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-400">Chargement de votre table…</span>
      </div>
    )
  }

  // ─── Restaurant introuvable ───────────────────────────────────────────────
  if (!context) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-2xl font-black tracking-tight" style={{ color: '#18181B' }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">🔍</div>
        <div>
          <div className="text-base font-bold text-dark">Restaurant introuvable</div>
          <div className="text-sm text-muted mt-1">Ce QR code n'est pas associé à un établissement actif.</div>
          <div className="text-xs text-muted mt-1">Vérifiez que vous scannez le bon QR code.</div>
        </div>
      </div>
    )
  }

  // ─── Restaurant suspendu ──────────────────────────────────────────────────
  if (context.restaurant.suspended) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-2xl font-black tracking-tight" style={{ color: '#18181B' }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">🔒</div>
        <div>
          <div className="text-base font-bold text-dark">{context.restaurant.name}</div>
          <div className="text-sm text-muted mt-1">Ce restaurant est temporairement fermé.</div>
          <div className="text-xs text-muted mt-1">Revenez plus tard ou contactez l'établissement.</div>
        </div>
      </div>
    )
  }

  // ─── Table non configurée ─────────────────────────────────────────────────
  if (!context.table) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-2xl font-black tracking-tight" style={{ color: '#18181B' }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">🪑</div>
        <div>
          <div className="text-base font-bold text-dark">Table introuvable</div>
          <div className="text-sm text-muted mt-1">Cette table n'est pas encore configurée.</div>
          <div className="text-xs text-muted mt-1">Demandez au serveur de scanner le QR code.</div>
        </div>
      </div>
    )
  }

  // ─── Navigation en cours (données prêtes, transition vers /welcome) ───────
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3">
      <div className="text-2xl font-black tracking-tight" style={{ color: '#18181B' }}>
        Split<span style={{ color: '#E8920A' }}>zy</span>
      </div>
      <div className="w-6 h-6 border-2 border-[#E8920A] border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-400">Chargement de votre table…</span>
    </div>
  )
}
