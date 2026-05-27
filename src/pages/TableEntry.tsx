import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { TABLE_TOTAL_CENTS } from '../data/session'
import { httpMutation } from '../utils/convexHttp'

// Shape renvoyée par restaurants:getTableContext via HTTP Convex
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

type LoadState = 'loading' | 'not_found' | 'suspended' | 'no_table' | 'navigating'

export function TableEntry() {
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber: string }>()
  const navigate = useNavigate()
  const { dispatch } = useSession()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [timedOut, setTimedOut] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Verrou : empêche le double-dispatch en StrictMode ou sur re-renders rapides.
  const navigated = useRef(false)

  useEffect(() => {
    if (!slug || !tableNumber) return
    navigated.current = false
    setLoadState('loading')
    setTimedOut(false)

    const timeoutId = setTimeout(() => setTimedOut(true), 20_000)
    let cancelled = false

    // Fetch HTTP direct vers l'API Convex — pas de WebSocket.
    // Sur iOS Safari le WebSocket prend 15-30s à s'établir ; le HTTP répond en < 1s.
    const convexUrl = (import.meta.env.VITE_CONVEX_URL as string)
      .replace(/^wss?:\/\//, 'https://')

    fetch(`${convexUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'restaurants:getTableContext',
        format: 'json',
        args: [{ slug, tableNumber: Number(tableNumber) }],
      }),
    })
      .then(r => r.json())
      .then((res: { value?: HttpCtx }) => {
        if (cancelled || navigated.current) return
        clearTimeout(timeoutId)

        const ctx = res?.value

        if (!ctx) { setLoadState('not_found'); return }
        if (ctx.restaurant.slug !== slug) { setLoadState('not_found'); return }
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
        }).catch(() => {})

        navigate('/items', { replace: true })
      })
      .catch(() => {
        if (cancelled) return
        clearTimeout(timeoutId)
        setTimedOut(true)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [retryKey, slug, tableNumber])

  function handleRetry() {
    setRetryKey(k => k + 1)
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
      </div>
    )
  }

  // ─── Erreur réseau après 20s ──────────────────────────────────────────────
  if (timedOut) {
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
