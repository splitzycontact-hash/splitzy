import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { TABLE_TOTAL_CENTS } from '../data/session'
import { httpMutation } from '../utils/convexHttp'

declare global {
  interface Window {
    __tableBootstrap?: Promise<unknown>
  }
}

// Shape renvoyée par restaurants:getTableContext
type HttpCtx = {
  restaurant: {
    _id: string
    name: string
    slug: string
    suspended?: boolean
  }
  table: {
    _id: string
    number: number
    capacity?: number
    amountCents?: number
    orderItems?: { name: string; qty: number; unitCents: number; paid?: boolean }[]
    paidCents?: number
  } | null
} | null

type LoadState =
  | 'loading'
  | 'invalid_url'
  | 'not_found'
  | 'suspended'
  | 'no_table'
  | 'fetch_error'
  | 'navigating'

function isCtxShape(v: unknown): v is NonNullable<HttpCtx> {
  return !!v && typeof v === 'object'
    && 'restaurant' in (v as object) && 'table' in (v as object)
}

async function fetchTableContext(slug: string, tableNumber: number): Promise<HttpCtx> {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined
  if (!url) throw new Error('VITE_CONVEX_URL manquant')
  const base = url.replace(/^wss?:\/\//, 'https://')

  const res = await fetch(`${base}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: 'restaurants:getTableContext',
      format: 'json',
      args: [{ slug, tableNumber }],
    }),
  })
  if (!res.ok) throw new Error(`getTableContext HTTP ${res.status}`)

  const data = await res.json() as
    | { status: 'success'; value: HttpCtx }
    | { status: 'error'; errorMessage: string }

  if (data.status !== 'success') {
    throw new Error(data.errorMessage || 'getTableContext error')
  }
  return data.value
}

export function TableEntry() {
  const { slug, tableNumber: rawTableNumber } = useParams<{ slug: string; tableNumber: string }>()
  const navigate = useNavigate()
  const { dispatch } = useSession()

  // Validation explicite des params URL avant tout fetch — pas de return silencieux.
  const tableNumberInt = rawTableNumber ? Number(rawTableNumber) : NaN
  const paramsValid = !!slug && Number.isFinite(tableNumberInt) && tableNumberInt > 0

  const [loadState, setLoadState] = useState<LoadState>(paramsValid ? 'loading' : 'invalid_url')
  const [retryKey, setRetryKey] = useState(0)

  // Verrou : empêche le double-dispatch en StrictMode ou re-renders rapides.
  const navigated = useRef(false)

  useEffect(() => {
    if (!paramsValid) {
      console.error('[TableEntry] URL params invalides', { slug, rawTableNumber })
      setLoadState('invalid_url')
      return
    }

    navigated.current = false
    setLoadState('loading')
    let cancelled = false

    const handleCtx = (ctx: HttpCtx) => {
      if (cancelled || navigated.current) return

      if (!ctx) { setLoadState('not_found'); return }
      if (ctx.restaurant.slug !== slug) {
        console.error('[TableEntry] slug mismatch', { expected: slug, got: ctx.restaurant.slug })
        setLoadState('not_found'); return
      }
      if (ctx.restaurant.suspended) { setLoadState('suspended'); return }
      if (!ctx.table) { setLoadState('no_table'); return }

      navigated.current = true
      setLoadState('navigating')

      flushSync(() => {
        dispatch({
          type: 'SET_TABLE_CONTEXT',
          payload: {
            restaurantName: ctx.restaurant.name,
            tableNumber: ctx.table!.number,
            tableCapacity: ctx.table!.capacity ?? 4,
            convexRestaurantId: ctx.restaurant._id,
            convexTableId: ctx.table!._id,
            tableTotalCents: ctx.table!.amountCents ?? TABLE_TOTAL_CENTS,
            cachedOrderItems: ctx.table!.orderItems ?? [],
            cachedPaidCents: ctx.table!.paidCents ?? 0,
          },
        })
      })

      void httpMutation('tables:updateStatus', {
        tableId: ctx.table!._id,
        status: 'dining',
        guests: ctx.table!.capacity ?? 4,
      }).catch(err => console.error('[TableEntry] updateStatus failed', err))

      // /welcome est l'écran d'entrée consumer (Landing). /items est protégée
      // par ProtectedRoute (userName non vide) → naviguer dessus directement
      // déclenche un Navigate('/welcome') replace qui peut s'enchaîner mal.
      navigate('/welcome', { replace: true })
    }

    const handleError = (err: unknown) => {
      if (cancelled) return
      console.error('[TableEntry] fetch getTableContext failed', err)
      setLoadState('fetch_error')
    }

    async function run() {
      try {
        let ctx: HttpCtx = null

        // 1) Bootstrap HTTP lancé depuis index.html AVANT le mount React.
        //    Sur la 1ère ouverture, il est probablement déjà résolu → instantané.
        //    Au retry (retryKey > 0), on l'ignore pour forcer un fetch frais.
        const bootstrap = retryKey === 0 && typeof window !== 'undefined'
          ? window.__tableBootstrap
          : undefined

        if (bootstrap) {
          try {
            const v = await bootstrap
            if (isCtxShape(v)) ctx = v as HttpCtx
            // Si v === null → bootstrap a échoué ou retourné null (restaurant
            // pas trouvé ou erreur Convex). On tombe sur le fetch fallback.
          } catch (e) {
            console.warn('[TableEntry] bootstrap rejected', e)
          }
        }

        // 2) Pas de bootstrap exploitable → fetch direct (avec une 2ᵉ tentative
        //    après 1s en cas de cold start réseau).
        if (!ctx) {
          try {
            ctx = await fetchTableContext(slug!, tableNumberInt)
          } catch (err1) {
            console.warn('[TableEntry] 1st fetch failed, retrying', err1)
            await new Promise(r => setTimeout(r, 1000))
            if (cancelled) return
            ctx = await fetchTableContext(slug!, tableNumberInt)
          }
        }

        if (cancelled) return
        handleCtx(ctx)
      } catch (err) {
        handleError(err)
      }
    }

    void run()

    return () => { cancelled = true }
  }, [retryKey, paramsValid, slug, rawTableNumber, tableNumberInt, dispatch, navigate])

  function handleRetry() {
    setRetryKey(k => k + 1)
  }

  // ─── URL invalide ─────────────────────────────────────────────────────────
  if (loadState === 'invalid_url') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-2xl font-black tracking-tight" style={{ color: '#18181B' }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">❓</div>
        <div>
          <div className="text-base font-bold text-dark">QR code invalide</div>
          <div className="text-sm text-muted mt-1">L'adresse de cette page est incomplète.</div>
          <div className="text-xs text-muted mt-1">Re-scannez le QR code de votre table.</div>
        </div>
      </div>
    )
  }

  // ─── Restaurant introuvable ───────────────────────────────────────────────
  if (loadState === 'not_found') {
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

  // ─── Restaurant suspendu ──────────────────────────────────────────────────
  if (loadState === 'suspended') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-2xl font-black tracking-tight" style={{ color: '#18181B' }}>
          Split<span style={{ color: '#E8920A' }}>zy</span>
        </div>
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">🔒</div>
        <div>
          <div className="text-base font-bold text-dark">Restaurant temporairement fermé</div>
          <div className="text-sm text-muted mt-1">Revenez plus tard ou contactez l'établissement.</div>
        </div>
      </div>
    )
  }

  // ─── Table non configurée ─────────────────────────────────────────────────
  if (loadState === 'no_table') {
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

  // ─── Erreur réseau (fetch a fail 2 fois) ──────────────────────────────────
  if (loadState === 'fetch_error') {
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

  // ─── Spinner — loading ou navigating ────────────────────────────────────
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
