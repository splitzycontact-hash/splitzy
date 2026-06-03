import { useState, useMemo } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { toast } from 'sonner'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { formatEur } from '../../utils/formatCurrency'
import { AVATARS } from '../../components/ui/Avatar'
import { useRestaurantId, useRestaurant } from '../context/RestaurantContext'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import { Users, Star, TrendingUp, Search, X, Send, Mail, Crown, Sparkles, ChevronRight, Printer, Download, Phone, Check } from 'lucide-react'

type Status = 'vip' | 'regulier' | 'nouveau' | 'insatisfait'
type FilterKey = 'all' | Status
// Segments ciblables par une campagne email (pas de VIP dédié ici — couvert par "Tous").
type CampaignSegment = 'all' | 'regulier' | 'nouveau' | 'insatisfait'
const CAMPAIGN_SEGMENTS: { key: CampaignSegment; label: string }[] = [
  { key: 'all',         label: 'Tous'         },
  { key: 'regulier',    label: 'Réguliers'    },
  { key: 'nouveau',     label: 'Nouveaux'     },
  { key: 'insatisfait', label: 'Insatisfaits' },
]

const STATUS_LABEL: Record<Status, string> = {
  vip: 'VIP', regulier: 'Régulier', nouveau: 'Nouveau', insatisfait: 'Insatisfait',
}
const STATUS_STYLE: Record<Status, { bg: string; color: string }> = {
  vip:        { bg: '#FFEAC2',              color: '#92400E'  },
  regulier:   { bg: 'var(--ds-success-soft)', color: 'var(--ds-success-strong)' },
  nouveau:    { bg: '#EEF6FF',              color: '#2563EB'  },
  insatisfait:{ bg: 'var(--ds-error-soft)', color: 'var(--ds-error-strong)'   },
}

interface Customer {
  id: string // clé de groupe : phone:… | email:… | pay:<paymentId>
  tableNumber: number // table du paiement le plus récent (pour updateContact gérant)
  first: string; last: string; email: string
  visits: number; avg: number; total: number
  lastVisit: string; lastIso: string; firstTs: number
  rating: number; status: Status
  phone: string; split: string; methodPct: number
  color: string; text: string
  customerId?: Id<'customers'>; realContact: boolean
  // Campagne email : id de la row consentante (email + marketingConsent) si éligible.
  consent: boolean; marketingId?: Id<'customers'>
  // Données réelles du groupe pour le panneau détail.
  groupPayments: Doc<'payments'>[]; groupFeedbacks: Doc<'feedbacks'>[]
}

const METHOD_LABEL: Record<string, string> = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex',
  apple_pay: 'Apple Pay', google_pay: 'Google Pay', card: 'Carte',
}
function methodLabel(m: string): string {
  if (!m) return 'Carte'
  return METHOD_LABEL[m] ?? (m.charAt(0).toUpperCase() + m.slice(1))
}

function formatTimeAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days}j`
}

function initials(c: Customer) { return (c.first[0] ?? '?').toUpperCase() }
function fullName(c: { first: string; last: string }) { return [c.first, c.last].filter(Boolean).join(' ') }

function StarRating({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-px">
      {[0,1,2,3,4].map(i => (
        <Star
          key={i} size={size}
          fill={i < Math.floor(rating) ? '#E8920A' : 'none'}
          stroke={i < Math.floor(rating) ? '#E8920A' : 'var(--ds-border-strong)'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  )
}

function CustomerDrawer({ customer, restaurantId, tablePayments, tableFeedbacks, onClose }: { customer: Customer; restaurantId: Id<'restaurants'>; tablePayments: Doc<'payments'>[]; tableFeedbacks: Doc<'feedbacks'>[]; onClose: () => void }) {
  const updateContact = useMutation(api.customers.updateContact)
  const [cid, setCid]       = useState<Id<'customers'> | undefined>(customer.customerId)
  const [phone, setPhone]   = useState(customer.phone ?? '')
  const [email, setEmail]   = useState(customer.email ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const dirty = phone !== (customer.phone ?? '') || email !== (customer.email ?? '')

  const saveContact = async () => {
    setSaving(true)
    try {
      const id = await updateContact({
        customerId: cid,
        restaurantId,
        tableNumber: customer.tableNumber,
        firstName: customer.first,
        phone,
        email,
      })
      setCid(id as Id<'customers'>)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  // Historique réel : paiements de cette table, plus récents d'abord.
  const visits = [...tablePayments]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)
    .map(p => {
      const d = new Date(p.createdAt)
      const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const tipPct = p.subtotalCents > 0 ? Math.round((p.tipCents / p.subtotalCents) * 100) : 0
      return {
        date,
        line1: `Table ${p.tableNumber} · ${p.guests} convive${p.guests > 1 ? 's' : ''}`,
        line2: `${methodLabel(p.paymentMethod)}${tipPct > 0 ? ` · Pourboire ${tipPct}%` : ''}`,
        amount: formatEur(p.totalCents),
      }
    })

  // Feedbacks réels de cette table (privés — jamais publiés sur Google).
  const feedbacks = [...tableFeedbacks]
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 5)
    .map(f => ({ rating: f.stars, text: f.text, date: f.timeLabel ?? '' }))

  // "Client depuis" = date du 1er paiement réel.
  const sinceLabel = tablePayments.length
    ? new Date(Math.min(...tablePayments.map(p => p.createdAt))).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
    : ''

  // Fréquence réelle : nb de paiements par semaine sur les 4 dernières semaines.
  const WEEK = 7 * 86400000
  const nowTs = Date.now()
  const weekBars = [3, 2, 1, 0].map(off => {
    const end = nowTs - off * WEEK
    const start = end - WEEK
    return tablePayments.filter(p => p.createdAt > start && p.createdAt <= end).length
  }) // [S-3, S-2, S-1, cette sem.]
  const maxBar = Math.max(1, ...weekBars)
  const last4 = weekBars.reduce((a, b) => a + b, 0)
  const prev4 = tablePayments.filter(p => p.createdAt > nowTs - 8 * WEEK && p.createdAt <= nowTs - 4 * WEEK).length
  const deltaPct = prev4 > 0 ? Math.round(((last4 - prev4) / prev4) * 100) : null

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden border-l"
        style={{ width: '520px', background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
      >
        {/* Head */}
        <div className="flex items-start justify-between px-5 py-5 border-b flex-shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-[10px] flex items-center justify-center font-bold text-[15px] flex-shrink-0"
              style={{ background: customer.color, color: customer.text }}
            >
              {initials(customer)}
            </div>
            <div>
              <div className="font-bold text-[16px] ds-text-primary">{fullName(customer)}</div>
              {email && <div className="text-[12.5px] ds-text-tertiary">{email}</div>}
              {phone && <div className="text-[12.5px] ds-text-tertiary">{phone}</div>}
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded-full"
                  style={{ background: STATUS_STYLE[customer.status].bg, color: STATUS_STYLE[customer.status].color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: STATUS_STYLE[customer.status].color }} />
                  {STATUS_LABEL[customer.status]}
                </span>
                {sinceLabel && <span className="text-[11.5px] ds-text-tertiary">Client depuis {sinceLabel}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="ds-text-tertiary hover:ds-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Coordonnées (CRM) */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Coordonnées</h4>
            <div className="rounded-[10px] border p-3.5 space-y-3" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
              <label className="block">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] ds-text-tertiary">
                  <Phone size={11} /> Téléphone
                </span>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  type="tel"
                  className="w-full mt-1.5 h-9 px-3 rounded-[8px] border outline-none focus:border-[#E8920A]"
                  style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
                />
              </label>
              <label className="block">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] ds-text-tertiary">
                  <Mail size={11} /> Email
                </span>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="client@email.com"
                  type="email"
                  className="w-full mt-1.5 h-9 px-3 rounded-[8px] border outline-none focus:border-[#E8920A]"
                  style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', fontSize: '13px' }}
                />
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveContact}
                  disabled={saving || !dirty}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-semibold text-white disabled:opacity-50"
                  style={{ background: '#E8920A' }}
                >
                  {saved ? <><Check size={13} /> Enregistré</> : saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                {!customer.realContact && (
                  <span className="text-[11.5px] ds-text-tertiary">Aucune coordonnée laissée — vous pouvez en ajouter.</span>
                )}
              </div>
            </div>
          </div>

          {/* Vue rapide */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Vue rapide</h4>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Visites', value: String(customer.visits), sub: sinceLabel ? `depuis ${sinceLabel}` : `${customer.visits} paiement${customer.visits > 1 ? 's' : ''}` },
                { label: 'Total dépensé', value: `${customer.total.toFixed(0)}€`, sub: `panier moy. ${customer.avg.toFixed(2).replace('.', ',')}€`, accent: true },
                { label: 'Note moyenne', value: customer.rating > 0 ? `${customer.rating.toFixed(1)} ★` : '—', sub: `sur ${tableFeedbacks.length} feedback${tableFeedbacks.length > 1 ? 's' : ''}` },
                { label: 'Moyen préféré', value: customer.split, sub: customer.methodPct > 0 ? `${customer.methodPct}% des paiements` : '—' },
              ].map(tile => (
                <div
                  key={tile.label}
                  className="rounded-[10px] border p-3.5"
                  style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] ds-text-tertiary">{tile.label}</div>
                  <div
                    className="font-bold text-[20px] mt-1 leading-none tabular-nums tracking-[-0.025em]"
                    style={{ color: tile.accent ? 'var(--ds-accent)' : 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif' }}
                  >
                    {tile.value}
                  </div>
                  <div className="text-[11.5px] ds-text-secondary mt-0.5">{tile.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fréquence — paiements réels par semaine (4 dernières sem.) */}
          {last4 > 0 && (
            <div>
              <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">
                Fréquence des visites · 4 dernières semaines
              </h4>
              <div className="rounded-[10px] border p-3.5" style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-[11.5px] ds-text-tertiary">Total : {last4} visite{last4 > 1 ? 's' : ''}</span>
                  {deltaPct !== null && (
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: deltaPct >= 0 ? 'var(--ds-success-strong)' : 'var(--ds-error-strong)' }}
                    >
                      {deltaPct >= 0 ? '+' : ''}{deltaPct}% vs mois préc.
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-1.5 h-12">
                  {weekBars.map((v, i) => (
                    <div key={i} className="flex-1 relative">
                      <div className="rounded-[3px]" style={{ height: `${(v / maxBar) * 100}%`, background: '#E8920A', minHeight: v > 0 ? '4px' : '0' }} />
                      <span className="block text-center text-[10px] ds-text-tertiary mt-1">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 mt-1">
                  {['S-3', 'S-2', 'S-1', 'Cette sem.'].map(l => (
                    <div key={l} className="flex-1 text-center text-[10px] ds-text-tertiary">{l}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Historique visites */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-2">Historique des visites</h4>
            {visits.map((v, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--ds-border)' }}>
                <div className="text-[11.5px] ds-text-tertiary w-14 flex-shrink-0 font-mono">{v.date}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium ds-text-primary">{v.line1}</div>
                  <div className="text-[12px] ds-text-secondary mt-0.5">{v.line2}</div>
                </div>
                <div className="font-semibold text-[14px] ds-text-primary tabular-nums">{v.amount}</div>
              </div>
            ))}
            <button className="flex items-center gap-1 mt-2 text-[12.5px] font-medium ds-text-secondary hover:ds-text-primary transition-colors">
              Voir les {customer.visits} visites <ChevronRight size={12} />
            </button>
          </div>

          {/* Feedbacks */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-2">Feedbacks laissés</h4>
            <div className="space-y-2">
              {feedbacks.map((f, i) => (
                <div
                  key={i}
                  className="rounded-[10px] border p-3.5"
                  style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <StarRating rating={f.rating} />
                    <span
                      className="text-[10.5px] font-semibold px-1.5 py-[2px] rounded-[4px]"
                      style={{ background: 'var(--ds-accent-soft)', color: '#B45309' }}
                    >
                      Privé
                    </span>
                  </div>
                  {f.text && <p className="text-[13px] ds-text-primary leading-[1.5]">"{f.text}"</p>}
                  {f.date && <div className="text-[11px] ds-text-tertiary mt-1.5">{f.date}</div>}
                </div>
              ))}
              {feedbacks.length === 0 && (
                <div className="text-[12.5px] ds-text-tertiary">Aucun feedback laissé.</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="font-semibold text-[12px] ds-text-tertiary uppercase tracking-[0.07em] mb-3">Actions</h4>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-semibold text-white"
                style={{ background: '#E8920A' }}
              >
                <Send size={13} />
                Envoyer un message
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border text-[13px] font-medium"
                style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                onClick={() => navigator.clipboard.writeText(customer.email).catch(() => {})}
              >
                <Mail size={13} />
                Copier l'email
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border text-[13px] font-medium"
                style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
              >
                <Crown size={13} />
                Marquer VIP
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export function Clients() {
  const [filter, setFilter]         = useState<FilterKey>('all')
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<Customer | null>(null)
  const [emailModal, setEmailModal] = useState(false)

  // Campagne email
  const [segment, setSegment]           = useState<CampaignSegment>('all')
  const [subject, setSubject]           = useState('')
  const [campaignBody, setCampaignBody] = useState('')
  const [preview, setPreview]           = useState(false)
  const [sending, setSending]           = useState(false)

  const restaurantId = useRestaurantId()
  const restaurant   = useRestaurant()
  const sendCampaign = useAction(api.campaigns.sendCampaign)
  const payments  = (useQuery(api.payments.list,  restaurantId ? { restaurantId } : 'skip') ?? []).filter(p => p.status === 'Encaissé')
  const feedbacks =  useQuery(api.feedbacks.list, restaurantId ? { restaurantId } : 'skip') ?? []
  const crmCustomers = useQuery(api.customers.getByRestaurant, restaurantId ? { restaurantId } : 'skip')

  const customers = useMemo<Customer[]>(() => {
    if (payments.length === 0) return []

    // 1 paiement = 1 client. Fusion uniquement si même téléphone OU même email
    // (backfillés sur le paiement par customers.saveContact). Sinon one-shot anonyme.
    const groupKeyOf = (p: Doc<'payments'>): string => {
      const phone = p.phone?.trim()
      const email = p.email?.trim().toLowerCase()
      if (phone) return `phone:${phone}`
      if (email) return `email:${email}`
      return `pay:${p._id}`
    }
    const groups = new Map<string, Doc<'payments'>[]>()
    for (const p of payments) {
      const k = groupKeyOf(p)
      const arr = groups.get(k)
      if (arr) arr.push(p)
      else groups.set(k, [p])
    }

    const list: Customer[] = []
    for (const [key, gp] of groups) {
      const pmts = [...gp].sort((a, b) => b.createdAt - a.createdAt) // récent → ancien
      const recent = pmts[0]
      const visits = pmts.length
      const total = pmts.reduce((s, p) => s + p.totalCents, 0) / 100
      const avg = total / visits
      const lastTs = recent.createdAt
      const firstTs = pmts.reduce((mn, p) => Math.min(mn, p.createdAt), recent.createdAt)

      // Contact du groupe (depuis le paiement le plus récent qui en porte un).
      const gPhone = pmts.find(p => p.phone)?.phone ?? ''
      const gEmail = pmts.find(p => p.email)?.email?.toLowerCase() ?? ''

      // Feedbacks attribués par tableNumber des paiements du groupe (les feedbacks
      // ne portent pas le contact — meilleure approximation réelle disponible).
      const tableSet = new Set(pmts.map(p => p.tableNumber))
      const gFeedbacks = feedbacks.filter(f => tableSet.has(f.tableNumber))
      const avgRating = gFeedbacks.length > 0 ? gFeedbacks.reduce((s, f) => s + f.stars, 0) / gFeedbacks.length : 0

      let status: Status
      if (visits >= 10 || total >= 500) status = 'vip'
      else if (avgRating > 0 && avgRating < 3) status = 'insatisfait'
      else if (visits >= 3) status = 'regulier'
      else status = 'nouveau'

      // Identité réelle : prénom du paiement le plus récent (saisi sur /profile).
      const first = (pmts.find(p => p.firstName)?.firstName || 'Client').trim() || 'Client'
      const avatarIdx = pmts.find(p => p.avatarIndex != null)?.avatarIndex ?? 0
      const pal = AVATARS[avatarIdx % AVATARS.length]

      // Moyen de paiement dominant + sa part (%).
      const methodCounts: Record<string, number> = {}
      for (const p of pmts) methodCounts[p.paymentMethod] = (methodCounts[p.paymentMethod] ?? 0) + 1
      const [topMethod, topCount] = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
      const methodPct = visits > 0 ? Math.round((topCount / visits) * 100) : 0

      // CRM : row consentante (email + marketingConsent) appariée par phone/email du groupe.
      const crmMatch = (crmCustomers ?? []).filter(cc =>
        (gPhone && cc.phone === gPhone) ||
        (gEmail && cc.email?.toLowerCase() === gEmail)
      )
      const consentRow = crmMatch.find(r => r.marketingConsent === true && !!r.email)

      list.push({
        id: key,
        tableNumber: recent.tableNumber,
        first, last: '',
        email: gEmail || (crmMatch[0]?.email ?? ''),
        phone: gPhone || (crmMatch[0]?.phone ?? ''),
        visits, avg, total,
        lastVisit: formatTimeAgo(lastTs),
        lastIso: new Date(lastTs).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        firstTs,
        rating: avgRating,
        status,
        split: methodLabel(topMethod), methodPct,
        color: pal.bg, text: pal.color,
        customerId: crmMatch[0]?._id, realContact: !!(gPhone || gEmail),
        consent: !!consentRow, marketingId: consentRow?._id,
        groupPayments: pmts, groupFeedbacks: gFeedbacks,
      })
    }
    return list.sort((a, b) => b.total - a.total)
  }, [payments, feedbacks, crmCustomers])

  const maxVisits        = Math.max(1, ...customers.map(c => c.visits))
  const regularCount     = customers.filter(c => c.status === 'regulier').length
  const vipCount         = customers.filter(c => c.status === 'vip').length
  const nouveauCount     = customers.filter(c => c.status === 'nouveau').length
  const insatisfaitCount = customers.filter(c => c.status === 'insatisfait').length

  // Destinataires campagne : email renseigné + marketingConsent actif, par segment.
  const eligibleFor = (seg: CampaignSegment) =>
    customers.filter(c => (seg === 'all' || c.status === seg) && c.consent && !!c.marketingId)
  const recipientIds = eligibleFor(segment)
    .map(c => c.marketingId)
    .filter((id): id is Id<'customers'> => !!id)
  const canSendCampaign = !sending && subject.trim() !== '' && campaignBody.trim() !== '' && recipientIds.length > 0

  async function handleSendCampaign() {
    if (!canSendCampaign || !restaurantId) return
    setSending(true)
    try {
      const res = await sendCampaign({
        restaurantId,
        customerIds: recipientIds,
        subject: subject.trim(),
        body: campaignBody,
        restaurantName: restaurant?.name ?? 'le restaurant',
      })
      if (res.sent > 0) {
        toast.success(`${res.sent} email${res.sent > 1 ? 's' : ''} envoyé${res.sent > 1 ? 's' : ''}${res.failed > 0 ? ` · ${res.failed} échec${res.failed > 1 ? 's' : ''}` : ''}`)
      } else {
        toast.error(`Aucun email envoyé${res.failed > 0 ? ` (${res.failed} échec${res.failed > 1 ? 's' : ''})` : ''}`)
      }
      setEmailModal(false)
      setSubject(''); setCampaignBody(''); setPreview(false); setSegment('all')
    } catch {
      toast.error("Échec de l'envoi de la campagne")
    } finally {
      setSending(false)
    }
  }

  const ratedCustomers = customers.filter(c => c.rating > 0)
  const avgRating = ratedCustomers.length > 0
    ? (ratedCustomers.reduce((s, c) => s + c.rating, 0) / ratedCustomers.length).toFixed(1)
    : '—'
  const avgBasket = customers.length > 0
    ? (customers.reduce((s, c) => s + c.avg, 0) / customers.length).toFixed(2).replace('.', ',')
    : '—'

  function exportCsv() {
    const header = ['Prénom','Nom','Email','Statut','Visites','Panier moy (€)','Total (€)','Dernière visite','Note']
    const rows = customers.map(c => [
      c.first, c.last, c.email, STATUS_LABEL[c.status],
      c.visits, c.avg.toFixed(2).replace('.', ','), c.total.toFixed(2).replace('.', ','),
      c.lastIso, c.rating.toFixed(1),
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'clients-splitzy.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all',        label: 'Tous',        count: customers.length },
    { key: 'regulier',   label: 'Réguliers',   count: regularCount },
    { key: 'vip',        label: 'VIP',         count: vipCount },
    { key: 'nouveau',    label: 'Nouveaux',    count: nouveauCount },
    { key: 'insatisfait',label: 'Insatisfaits',count: insatisfaitCount },
  ]

  const visible = customers.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter
    const matchSearch = !search || `${c.first} ${c.last} ${c.email}`.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <RestaurantLayout>
      <PageHeader
        title="Clients"
        subtitle={
          <span>
            {customers.length} clients · {regularCount} réguliers · {vipCount} VIP · {nouveauCount} nouveaux
          </span>
        }
        actions={
          <>
            <button
              onClick={() => window.print()}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Printer size={14} />
              Imprimer rapport
            </button>
            <button
              onClick={exportCsv}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg border text-[13px] font-medium"
              style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)', boxShadow: 'var(--ds-shadow-sm)' }}
            >
              <Download size={14} />
              Exporter CSV
            </button>
            <button
              onClick={() => setEmailModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: '#E8920A' }}
            >
              <Mail size={13} />
              Campagne email
            </button>
          </>
        }
      />

      <div className="px-9 py-6 space-y-5">

        {/* KPI grid */}
        <section
          className="grid grid-cols-2 xl:grid-cols-4 border rounded-[12px] overflow-hidden"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          {[
            { icon: Users,      label: 'Total clients',       value: String(customers.length), sub: `${vipCount} VIP · ${regularCount} réguliers` },
            { icon: Users,      label: 'Clients réguliers',   value: String(regularCount), sub: customers.length > 0 ? `${Math.round(regularCount / customers.length * 100)}% de la base` : '—' },
            { icon: TrendingUp, label: 'Panier moyen',        value: `${avgBasket}€`, sub: `sur ${payments.length} paiements`, accent: true },
            { icon: Star,       label: 'Note moyenne donnée', value: `${avgRating} ★`, sub: `${feedbacks.length} feedback${feedbacks.length !== 1 ? 's' : ''}` },
          ].map((kpi, i) => (
            <div
              key={i}
              className="flex flex-col gap-1 px-5 py-4"
              style={{ borderRight: i < 3 ? `1px solid var(--ds-border)` : 'none' }}
            >
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
                <kpi.icon size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
                {kpi.label}
              </div>
              <div
                className="font-extrabold tabular-nums leading-none tracking-[-0.025em]"
                style={{ fontSize: '22px', color: kpi.accent ? 'var(--ds-accent)' : 'var(--ds-text-primary)', fontFamily: 'Inter, sans-serif', marginTop: '4px' }}
              >
                {kpi.value}
              </div>
              <div className="text-[11.5px] ds-text-tertiary">{kpi.sub}</div>
            </div>
          ))}
        </section>

        {/* Insight strip */}
        {customers.length >= 2 && (
        <div
          className="flex items-start gap-3 px-5 py-4 rounded-[10px] border-l-[3px]"
          style={{
            background: 'var(--ds-bg-surface)',
            border: '1px solid var(--ds-border)',
            borderLeftWidth: '3px',
            borderLeftColor: '#E8920A',
            boxShadow: 'var(--ds-shadow-sm)',
          }}
        >
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--ds-accent-soft)' }}
          >
            <Sparkles size={14} style={{ color: '#E8920A' }} />
          </div>
          <p className="flex-1 text-[13px] ds-text-primary leading-[1.55]">
            <strong>{fullName(customers[0])}</strong> et <strong>{fullName(customers[1])}</strong> sont vos meilleurs clients ({customers[0].total.toFixed(0)}€ et {customers[1].total.toFixed(0)}€ dépensés). Lancez une campagne de fidélité ciblée pour maximiser leur rétention.
          </p>
          <button className="text-[12px] font-semibold flex-shrink-0 ds-text-accent hover:ds-text-accent-strong transition-colors">
            Créer la campagne →
          </button>
        </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
          <div
            className="flex items-center gap-2 h-8 px-2.5 rounded-lg border w-64"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            <Search size={13} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un client…"
              className="flex-1 bg-transparent border-none outline-none min-w-0"
              style={{ fontSize: '13px', color: 'var(--ds-text-primary)' }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="ds-panel">
          {/* Header */}
          <div
            className="grid text-[10.5px] font-bold uppercase tracking-[0.07em] px-5 py-2.5"
            style={{
              gridTemplateColumns: '2fr 100px 80px 80px 80px 100px 80px 40px',
              background: 'var(--ds-bg-subtle)',
              color: 'var(--ds-text-tertiary)',
              borderBottom: '1px solid var(--ds-border)',
            }}
          >
            <div>Client</div>
            <div>Statut</div>
            <div>Visites</div>
            <div className="text-right">Panier</div>
            <div className="text-right">Total</div>
            <div>Dernière visite</div>
            <div>Note</div>
            <div />
          </div>

          {/* Rows */}
          {visible.length === 0 ? (
            <div className="py-12 text-center text-[13px] ds-text-tertiary">Aucun client trouvé.</div>
          ) : (
            visible.map((c, i) => (
              <div
                key={c.id}
                className="grid items-center px-5 py-3.5 border-b cursor-pointer transition-colors hover:ds-bg-subtle"
                style={{
                  gridTemplateColumns: '2fr 100px 80px 80px 80px 100px 80px 40px',
                  borderColor: 'var(--ds-border)',
                  background: i % 2 === 1 ? 'var(--ds-bg-base)' : 'var(--ds-bg-surface)',
                }}
                onClick={() => setSelected(c)}
              >
                {/* Client */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center font-bold text-[12px] flex-shrink-0"
                    style={{ background: c.color, color: c.text }}
                  >
                    {initials(c)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[13px] ds-text-primary truncate">{fullName(c)}</div>
                    {c.email && <div className="text-[11.5px] ds-text-tertiary truncate">{c.email}</div>}
                    {c.realContact && c.phone && (
                      <div className="flex items-center gap-1 text-[11.5px] ds-text-tertiary truncate">
                        <Phone size={10} className="flex-shrink-0" />{c.phone}
                      </div>
                    )}
                  </div>
                </div>
                {/* Status */}
                <div>
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[3px] rounded-full"
                    style={{ background: STATUS_STYLE[c.status].bg, color: STATUS_STYLE[c.status].color }}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                {/* Visits */}
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[13px] ds-text-primary tabular-nums">{c.visits}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ds-bg-subtle)', maxWidth: '32px' }}>
                    <div className="h-full rounded-full" style={{ width: `${(c.visits / maxVisits) * 100}%`, background: '#E8920A' }} />
                  </div>
                </div>
                {/* Basket */}
                <div className="text-right font-semibold text-[13px] ds-text-primary tabular-nums">
                  {c.avg.toFixed(2).replace('.', ',')}€
                </div>
                {/* Total */}
                <div className="text-right font-semibold text-[13px] ds-text-accent tabular-nums">
                  {c.total.toFixed(0)}€
                </div>
                {/* Last visit */}
                <div className="text-[12px] ds-text-secondary">{c.lastVisit}</div>
                {/* Rating */}
                <div className="flex items-center gap-1">
                  <Star size={12} fill="#E8920A" stroke="#E8920A" />
                  <span className="font-semibold text-[13px] ds-text-primary tabular-nums">{c.rating.toFixed(1)}</span>
                </div>
                {/* Arrow */}
                <div>
                  <ChevronRight size={15} style={{ color: 'var(--ds-text-tertiary)' }} />
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'var(--ds-border)' }}>
            <span className="text-[12px] ds-text-tertiary">{visible.length} clients</span>
            <div className="flex items-center gap-1">
              {[1, 2].map(p => (
                <button key={p} className="w-7 h-7 rounded-md text-[12px] font-medium" style={{ background: p === 1 ? '#E8920A' : 'none', color: p === 1 ? 'white' : 'var(--ds-text-secondary)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Campaign email modal */}
      <AnimatePresence>
        {emailModal && (
          <m.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setEmailModal(false) }}>
            <m.div className="rounded-2xl overflow-hidden w-[460px] max-w-full" style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }} initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <span className="font-bold text-[15px] ds-text-primary">Campagne email</span>
                <button onClick={() => setEmailModal(false)} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
              </div>
              <div className="px-5 py-5 space-y-4 max-h-[68vh] overflow-y-auto">
                {/* Segment */}
                <div>
                  <label className="block text-[11px] font-semibold ds-text-secondary mb-2 uppercase tracking-wide">Cible</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CAMPAIGN_SEGMENTS.map(s => {
                      const count = eligibleFor(s.key).length
                      const active = segment === s.key
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => setSegment(s.key)}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl border text-[13px] font-medium transition-colors"
                          style={{
                            borderColor: active ? '#E8920A' : 'var(--ds-border)',
                            background: active ? 'var(--ds-accent-soft)' : 'var(--ds-bg-surface)',
                            color: active ? '#B8730A' : 'var(--ds-text-primary)',
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full border flex items-center justify-center" style={{ borderColor: active ? '#E8920A' : 'var(--ds-border-strong)' }}>
                              {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E8920A' }} />}
                            </span>
                            {s.label}
                          </span>
                          <span className="text-[12px] ds-text-tertiary">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11.5px] ds-text-tertiary mt-2">
                    {recipientIds.length} client{recipientIds.length > 1 ? 's' : ''} éligible{recipientIds.length > 1 ? 's' : ''} — email renseigné + consentement marketing.
                  </p>
                </div>

                {/* Sujet */}
                <div>
                  <label className="block text-[11px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-wide">Sujet</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Une offre rien que pour vous 🎁"
                    className="w-full h-10 px-3 rounded-xl border text-[14px] outline-none focus:border-[#E8920A]"
                    style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                  />
                </div>

                {/* Corps */}
                <div>
                  <label className="block text-[11px] font-semibold ds-text-secondary mb-1.5 uppercase tracking-wide">Message</label>
                  <textarea
                    value={campaignBody}
                    onChange={e => setCampaignBody(e.target.value)}
                    rows={5}
                    placeholder={"Bonjour,\n\nCette semaine, profitez de…\n\nÀ très vite !"}
                    className="w-full px-3 py-2.5 rounded-xl border text-[14px] outline-none resize-none leading-[1.6] focus:border-[#E8920A]"
                    style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-primary)' }}
                  />
                </div>

                {/* Toggle aperçu */}
                <button type="button" onClick={() => setPreview(p => !p)} className="text-[13px] font-semibold" style={{ color: '#E8920A' }}>
                  {preview ? "Masquer l'aperçu" : "Afficher l'aperçu"}
                </button>

                {preview && (
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--ds-border)' }}>
                    <div style={{ background: '#0A0A0A', padding: '16px 18px', color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
                      {restaurant?.name ?? 'Votre restaurant'}
                    </div>
                    <div style={{ padding: '16px 18px', color: '#18181B', fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-wrap', background: '#fff' }}>
                      {campaignBody.trim() || 'Votre message apparaîtra ici.'}
                    </div>
                    <div style={{ padding: '12px 18px 16px', borderTop: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11, lineHeight: 1.5, background: '#fff' }}>
                      Vous recevez cet email car vous avez accepté les offres de {restaurant?.name ?? 'ce restaurant'} via Splitzy.<br />
                      <span style={{ textDecoration: 'underline' }}>Se désabonner</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 pb-5 pt-1">
                <button
                  onClick={handleSendCampaign}
                  disabled={!canSendCampaign}
                  className="w-full rounded-xl text-sm font-semibold py-2.5 flex items-center justify-center gap-2 text-white transition-opacity"
                  style={{ background: '#E8920A', opacity: canSendCampaign ? 1 : 0.5, cursor: canSendCampaign ? 'pointer' : 'not-allowed' }}
                >
                  {sending
                    ? 'Envoi en cours…'
                    : <><Send size={14} /> Envoyer à {recipientIds.length} client{recipientIds.length > 1 ? 's' : ''}</>}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {selected && restaurantId && (
        <CustomerDrawer
          customer={selected}
          restaurantId={restaurantId}
          tablePayments={selected.groupPayments}
          tableFeedbacks={selected.groupFeedbacks}
          onClose={() => setSelected(null)}
        />
      )}
    </RestaurantLayout>
  )
}
