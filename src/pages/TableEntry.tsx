import { useEffect } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useSession } from '../context/SessionContext'
import { TABLE_TOTAL_CENTS } from '../data/session'

export function TableEntry() {
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber: string }>()
  const navigate = useNavigate()
  const { dispatch } = useSession()
  const updateStatus = useMutation(api.tables.updateStatus)

  const context = useQuery(api.restaurants.getTableContext, {
    slug: slug ?? '',
    tableNumber: Number(tableNumber ?? 0),
  })

  useEffect(() => {
    if (context === undefined) return // still loading
    if (!context) return // handled below with error UI
    if (context.restaurant.suspended) return // handled below with suspended UI

    // flushSync commits the dispatch before navigate fires, preventing
    // ConsumerAppGuard from seeing restaurantName = '' at the new '/' path
    flushSync(() => {
      dispatch({
        type: 'SET_TABLE_CONTEXT',
        payload: {
          restaurantName: context.restaurant.name,
          tableNumber: context.table?.number ?? Number(tableNumber),
          tableCapacity: context.table?.capacity ?? 4,
          convexRestaurantId: context.restaurant._id,
          convexTableId: context.table?._id ?? null,
          tableTotalCents: context.table?.amountCents ?? TABLE_TOTAL_CENTS,
        },
      })
    })
    if (context.table?._id) {
      updateStatus({ tableId: context.table._id, status: 'dining', guests: context.table.capacity }).catch(() => {})
    }
    navigate('/welcome', { replace: true })
  }, [context])

  // Loading
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

  // Restaurant not found
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

  // Suspended
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

  // Redirecting (context loaded, navigate in progress)
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
