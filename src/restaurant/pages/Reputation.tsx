import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { useRestaurantId } from '../context/RestaurantContext'
import {
  Star, Shield, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Sparkles, MessageSquare, RefreshCw, Settings, Eye, Reply, ArrowRight, X,
} from 'lucide-react'

type FilterKey = 'all' | 'neg' | 'pos' | 'neu' | 'week'

const FILTERS: { key: FilterKey; label: string; count: number }[] = [
  { key: 'all',  label: 'Tous',           count: 28 },
  { key: 'neg',  label: 'Négatifs',       count: 12 },
  { key: 'pos',  label: 'Positifs',       count: 14 },
  { key: 'neu',  label: 'Neutres',        count: 2  },
  { key: 'week', label: 'Cette semaine',  count: 5  },
]

type FbStatus = 'intercepted' | 'redirected' | 'neutral' | 'pending'

interface DemoFeedback {
  stars: number; table: string; time: string; convives: string
  comment: string; tags: string[]
  status: FbStatus
  actionLabel: string
}

const DEMO_FEEDBACKS: DemoFeedback[] = [
  {
    stars: 2, table: 'T4', time: '28 mai · 21h08', convives: '3 conv. · 47€',
    comment: "Le service était trop lent vendredi soir, on a attendu près de 40 minutes pour le plat principal. La cuisine reste excellente cela dit.",
    tags: ['attente', 'service', 'vendredi 21h'],
    status: 'intercepted', actionLabel: 'Répondre',
  },
  {
    stars: 5, table: 'T2', time: '28 mai · 20h42', convives: '2 conv. · 52,80€',
    comment: "Tout était parfait, accueil au top et plats délicieux. Le paiement en QR code est génial, on a divisé en 3 secondes.",
    tags: ['accueil', 'qualité', 'QR paiement'],
    status: 'redirected', actionLabel: "Voir l'avis",
  },
  {
    stars: 3, table: 'T1', time: '27 mai · 13h22', convives: '2 conv. · 24,20€',
    comment: "Bon rapport qualité-prix mais la salle était bruyante, difficile de discuter à midi.",
    tags: ['bruit', 'déjeuner'],
    status: 'neutral', actionLabel: 'Répondre',
  },
  {
    stars: 1, table: 'T7', time: '26 mai · 21h47', convives: '4 conv. · 88€',
    comment: "Erreur sur l'addition, on nous a facturé deux fois la même entrée. Personne pour nous écouter à la sortie.",
    tags: ['addition', 'litige', 'urgent'],
    status: 'intercepted', actionLabel: 'Répondre',
  },
  {
    stars: 5, table: 'T3', time: '26 mai · 20h11', convives: '5 conv. · 63€',
    comment: '',
    tags: [],
    status: 'pending', actionLabel: 'Inviter sur Google',
  },
]

const STATUS_CONFIG: Record<FbStatus, { bg: string; color: string; icon: React.ElementType; label: string }> = {
  intercepted: { bg: 'var(--ds-error-soft)',    color: 'var(--ds-error-strong)',   icon: Shield,      label: 'Intercepté' },
  redirected:  { bg: 'var(--ds-success-soft)',  color: 'var(--ds-success-strong)', icon: CheckCircle2, label: 'Redirigé Google' },
  neutral:     { bg: 'var(--ds-bg-subtle)',     color: 'var(--ds-text-tertiary)', icon: MessageSquare, label: 'Neutre' },
  pending:     { bg: 'var(--ds-warning-soft)',  color: 'var(--ds-warning)',        icon: Clock,       label: "En attente d'action" },
}

function StarRating({ count, size = 13 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex gap-px">
      {[0,1,2,3,4].map(i => (
        <Star key={i} size={size} fill={i < count ? '#E8920A' : 'none'} stroke={i < count ? '#E8920A' : 'var(--ds-border-strong)'} strokeWidth={1.5} />
      ))}
    </span>
  )
}

type ConvexFeedback = { stars: number; tableNumber: number; timeLabel: string; isNew: boolean; text: string; tags: string[] }

