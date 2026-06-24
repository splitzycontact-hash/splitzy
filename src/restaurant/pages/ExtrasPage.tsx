import { useState } from 'react'
import { useQuery, useAction, useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { toast } from 'sonner'
import {
  Users, Plus, Star, Mail, X, CalendarClock, Phone, Briefcase, Check, Hourglass,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { useRestaurantId, useRestaurant } from '../context/RestaurantContext'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'

// Libellés des compétences / postes — miroir de Paramètres → Équipe et Planning.
const SKILL_LABEL: Record<string, string> = {
  serveur: 'Serveur', barman: 'Barman', cuisine: 'Cuisine',
  caisse: 'Caisse', livraison: 'Livraison', autre: 'Autre',
}
const ROLE_OPTIONS = ['serveur', 'barman', 'cuisine', 'caisse', 'livraison', 'autre'] as const

const inputStyle = {
  background: 'var(--ds-bg-surface)',
  borderColor: 'var(--ds-border)',
  color: 'var(--ds-text-primary)',
  fontSize: '16px',
} as const

const AVATAR_COLORS = [
  { bg: '#FEF3C7', color: '#B45309' }, // amber
  { bg: '#DBEAFE', color: '#1E40AF' }, // blue
  { bg: '#DCFCE7', color: '#166534' }, // green
  { bg: '#EDE9FE', color: '#6D28D9' }, // purple
]

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// "2026-06-21" → "21/06/2026"
function frDate(iso?: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}
// "12:00" → "12h" ; "12:30" → "12h30"
function frTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  return m && m !== '00' ? `${h}h${m}` : `${h}h`
}
function timeLabel(start: string, end: string): string {
  if (!start) return ''
  return end ? `${frTime(start)}–${frTime(end)}` : frTime(start)
}

type ExtraRow = FunctionReturnType<typeof api.extras.list>[number]
type ConvocationRow = FunctionReturnType<typeof api.extraConvocations.listByRestaurant>[number]

// Moyenne ★ d'un extra à partir de son tableau de notes (null si aucune note).
function avgRating(extra: ExtraRow): { avg: number; count: number } | null {
  const ratings = extra.ratings ?? []
  if (ratings.length === 0) return null
  const sum = ratings.reduce((acc, r) => acc + r.stars, 0)
  return { avg: sum / ratings.length, count: ratings.length }
}

// Rangée de 5 étoiles en lecture seule (remplissage selon la valeur arrondie).
function StarsReadonly({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          style={{ color: i <= rounded ? '#F59E0B' : 'var(--ds-border)' }}
          fill={i <= rounded ? '#F59E0B' : 'none'}
        />
      ))}
    </span>
  )
}

