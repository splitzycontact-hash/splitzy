import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { Topbar } from '../layout/Topbar'
import { FEEDBACKS } from '../data/mockData'
import type { FeedbackItem } from '../data/mockData'
import { useRestaurantId } from '../../hooks/useRestaurant'

type FilterKey = 'all' | 'new' | 'negative' | 'positive' | 'unanswered'

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: 'all',        label: 'Tous' },
  { key: 'new',        label: 'Nouveaux' },
  { key: 'negative',   label: 'Négatifs' },
  { key: 'positive',   label: 'Positifs' },
  { key: 'unanswered', label: 'Sans réponse' },
]

function Stars({ count }: { count: number }) {
  return (
    <span>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < count ? 'text-yellow-400' : 'text-gray-200'}>★</span>
      ))}
    </span>
  )
}

function borderColor(fb: FeedbackItem) {
  if (fb.isNew && fb.stars <= 3) return 'border-l-error'
  if (fb.stars >= 4) return 'border-l-success'
  return 'border-l-brand'
}

function applyFilter(items: FeedbackItem[], filter: FilterKey): FeedbackItem[] {
  switch (filter) {
    case 'new':        return items.filter((f) => f.isNew)
    case 'negative':   return items.filter((f) => f.stars <= 3)
    case 'positive':   return items.filter((f) => f.stars >= 4)
    case 'unanswered': return items.filter((f) => f.isNew)
    default:           return items
  }
}

export function Feedbacks() {
  const [filter, setFilter] = useState<FilterKey>('all')

  const restaurantId = useRestaurantId()
  const rawFeedbacks = useQuery(api.feedbacks.list, restaurantId ? { restaurantId } : "skip")
  const markAllRead = useMutation(api.feedbacks.markAllRead)

  // Mark all feedbacks as read when the page is opened
  const markedRef = useRef(false)
  useEffect(() => {
    if (!restaurantId || markedRef.current) return
    markedRef.current = true
    markAllRead({ restaurantId })
  }, [restaurantId])

  type ConvexFeedback = { stars: number; tableNumber: number; timeLabel: string; isNew: boolean; text: string; tags: string[] }

  // Map Convex feedbacks to local FeedbackItem shape, or fall back to mocks
  const feedbackItems: FeedbackItem[] = rawFeedbacks
    ? (rawFeedbacks as ConvexFeedback[]).map((fb, i) => ({
        id: i,
        stars: fb.stars,
        tableId: fb.tableNumber,
        timeLabel: fb.timeLabel,
        isNew: fb.isNew,
        text: fb.text,
        tags: fb.tags,
      }))
    : FEEDBACKS

  const filtered = applyFilter(feedbackItems, filter)

  const totalCount = feedbackItems.length
  const newCount = feedbackItems.filter(f => f.isNew).length

  // Compute star distribution from actual data
  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: feedbackItems.filter(f => f.stars === s).length,
    pct: totalCount > 0 ? Math.round(feedbackItems.filter(f => f.stars === s).length / totalCount * 100) : 0,
  }))

  return (
    <RestaurantLayout>
      <Topbar
        title="Feedbacks matin"
        subtitle="Récap du service · hier soir"
      />
      <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6 space-y-5">
        {/* Hero */}
        <div
          className="rounded-2xl p-6 flex items-center gap-5"
          style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #3a1800 100%)' }}
        >
          <span className="text-4xl">☀️</span>
          <div>
            <div className="text-white font-bold text-xl">Feedbacks du jour</div>
            <div className="text-white/60 text-sm mt-0.5 flex items-center gap-3">
              {totalCount} messages
              {newCount > 0 && (
                <span className="bg-brand text-white text-xs font-bold rounded-full px-2.5 py-0.5">{newCount} nouveaux</span>
              )}
            </div>
          </div>
        </div>

        {/* Row: Filtres + Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-sm font-bold text-dark mb-3">Filtrer</div>
            <div className="flex flex-wrap gap-2">
              {FILTER_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`text-sm font-medium rounded-lg px-3 py-1.5 border transition-colors ${
                    filter === key
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-mid border-border hover:bg-bg'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-card p-5">
            <div className="text-sm font-bold text-dark mb-3">Distribution des notes</div>
            <div className="space-y-2">
              {starCounts.map(({ stars, count, pct }) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-xs text-muted w-6 text-right">{stars}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-brand h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted w-4">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feedback list */}
        <div className="space-y-3">
          {filtered.map((fb) => (
            <div
              key={fb.id}
              className={`bg-white rounded-xl border border-border shadow-card p-5 border-l-4 ${borderColor(fb)}`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Stars count={fb.stars} />
                  <span className="text-sm font-semibold text-dark">Table {fb.tableId}</span>
                  <span className="text-xs text-muted">{fb.timeLabel}</span>
                  {fb.isNew && (
                    <span className="text-xs bg-error text-white font-bold rounded-full px-2 py-0.5">NOUVEAU</span>
                  )}
                </div>
                {fb.stars <= 3 && (
                  <button className="text-sm font-semibold text-brand hover:text-brand-dark transition-colors shrink-0">
                    Répondre →
                  </button>
                )}
              </div>
              <p className="text-sm text-mid leading-relaxed mb-3">« {fb.text} »</p>
              <div className="flex flex-wrap gap-2">
                {fb.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-bg border border-border rounded-full px-2.5 py-1 text-mid">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted text-sm">Aucun feedback pour ce filtre.</div>
          )}
        </div>
      </main>
    </RestaurantLayout>
  )
}