export function Reputation() {
  const [filter, setFilter]         = useState<FilterKey>('all')
  const [scoreModal, setScoreModal] = useState(false)
  const restaurantId = useRestaurantId()
  const rawFeedbacks = useQuery(api.feedbacks.list, restaurantId ? { restaurantId } : 'skip')
  const markAllRead  = useMutation(api.feedbacks.markAllRead)

  const markedRef = useRef(false)
  useEffect(() => {
    if (!restaurantId || markedRef.current) return
    markedRef.current = true
    markAllRead({ restaurantId }).catch(() => {})
  }, [restaurantId, markAllRead])

  const convexFeedbacks = rawFeedbacks as ConvexFeedback[] | undefined
  const total    = convexFeedbacks?.length ?? 28
  const avgRating = convexFeedbacks && convexFeedbacks.length > 0
    ? (convexFeedbacks.reduce((s, f) => s + f.stars, 0) / convexFeedbacks.length).toFixed(1)
    : '4,6'

  // Map filter to show appropriate feedbacks
  const demosToShow: DemoFeedback[] = (() => {
    if (filter === 'neg')  return DEMO_FEEDBACKS.filter(f => f.stars <= 3)
    if (filter === 'pos')  return DEMO_FEEDBACKS.filter(f => f.stars >= 4)
    if (filter === 'neu')  return DEMO_FEEDBACKS.filter(f => f.stars === 3)
    if (filter === 'week') return DEMO_FEEDBACKS.slice(0, 3)
    return DEMO_FEEDBACKS
  })()

  return (
    <RestaurantLayout>
      <PageHeader
        title="Réputation"
        subtitle={<span>Interception des feedbacks · Score Splitzy · Réponses Google par IA</span>}
        live
      />

      <div className="px-9 py-6 space-y-5">

        {/* KPI row — 3 cols */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">

          {/* Note Google */}
          <div className="ds-panel p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary mb-3">
              <Star size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
              Note Google actuelle
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="font-extrabold tabular-nums leading-none tracking-[-0.025em]" style={{ fontSize: '30px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}>4,3</span>
              <span className="text-[14px] font-medium ds-text-tertiary">/ 5,0</span>
              <StarRating count={4} size={14} />
            </div>
            <div className="flex items-center gap-1 text-[12px] font-semibold ds-text-success-strong">
              <TrendingUp size={12} />
              +0,1 ce mois
              <span className="font-normal ds-text-tertiary ml-1">· 187 avis publics</span>
            </div>
          </div>

          {/* Feedbacks interceptés */}
          <div className="ds-panel p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary mb-3">
              <Shield size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
              Feedbacks interceptés
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="font-extrabold tabular-nums leading-none tracking-[-0.025em]" style={{ fontSize: '30px', color: 'var(--ds-error)', fontFamily: 'Inter, sans-serif' }}>12</span>
              <span className="text-[14px] font-medium ds-text-tertiary">ce mois</span>
            </div>
            <div className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: 'var(--ds-error-strong)' }}>
              <TrendingDown size={12} />
              −4 vs mois dernier
              <span className="font-normal ds-text-tertiary ml-1">· ~3,2k€ protégé</span>
            </div>
          </div>

          {/* Redirigés Google */}
          <div className="ds-panel p-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.09em] ds-text-secondary mb-3">
              <CheckCircle2 size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
              Redirigés vers Google
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="font-extrabold tabular-nums leading-none tracking-[-0.025em]" style={{ fontSize: '30px', color: 'var(--ds-success)', fontFamily: 'Inter, sans-serif' }}>4</span>
              <span className="text-[14px] font-medium ds-text-tertiary">avis 5★</span>
            </div>
            <div className="flex items-center gap-1 text-[12px] font-semibold ds-text-success-strong">
              <TrendingUp size={12} />
              Taux de conversion 33%
              <span className="font-normal ds-text-tertiary ml-1">· objectif 40%</span>
            </div>
          </div>
        </section>

        {/* Score Splitzy hero */}
        <div
          className="rounded-[14px] overflow-hidden border"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: '0 1px 2px rgba(10,10,10,.04), 0 8px 24px -8px rgba(10,10,10,.08)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-[340px_1fr]">
            {/* Left: Gauge */}
            <div
              className="flex flex-col items-center text-center px-7 py-7 border-r"
              style={{ background: 'linear-gradient(180deg, #FFFCF6 0%, #FFFFFF 80%)', borderColor: 'var(--ds-border)' }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] ds-text-accent mb-4">
                <Sparkles size={12} />
                Score Splitzy
              </div>
              {/* SVG Gauge */}
              <div className="relative" style={{ width: '240px', height: '200px' }}>
                <svg width="240" height="200" viewBox="0 0 240 200">
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F5A030" />
                      <stop offset="100%" stopColor="#E8920A" />
                    </linearGradient>
                  </defs>
                  {/* Track */}
                  <path d="M 24 168 A 96 96 0 1 1 216 168" fill="none" stroke="var(--ds-bg-subtle)" strokeWidth="14" strokeLinecap="round" />
                  {/* Fill (87%) */}
                  <path d="M 24 168 A 96 96 0 1 1 216 168" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round" strokeDasharray="452" strokeDashoffset="59" />
                  {/* Labels */}
                  <text x="20" y="190" fontSize="10" fill="var(--ds-text-tertiary)" fontFamily="Inter" fontWeight="600">0</text>
                  <text x="208" y="190" fontSize="10" fill="var(--ds-text-tertiary)" fontFamily="Inter" fontWeight="600">100</text>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: '18px' }}>
                  <div className="font-black leading-none tabular-nums tracking-[-0.04em]" style={{ fontSize: '64px', color: 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}>87</div>
                  <div className="text-[13px] font-medium ds-text-tertiary mt-1">/ 100</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold ds-text-success-strong mt-2">
                <TrendingUp size={13} />
                +6 pts sur 30 jours · Excellent
              </div>
              <p className="text-[12.5px] ds-text-secondary leading-[1.55] mt-4 max-w-[280px]">
                Le <strong className="ds-text-primary">Score Splitzy</strong> combine votre <strong className="ds-text-primary">note interne</strong>, la <strong className="ds-text-primary">tendance Google</strong> et votre <strong className="ds-text-primary">taux d'interception</strong>. C'est l'indicateur unique de la santé de votre réputation.
              </p>
            </div>

            {/* Right: Components */}
            <div className="px-7 py-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-bold text-[14px] ds-text-primary tracking-[-0.01em]">Composantes du score</div>
                  <div className="text-[12px] ds-text-tertiary mt-0.5">Calculé sur les 30 derniers jours</div>
                </div>
                <button onClick={() => setScoreModal(true)} className="text-[12px] font-medium ds-text-secondary hover:ds-text-primary transition-colors underline-offset-2 hover:underline">
                  Comment c'est calculé ?
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { color: 'var(--ds-accent)', iconBg: 'var(--ds-accent-soft)', iconColor: 'var(--ds-accent)', icon: MessageSquare, name: 'Note interne', meta: 'Moyenne des feedbacks reçus par Splitzy', score: `${avgRating} / 5`, pct: 92 },
                  { color: '#2563EB', iconBg: '#EEF6FF', iconColor: '#2563EB', icon: TrendingUp, name: 'Tendance Google', meta: 'Évolution de la note publique sur 90 jours', score: '+0,1 ★', pct: 78 },
                  { color: 'var(--ds-success)', iconBg: 'var(--ds-success-soft)', iconColor: 'var(--ds-success)', icon: Shield, name: "Taux d'interception", meta: 'Feedbacks négatifs traités avant Google', score: '86%', pct: 86 },
                ].map((comp, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{ background: comp.iconBg }}>
                          <comp.icon size={14} style={{ color: comp.iconColor }} />
                        </div>
                        <div>
                          <div className="text-[13.5px] font-semibold ds-text-primary">{comp.name}</div>
                          <div className="text-[12px] ds-text-tertiary">{comp.meta}</div>
                        </div>
                      </div>
                      <div className="font-bold text-[14px] ds-text-primary tabular-nums">{comp.score}</div>
                    </div>
                    <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'var(--ds-bg-subtle)' }}>
                      <div className="h-full rounded-full" style={{ width: `${comp.pct}%`, background: comp.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Insight */}
              <div className="flex items-start gap-3 mt-5 pt-5 border-t" style={{ borderColor: 'var(--ds-border)', borderTopStyle: 'dashed' }}>
                <div className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--ds-accent-soft)' }}>
                  <Sparkles size={13} style={{ color: '#E8920A' }} />
                </div>
                <p className="text-[12.5px] ds-text-secondary leading-[1.5]">
                  <strong className="ds-text-primary">Insight IA —</strong> Votre score gagnerait <strong className="ds-text-primary">+4 pts</strong> si vous répondiez aux <strong className="ds-text-primary">3 avis Google en attente</strong>. Les restaurants qui répondent en moins de 24h augmentent leur note de 0,2★ en moyenne.
                </p>
              </div>
            </div>
          </div>
        </div>

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
            {demosToShow.length === 0 ? (
              <div className="py-12 text-center text-[13px] ds-text-tertiary">Aucun feedback pour ce filtre.</div>
            ) : demosToShow.map((fb, i) => {
              const sc = STATUS_CONFIG[fb.status]
              const StatusIcon = sc.icon
              return (
                <div
                  key={i}
                  className="grid gap-4 px-5 py-4 border-b last:border-b-0 items-start"
                  style={{
                    gridTemplateColumns: '72px 1fr auto auto',
                    borderColor: 'var(--ds-border)',
                  }}
                >
                  {/* Rating */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-black text-[22px] tabular-nums leading-none" style={{ color: fb.stars <= 2 ? 'var(--ds-error)' : fb.stars >= 4 ? 'var(--ds-success)' : 'var(--ds-warning)', fontFamily: 'Inter, sans-serif' }}>
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
                        {fb.table}
                      </span>
                      <span className="text-[12px] ds-text-tertiary">{fb.time}</span>
                      <span className="w-1 h-1 rounded-full ds-bg-subtle flex-shrink-0" />
                      <span className="text-[12px] ds-text-tertiary">{fb.convives}</span>
                    </div>
                    {fb.comment ? (
                      <p className="text-[13px] ds-text-primary leading-[1.5] mb-2">« {fb.comment} »</p>
                    ) : (
                      <p className="text-[13px] ds-text-tertiary italic mb-2">Aucun commentaire — {fb.stars} étoiles données sans texte.</p>
                    )}
                    {fb.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {fb.tags.map(tag => (
                          <span key={tag} className="text-[11px] px-2 py-[2px] rounded-full border ds-text-secondary" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-[4px] rounded-full text-[11px] font-semibold flex-shrink-0"
                    style={{ background: sc.bg, color: sc.color }}
                  >
                    <StatusIcon size={10} />
                    {sc.label}
                  </span>

                  {/* Action */}
                  <button
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold ds-text-accent hover:ds-text-accent-strong transition-colors flex-shrink-0"
                  >
                    {fb.status === 'redirected' ? <Eye size={13} /> : fb.status === 'pending' ? <ArrowRight size={13} /> : <Reply size={13} />}
                    {fb.actionLabel}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between px-1 mt-3 text-[12.5px]">
            <span className="ds-text-tertiary">5 feedbacks affichés sur {total} ce mois</span>
            <button className="ds-text-accent font-medium hover:ds-text-accent-strong transition-colors">
              Voir tous les feedbacks →
            </button>
          </div>
        </div>

        {/* Google IA replies */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="font-bold text-[17px] tracking-[-0.02em] ds-text-primary">Réponses Google par IA</h2>
              <p className="text-[13px] ds-text-secondary mt-0.5">3 avis Google en attente · réponses générées dans votre ton, à valider avant publication.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[12.5px] font-medium transition-colors"
                style={{ background: 'transparent', borderColor: 'transparent', color: 'var(--ds-text-secondary)' }}
              >
                <Settings size={13} />
                Ton de réponse
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[12.5px] font-medium transition-colors"
                style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
              >
                <RefreshCw size={13} />
                Régénérer tout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            {/* Card 1 — 5 stars */}
            <div className="ds-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>CM</div>
                  <div>
                    <div className="font-semibold text-[13.5px] ds-text-primary">Claire M.</div>
                    <div className="flex items-center gap-1.5 text-[12px] ds-text-tertiary">
                      <StarRating count={5} size={11} />
                      · il y a 2 jours
                    </div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-[3px] rounded-full" style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#4285F4' }} />
                  Google
                </span>
              </div>
              <blockquote className="text-[13px] ds-text-primary leading-[1.5] mb-3 border-l-2 pl-3" style={{ borderColor: 'var(--ds-border)' }}>
                « Première fois au Snack Momo, l'accueil de l'équipe a été chaleureux et les momos au boeuf sont à tomber. On reviendra, c'est sûr ! »
              </blockquote>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-[5px] flex items-center justify-center" style={{ background: 'var(--ds-accent-soft)' }}>
                  <Sparkles size={11} style={{ color: '#E8920A' }} />
                </div>
                <span className="text-[12px] font-semibold ds-text-primary">Réponse générée</span>
                <span className="text-[11.5px] ds-text-tertiary ml-auto">il y a 4 sec.</span>
              </div>
              <div className="text-[13px] ds-text-secondary leading-[1.5] px-3 py-2.5 rounded-[8px] mb-3" style={{ background: 'var(--ds-bg-base)', border: '1px solid var(--ds-border)' }}>
                Merci Claire pour ce retour qui fait chaud au cœur ! Nos momos boeuf sont la recette de la grand-mère du chef, ravis qu'elle vous ait plu. À très bientôt au Snack Momo.
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12.5px] font-semibold text-white" style={{ background: '#E8920A' }}>
                  <CheckCircle2 size={13} />
                  Valider et publier
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border text-[12.5px] font-medium" style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}>
                  Modifier
                </button>
                <span className="text-[11.5px] ds-text-tertiary ml-auto">~120 caractères</span>
              </div>
            </div>

            {/* Card 2 — 3 stars with editable */}
            <div className="ds-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22C55E, #10B981)' }}>TL</div>
                  <div>
                    <div className="font-semibold text-[13.5px] ds-text-primary">Thomas L.</div>
                    <div className="flex items-center gap-1.5 text-[12px] ds-text-tertiary">
                      <StarRating count={3} size={11} />
                      · il y a 4 jours
                    </div>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-[3px] rounded-full" style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#4285F4' }} />
                  Google
                </span>
              </div>
              <blockquote className="text-[13px] ds-text-primary leading-[1.5] mb-3 border-l-2 pl-3" style={{ borderColor: 'var(--ds-border)' }}>
                « Plats corrects, ambiance sympa, mais le service du midi est vraiment long. Compter 45 minutes entre la commande et l'arrivée du plat. »
              </blockquote>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-[5px] flex items-center justify-center" style={{ background: 'var(--ds-accent-soft)' }}>
                  <Sparkles size={11} style={{ color: '#E8920A' }} />
                </div>
                <span className="text-[12px] font-semibold ds-text-primary">Réponse générée — édition</span>
                <span className="text-[11.5px] ds-text-tertiary ml-auto">brouillon</span>
              </div>
              <div
                className="text-[13px] ds-text-secondary leading-[1.5] px-3 py-2.5 rounded-[8px] mb-3 outline-none"
                style={{ background: 'var(--ds-bg-base)', border: '1px solid var(--ds-accent)', minHeight: '60px' }}
                contentEditable
                suppressContentEditableWarning
              >
                Merci Thomas pour votre retour honnête. Le service du vendredi midi a été plus lent que d'habitude — nous renforçons l'équipe en cuisine dès la semaine prochaine. N'hésitez pas à repasser, on se rattrapera.
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12.5px] font-semibold text-white" style={{ background: '#E8920A' }}>
                  <CheckCircle2 size={13} />
                  Publier la version modifiée
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border text-[12.5px] font-medium" style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}>
                  <RefreshCw size={13} />
                  Regénérer
                </button>
                <span className="text-[11.5px] ds-text-tertiary ml-auto">Modifié manuellement</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      {/* Score formula modal */}
      <AnimatePresence>
        {scoreModal && (
          <m.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setScoreModal(false) }}>
            <m.div className="rounded-2xl overflow-hidden w-[460px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <div className="font-bold text-[16px] ds-text-primary">Formule du Score Splitzy</div>
                <button onClick={() => setScoreModal(false)} className="ds-text-tertiary hover:ds-text-primary"><X size={18} /></button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-[13.5px] ds-text-secondary leading-[1.6]">
                  Indicateur composite calculé sur les <strong className="ds-text-primary">30 derniers jours glissants</strong>, depuis 3 composantes pondérées :
                </p>
                <div className="space-y-3">
                  {[
                    { pct: '40%', color: '#E8920A', label: 'Note interne', desc: 'Moyenne des feedbacks clients reçus via Splitzy (1–5 ★). Chaque feedback post-paiement est comptabilisé.' },
                    { pct: '40%', color: '#2563EB', label: 'Tendance Google', desc: "Évolution de la note publique Google My Business sur 90 jours. +0,1★ de progression = +8 pts sur cette composante." },
                    { pct: '20%', color: '#22C55E', label: "Taux d'interception", desc: 'Ratio feedbacks négatifs (≤ 3★) gérés avant Google. Objectif : > 80%.' },
                  ].map(item => (
                    <div key={item.label} className="flex gap-3 p-3.5 rounded-[10px] border" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
                      <div className="flex-shrink-0 w-10 h-10 rounded-[8px] flex items-center justify-center font-bold text-[12px] text-white" style={{ background: item.color }}>
                        {item.pct}
                      </div>
                      <div>
                        <div className="font-semibold text-[13.5px] ds-text-primary">{item.label}</div>
                        <div className="text-[12.5px] ds-text-secondary mt-0.5 leading-[1.5]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3.5 rounded-[10px] border text-[12.5px] leading-[1.5]" style={{ background: 'var(--ds-accent-soft)', borderColor: '#F5DDB3', color: 'var(--ds-accent-strong)' }}>
                  <strong>Formule :</strong> Score = (Note/5 × 40) + (Tendance normalisée × 40) + (Taux interception × 20)
                </div>
              </div>
              <div className="px-6 pb-5">
                <button onClick={() => setScoreModal(false)} className="w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' }}>Fermer</button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </RestaurantLayout>
  )
}
