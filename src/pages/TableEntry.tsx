import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useSession } from '../context/SessionContext'

export function TableEntry() {
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber: string }>()
  const navigate = useNavigate()
  const { dispatch } = useSession()

  const context = useQuery(api.restaurants.getTableContext, {
    slug: slug ?? '',
    tableNumber: Number(tableNumber ?? 0),
  })

  useEffect(() => {
    if (context === undefined) return // still loading

    if (!context) {
      // Restaurant or table not found — go to landing anyway
      navigate('/', { replace: true })
      return
    }

    dispatch({
      type: 'SET_TABLE_CONTEXT',
      payload: {
        restaurantName: context.restaurant.name,
        tableNumber: context.table?.number ?? Number(tableNumber),
        tableCapacity: context.table?.capacity ?? 4,
        convexRestaurantId: context.restaurant._id,
        convexTableId: context.table?._id ?? null,
      },
    })
    navigate('/', { replace: true })
  }, [context])

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
