import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useRestaurantId } from '../context/RestaurantContext'
import { Star, Shield, MessageSquare, Sparkles, RefreshCw } from 'lucide-react'

function timeAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24))
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'il y a 1 jour'
  return `il y a ${days} jours`
}

type FilterKey = 'all' | 'neg' | 'pos' | 'neu' | 'week'

type Feedback = {
  _id: string
  tableNumber: number
  stars: number
  tags: string[]
  text: string
  isNew: boolean
  timeLabel: string
  createdAt: number
}

function StarRating({ count, size = 13 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex gap-px">
      {[0, 1, 2, 3, 4].map(i => (
        <Star
          key={i}
          size={size}
          fill={i < count ? '#E8920A' : 'none'}
          stroke={i < count ? '#E8920A' : 'var(--ds-border-strong)'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

export function Reputation() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const restaurantId = useRestaurantId()
  const rawFeedbacks = useQuery(api.feedbacks.list, restaurantId ? { restaurantId } : 'skip')
  const markAllRead = useMutation(api.feedbacks.markAllRead)

  const latestInsightsDoc = useQuery(api.insights.getLatestInsights, restaurantId ? { restaurantId } : 'skip')
  const generateInsights = useAction(api.actions.generateInsights.generateInsightsForRestaurant)
  const [generating, setGenerating] = useState(false)

  const reputationInsight = latestInsightsDoc?.insights.find(i => i.type === 'reputation') ?? null

  async function handleGenerate() {
    if (!restaurantId || generating) return
    setGenerating(true)
    try {
      await generateInsights({ restaurantId })
    } finally {
      setGenerating(false)
    }
  }

  const markedRef = useRef(false)
  useEffect(() => {
    if (!restaurantId || markedRef.current) return
    markedRef.current = true
    markAllRead({ restaurantId }).catch(() => {})
  }, [restaurantId, markAllRead])

  const feedbacks = (rawFeedbacks as Feedback[] | undefined) ?? []
  const loading = rawFeedbacks === undefined

  const total = feedbacks.length
  const avg = total > 0 ? feedbacks.reduce((s, f) => s + f.stars, 0) / total : 0
  const negCount = feedbacks.filter(f => f.stars <= 2).length
  const posCount = feedbacks.filter(f => f.stars >= 4).length
  const neuCount = feedbacks.filter(f => f.stars === 3).length
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weekCount = feedbacks.filter(f => f.createdAt >= oneWeekAgo).length

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',  label: 'Tous',          count: total    },
    { key: 'neg',  label: 'Négatifs',      count: negCount },
    { key: 'pos',  label: 'Positifs',      count: posCount },
    { key: 'neu',  label: 'Neutres',       count: neuCount },
    { key: 'week', label: 'Cette semaine', count: weekCount },
  ]

  const filtered = (() => {
    if (filter === 'neg')  return feedbacks.filter(f => f.stars <= 2)
    if (filter === 'pos')  return feedbacks.filter(f => f.stars >= 4)
    if (filter === 'neu')  return feedbacks.filter(f => f.stars === 3)
    if (filter === 'week') return feedbacks.filter(f => f.createdAt >= oneWeekAgo)
    return feedbacks
  })()

  return (
    <RestaurantLayout>
      <PageHeader
        title="Réputation"
        subtitle={<span>Feedbacks clients · Score moyen</span>}
        live
      />

      <div className="px-9 py-6 space-y-5">

        {/* KPI row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">

          {/* Note moyenne */}
          <div className="ds-panel p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary mb-3">
              <Star size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
              Note moyenne
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span
                className="font-extrabold tabular-nums leading-none tracking-[-0.025em]"
                style={{ fontSize: '30px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
              >
                {total > 0 ? avg.toFixed(1).replace('.', ',') : '—'}
              </span>
              <span className="text-[14px] font-medium ds-text-tertiary">/ 5,0</span>
              {total > 0 && <StarRating count={Math.round(avg)} size={14} />}
            </div>
            <div className="text-[12px] ds-text-tertiary">
              {total} feedback{total !== 1 ? 's' : ''} au total
            </div>
          </div>

          {/* Négatifs */}
          <div className="ds-panel p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary mb-3">
              <Shield size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
              Feedbacks négatifs
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span
                className="font-extrabold tabular-nums leading-none tracking-[-0.025em]"
                style={{ fontSize: '30px', color: negCount > 0 ? 'var(--ds-error)' : 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
              >
                {negCount}
              </span>
              <span className="text-[14px] font-medium ds-text-tertiary">≤ 2 étoiles</span>
            </div>
            <div className="text-[12px] ds-text-tertiary">
              {posCount} positif{posCount !== 1 ? 's' : ''} · {neuCount} neutre{neuCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Cette semaine */}
          <div className="ds-panel p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary mb-3">
              <MessageSquare size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
              Cette semaine
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span
                className="font-extrabold tabular-nums leading-none tracking-[-0.025em]"
                style={{ fontSize: '30px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
              >
                {weekCount}
              </span>
              <span className="text-[14px] font-medium ds-text-tertiary">
                nouveau{weekCount !== 1 ? 'x' : ''}
              </span>
            </div>
            <div className="text-[12px] ds-text-tertiary">7 derniers jours</div>
          </div>
        </section>

        {/* Feedbacks list */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="font-bold text-[17px] tracking-[-0.02em] ds-text-primary">Feedbacks récents</h2>
              <p className="text-[13px] ds-text-secondary mt-0.5">Les retours envoyés depuis Splitzy après le paiement.</p>
            </div>
            {/* Filter tabs */}
            <div
              className="inline-flex rounded-[10px] p-[3px] gap-px border"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              {FILTERS.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-[7px] text-[12.5px] transition-colors"
                  style={{
                    background: filter === key ? 'var(--ds-bg-subtle)' : 'none',
                    color: filter === key ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                    fontWeight: filter === key ? 600 : 500,
                  }}
                >
                  {label}
                  <span className="text-[11px] tabular-nums ds-text-tertiary">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="ds-panel">
            {loading ? (
              <div className="py-12 text-center text-[13px] ds-text-tertiary">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-[13px] ds-text-tertiary">
                {total === 0 ? 'Aucun feedback reçu pour le moment.' : 'Aucun feedback pour ce filtre.'}
              </div>
            ) : filtered.map(fb => (
              <div
                key={fb._id}
                className="grid gap-4 px-5 py-4 border-b last:border-b-0 items-start"
                style={{ gridTemplateColumns: '72px 1fr', borderColor: 'var(--ds-border)' }}
              >
                {/* Rating */}
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="font-black text-[22px] tabular-nums leading-none"
                    style={{
                      color: fb.stars <= 2 ? 'var(--ds-error)' : fb.stars >= 4 ? 'var(--ds-success)' : 'var(--ds-warning)',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {fb.stars},0
                  </span>
                  <StarRating count={fb.stars} size={11} />
                </div>

                {/* Body */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span
                      className="font-bold text-[12px] px-2 py-[2px] rounded-[5px]"
                      style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)' }}
                    >
                      T{fb.tableNumber}
                    </span>
                    <span className="text-[12px] ds-text-tertiary">{fb.timeLabel}</span>
                    {fb.isNew && (
                      <span
                        className="text-[11px] px-2 py-[2px] rounded-full font-semibold"
                        style={{ background: 'var(--ds-accent-soft)', color: 'var(--ds-accent)' }}
                      >
                        Nouveau
                      </span>
                    )}
                  </div>
                  {fb.text ? (
                    <p className="text-[13px] ds-text-primary leading-[1.5] mb-2">« {fb.text} »</p>
                  ) : (
                    <p className="text-[13px] ds-text-tertiary italic mb-2">
                      Aucun commentaire — {fb.stars} étoile{fb.stars > 1 ? 's' : ''} données sans texte.
                    </p>
                  )}
                  {fb.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {fb.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[11px] px-2 py-[2px] rounded-full border ds-text-secondary"
                          style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!loading && total > 0 && (
            <div className="px-1 mt-3 text-[12.5px] ds-text-tertiary">
              {filtered.length} feedback{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Insight IA */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-[17px] tracking-[-0.02em] ds-text-primary">Insight IA — Réputation</h2>
              <p className="text-[13px] ds-text-secondary mt-0.5">Analyse automatique basée sur vos feedbacks.</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !restaurantId}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[9px] text-[12.5px] font-semibold transition-opacity disabled:opacity-50"
              style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-primary)', border: '1px solid var(--ds-border)' }}
            >
              <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
              Régénérer
            </button>
          </div>

          <div className="ds-panel p-5">
            {latestInsightsDoc === undefined ? (
              <div className="py-6 text-center text-[13px] ds-text-tertiary">Chargement…</div>
            ) : reputationInsight === null ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Sparkles size={22} style={{ color: 'var(--ds-text-tertiary)' }} />
                <p className="text-[13px] ds-text-tertiary">Aucun insight généré — cliquez sur Régénérer</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 flex items-center justify-center rounded-[9px] w-8 h-8"
                    style={{ background: 'rgba(232,146,10,0.1)' }}
                  >
                    <Sparkles size={15} style={{ color: '#E8920A' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] ds-text-primary leading-snug">{reputationInsight.title}</p>
                    {reputationInsight.metric && (
                      <span
                        className="inline-block mt-1.5 text-[11.5px] font-semibold px-2.5 py-[3px] rounded-full"
                        style={{ background: 'rgba(232,146,10,0.12)', color: '#B45309' }}
                      >
                        {reputationInsight.metric}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <p className="text-[13px] ds-text-secondary leading-[1.55]">{reputationInsight.body}</p>

                {/* Action suggestion */}
                {reputationInsight.action && (
                  <p className="text-[12.5px] font-medium" style={{ color: 'var(--ds-accent)' }}>
                    → {reputationInsight.action}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--ds-border)' }}>
                  <span className="text-[12px] ds-text-tertiary">
                    Généré {timeAgo(latestInsightsDoc!.generatedAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </RestaurantLayout>
  )
}