export function ExtrasPage() {
  const restaurantId = useRestaurantId()
  const restaurant = useRestaurant()
  const restaurantName = restaurant?.name ?? 'Splitzy'

  const [tab, setTab] = useState<'repertoire' | 'convocations'>('repertoire')
  const [shiftFor, setShiftFor] = useState<ExtraRow | null>(null)
  const [rateFor, setRateFor] = useState<ConvocationRow | null>(null)

  const extras = useQuery(api.extras.list, restaurantId ? { restaurantId } : 'skip')
  const convocations = useQuery(
    api.extraConvocations.listByRestaurant,
    restaurantId ? { restaurantId } : 'skip',
  )

  return (
    <RestaurantLayout>
      <PageHeader
        title="Extras"
        subtitle={
          <span>
            Pool de confiance · {extras?.length ?? '—'} extra{(extras?.length ?? 0) !== 1 ? 's' : ''} ·{' '}
            {convocations?.length ?? '—'} convocation{(convocations?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        }
      />

      {/* Onglets Répertoire / Convocations */}
      <div className="px-9 pt-6">
        <div
          className="inline-flex rounded-[10px] p-[3px] gap-px border"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          {([
            { key: 'repertoire' as const, label: 'Répertoire', icon: Users },
            { key: 'convocations' as const, label: 'Convocations', icon: CalendarClock },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="inline-flex items-center gap-1.5 px-3.5 py-[6px] rounded-[7px] text-[12.5px] transition-colors"
              style={{
                background: tab === key ? 'var(--ds-bg-subtle)' : 'none',
                color: tab === key ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                fontWeight: tab === key ? 600 : 500,
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'repertoire' && (
        <Repertoire extras={extras} onPropose={setShiftFor} />
      )}
      {tab === 'convocations' && (
        <Convocations convocations={convocations} onRate={setRateFor} />
      )}

      {shiftFor && (
        <ShiftDialog
          extra={shiftFor}
          restaurantName={restaurantName}
          onClose={() => setShiftFor(null)}
        />
      )}
      {rateFor && (
        <RatingDialog
          convocation={rateFor}
          onClose={() => setRateFor(null)}
        />
      )}
    </RestaurantLayout>
  )
}

// ─── Onglet Répertoire ───────────────────────────────────────────────────────────
function Repertoire({
  extras,
  onPropose,
}: {
  extras: ExtraRow[] | undefined
  onPropose: (e: ExtraRow) => void
}) {
  if (extras === undefined) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <Hourglass size={20} style={{ color: 'var(--ds-text-tertiary)' }} className="animate-pulse" />
        <p className="text-[13px] ds-text-tertiary">Chargement…</p>
      </div>
    )
  }
  if (extras.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--ds-bg-subtle)' }}>
          <Users size={22} style={{ color: 'var(--ds-text-tertiary)' }} />
        </div>
        <p className="text-[14px] font-semibold ds-text-primary">Aucun extra dans votre pool</p>
        <p className="text-[12.5px] ds-text-tertiary max-w-[340px]">
          Ajoutez des extras dans <span className="font-semibold ds-text-secondary">Paramètres → Équipe</span> pour pouvoir les convoquer.
        </p>
      </div>
    )
  }

  return (
    <div className="px-9 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {extras.map((ex, idx) => {
        const av = AVATAR_COLORS[idx % AVATAR_COLORS.length]
        const initials = `${ex.firstName[0] ?? ''}${ex.lastName[0] ?? ''}`.toUpperCase() || '?'
        const rating = avgRating(ex)
        return (
          <div
            key={ex._id}
            className="rounded-[12px] border p-4 flex flex-col gap-3"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                style={{ background: av.bg, color: av.color }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold ds-text-primary truncate">
                  {ex.firstName} {ex.lastName}
                </div>
                {rating ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StarsReadonly value={rating.avg} />
                    <span className="text-[11.5px] ds-text-secondary tabular-nums">
                      {rating.avg.toFixed(1)} · {rating.count} avis
                    </span>
                  </div>
                ) : (
                  <div className="text-[11.5px] ds-text-tertiary mt-0.5">Pas encore noté</div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-[12.5px] ds-text-secondary">
              {ex.skills.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Briefcase size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
                  <span className="truncate">{ex.skills.map(s => SKILL_LABEL[s] ?? s).join(' · ')}</span>
                </div>
              )}
              {ex.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
                  <a href={`tel:${ex.phone}`} className="hover:underline">{ex.phone}</a>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Mail size={13} style={{ color: 'var(--ds-text-tertiary)' }} />
                <span className="truncate">{ex.email}</span>
              </div>
            </div>

            <button
              onClick={() => onPropose(ex)}
              className="mt-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
              style={{ background: '#E8920A' }}
            >
              <Plus size={14} /> Proposer un shift
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Onglet Convocations ──────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  accepted: { label: 'Confirmé', bg: '#D1FAE5', color: '#065F46' },
  declined: { label: 'Refusé', bg: '#FEE2E2', color: '#991B1B' },
  counter_proposed: { label: 'Contre-proposition', bg: 'rgba(245,158,11,0.14)', color: '#92400E' },
  pending: { label: 'En attente', bg: 'var(--ds-bg-subtle)', color: 'var(--ds-text-secondary)' },
}

function Convocations({
  convocations,
  onRate,
}: {
  convocations: ConvocationRow[] | undefined
  onRate: (c: ConvocationRow) => void
}) {
  const todayIso = ymd(new Date())

  if (convocations === undefined) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20">
        <Hourglass size={20} style={{ color: 'var(--ds-text-tertiary)' }} className="animate-pulse" />
        <p className="text-[13px] ds-text-tertiary">Chargement…</p>
      </div>
    )
  }
  if (convocations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center px-6">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--ds-bg-subtle)' }}>
          <CalendarClock size={22} style={{ color: 'var(--ds-text-tertiary)' }} />
        </div>
        <p className="text-[14px] font-semibold ds-text-primary">Aucune convocation envoyée</p>
        <p className="text-[12.5px] ds-text-tertiary max-w-[340px]">
          Proposez un shift à un extra depuis l'onglet <span className="font-semibold ds-text-secondary">Répertoire</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="px-9 py-6">
      <div
        className="rounded-[12px] border overflow-hidden"
        style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ minWidth: 640 }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-bg-base)' }}>
                {['Date', 'Extra', 'Service', 'Statut', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] ds-text-tertiary"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {convocations.map(c => {
                const meta = STATUS_META[c.response ?? 'pending'] ?? STATUS_META.pending
                const isPast = !!c.shiftDate && c.shiftDate <= todayIso
                const canRate = c.response === 'accepted' && isPast
                return (
                  <tr key={c._id} className="border-b last:border-0" style={{ borderColor: 'var(--ds-border)' }}>
                    <td className="px-4 py-3 ds-text-primary tabular-nums whitespace-nowrap">
                      {c.shiftDate ? frDate(c.shiftDate) : <span className="ds-text-tertiary">—</span>}
                    </td>
                    <td className="px-4 py-3 ds-text-primary font-medium whitespace-nowrap">
                      {`${c.firstName} ${c.lastName}`.trim() || '—'}
                    </td>
                    <td className="px-4 py-3 ds-text-secondary whitespace-nowrap">
                      {timeLabel(c.shiftStart, c.shiftEnd) || <span className="ds-text-tertiary">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-semibold"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {canRate ? (
                        <button
                          onClick={() => onRate(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-semibold border transition-colors"
                          style={{
                            borderColor: c.rated ? 'var(--ds-border)' : '#F5DDB3',
                            background: c.rated ? 'var(--ds-bg-subtle)' : '#FFF8EC',
                            color: c.rated ? 'var(--ds-text-secondary)' : '#B45309',
                          }}
                        >
                          {c.rated ? (<><Check size={12} /> Noté</>) : (<><Star size={12} /> Noter</>)}
                        </button>
                      ) : (
                        <span className="ds-text-tertiary text-[12px]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Dialog « Proposer un shift » ──────────────────────────────────────────────────
function ShiftDialog({
  extra,
  restaurantName,
  onClose,
}: {
  extra: ExtraRow
  restaurantName: string
  onClose: () => void
}) {
  const convoke = useAction(api.extras.convoke)
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [role, setRole] = useState<string>(extra.skills[0] ?? 'serveur')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (sending) return
    if (!date) {
      toast.error('Choisissez une date de service')
      return
    }
    setSending(true)
    const roleLabel = SKILL_LABEL[role] ?? role
    const subject = `[${restaurantName}] ${roleLabel} — ${frDate(date)}`
    const when = timeLabel(start, end)
    const body = message.trim() ||
      `Bonjour ${extra.firstName}, nous avons besoin de toi en ${roleLabel} le ${frDate(date)}${when ? ` (${when})` : ''}.`
    try {
      const res = await convoke({
        extraId: extra._id,
        subject,
        message: body,
        shiftDate: date,
        shiftStart: start || undefined,
        shiftEnd: end || undefined,
      })
      if (res.success) {
        toast.success(`Email envoyé à ${extra.firstName}`)
        onClose()
      } else {
        toast.error(res.error || "Échec de l'envoi de la convocation")
      }
    } catch {
      toast.error("Échec de l'envoi de la convocation")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget && !sending) onClose() }}
    >
      <div
        className="rounded-2xl overflow-hidden w-[480px] max-w-full max-h-[90vh] flex flex-col"
        style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <div>
            <div className="font-bold text-[15px] ds-text-primary">Proposer un shift</div>
            <div className="text-[12.5px] ds-text-tertiary mt-0.5">{extra.firstName} {extra.lastName}</div>
          </div>
          <button onClick={onClose} disabled={sending} className="ds-text-tertiary hover:ds-text-primary disabled:opacity-50"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Date du service</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none" style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Heure de début</label>
              <input
                type="time" value={start} onChange={e => setStart(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 outline-none" style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Heure de fin</label>
              <input
                type="time" value={end} onChange={e => setEnd(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 outline-none" style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Poste</label>
            <select
              value={role} onChange={e => setRole(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none" style={inputStyle}
            >
              {ROLE_OPTIONS.map(r => (
                <option key={r} value={r}>{SKILL_LABEL[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Message (optionnel)</label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder={`Bonjour ${extra.firstName}, nous avons besoin de toi…`}
              className="w-full rounded-lg border px-3 py-2 outline-none resize-none" style={inputStyle}
            />
            <p className="text-[11.5px] ds-text-tertiary mt-1.5">
              L'email part de noreply@splitzy.fr ; l'extra répond via les boutons du message.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-6 py-4 border-t shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <button
            onClick={onClose}
            disabled={sending}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors disabled:opacity-50"
            style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={sending || !date}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: '#E8920A' }}
          >
            {sending ? 'Envoi…' : (<><Mail size={14} /> Envoyer la convocation</>)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dialog de notation ────────────────────────────────────────────────────────────
function RatingDialog({
  convocation,
  onClose,
}: {
  convocation: ConvocationRow
  onClose: () => void
}) {
  const addRating = useMutation(api.extras.addRating)
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const extraName = `${convocation.firstName} ${convocation.lastName}`.trim() || 'cet extra'

  async function submit() {
    if (saving) return
    if (stars < 1) {
      toast.error('Sélectionnez une note')
      return
    }
    setSaving(true)
    try {
      await addRating({
        extraId: convocation.extraId,
        convocationId: convocation._id,
        stars,
        comment: comment.trim() || undefined,
      })
      toast.success(`Note enregistrée pour ${convocation.firstName}`)
      onClose()
    } catch {
      toast.error("Échec de l'enregistrement de la note")
    } finally {
      setSaving(false)
    }
  }

  const display = hover || stars

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        className="rounded-2xl w-[380px] max-w-full"
        style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <div>
            <div className="text-[15px] font-bold ds-text-primary">Noter {extraName}</div>
            <div className="text-[12.5px] ds-text-tertiary mt-0.5">
              Service du {frDate(convocation.shiftDate) || '—'}
              {timeLabel(convocation.shiftStart, convocation.shiftEnd) ? ` · ${timeLabel(convocation.shiftStart, convocation.shiftEnd)}` : ''}
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="ds-text-tertiary hover:ds-text-primary disabled:opacity-50"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onClick={() => setStars(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  size={30}
                  style={{ color: i <= display ? '#F59E0B' : 'var(--ds-border)' }}
                  fill={i <= display ? '#F59E0B' : 'none'}
                />
              </button>
            ))}
          </div>
          <div>
            <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Commentaire (optionnel)</label>
            <textarea
              value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder="Ponctuel, professionnel, à rappeler…"
              className="w-full rounded-lg border px-3 py-2 outline-none resize-none" style={inputStyle}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors disabled:opacity-50"
            style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={saving || stars < 1}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: '#E8920A' }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer la note'}
          </button>
        </div>
      </div>
    </div>
  )
}
