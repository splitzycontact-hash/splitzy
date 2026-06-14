import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useAction } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { toast } from 'sonner'
import { CalendarDays, Plus, Check, X, Clock, Mail, CalendarClock, Hourglass, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useRestaurantId, useRestaurant } from '../context/RestaurantContext'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'

// Libellés des compétences — miroir de la liste Paramètres → Équipe, dupliqué ici
// volontairement pour ne pas coupler Planning à Settings (page non modifiée).
const SKILL_LABEL: Record<string, string> = {
  serveur: 'Serveur', barman: 'Barman', cuisine: 'Cuisine',
  caisse: 'Caisse', livraison: 'Livraison', autre: 'Autre',
}

type PeriodKind = 'upcoming' | 'week' | 'month' | 'custom'

const PERIOD_TABS: { key: PeriodKind; label: string }[] = [
  { key: 'upcoming', label: 'À venir' },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'custom', label: 'Personnalisé' },
]

const inputStyle = {
  background: 'var(--ds-bg-surface)',
  borderColor: 'var(--ds-border)',
  color: 'var(--ds-text-primary)',
  fontSize: '16px',
} as const

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function weekRange(now = new Date()): { from: string; to: string } {
  const dow = (now.getDay() + 6) % 7 // lundi = 0
  const mon = new Date(now); mon.setDate(now.getDate() - dow)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { from: ymd(mon), to: ymd(sun) }
}
function monthRange(now = new Date()): { from: string; to: string } {
  return {
    from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}
// Date → "15/06"
function dmLabel(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
// "12:00" → "12h" ; "12:30" → "12h30"
function frTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':')
  return m && m !== '00' ? `${h}h${m}` : `${h}h`
}
// "12h–16h" (ou "" sans heure de début)
function timeLabel(start: string, end: string): string {
  if (!start) return ''
  return end ? `${frTime(start)}–${frTime(end)}` : frTime(start)
}
type PlanningRow = FunctionReturnType<typeof api.planning.getUpcoming>[number]

// Grille hebdo — noms courts (lundi=0) + couleurs d'avatar cycliques (amber/blue/green/purple).
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const AVATAR_COLORS = [
  { bg: '#FEF3C7', color: '#B45309' }, // amber
  { bg: '#DBEAFE', color: '#1E40AF' }, // blue
  { bg: '#DCFCE7', color: '#166534' }, // green
  { bg: '#EDE9FE', color: '#6D28D9' }, // purple
]

// Les 7 jours (lundi → dimanche) de la semaine décalée de `offsetWeeks` semaines.
function weekDaysFrom(offsetWeeks: number): Date[] {
  const now = new Date()
  const dow = (now.getDay() + 6) % 7 // lundi = 0
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + offsetWeeks * 7)
  return Array.from({ length: 7 }, (_, i) =>
    new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i),
  )
}

export function Planning() {
  const restaurantId = useRestaurantId()
  const restaurant = useRestaurant()
  const restaurantName = restaurant?.name ?? 'Splitzy'

  const [period, setPeriod] = useState<PeriodKind>('upcoming')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showConvoke, setShowConvoke] = useState(false)
  const resend = useAction(api.planning.resend)
  const [resendingId, setResendingId] = useState<string | null>(null)

  async function handleResend(convocationId: Id<'extraConvocations'>, firstName: string) {
    if (resendingId) return
    setResendingId(convocationId)
    try {
      const res = await resend({ convocationId })
      if (res.success) toast.success(`Email de relance envoyé à ${firstName}`)
      else toast.error(res.error || 'Échec de la relance')
    } catch {
      toast.error('Échec de la relance')
    } finally {
      setResendingId(null)
    }
  }

  const range = useMemo<{ from: string; to: string } | null>(() => {
    if (period === 'week') return weekRange()
    if (period === 'month') return monthRange()
    if (period === 'custom') return customFrom && customTo ? { from: customFrom, to: customTo } : null
    return null
  }, [period, customFrom, customTo])

  const upcoming = useQuery(
    api.planning.getUpcoming,
    restaurantId && period === 'upcoming' ? { restaurantId } : 'skip',
  )
  const byPeriod = useQuery(
    api.planning.getByPeriod,
    restaurantId && range ? { restaurantId, dateFrom: range.from, dateTo: range.to } : 'skip',
  )
  const rows = period === 'upcoming' ? upcoming : byPeriod
  const loading = rows === undefined && (period === 'upcoming' || range !== null)

  const stats = useMemo(() => {
    const list = rows ?? []
    const confirmed = list.filter(r => r.response === 'accepted').length
    const declined = list.filter(r => r.response === 'declined').length
    return { total: list.length, confirmed, declined, pending: list.length - confirmed - declined }
  }, [rows])

  return (
    <RestaurantLayout>
      <PageHeader
        title="Planning des extras"
        subtitle={
          <span>
            {stats.total} convocation{stats.total !== 1 ? 's' : ''} sur la période · {stats.confirmed} confirmée{stats.confirmed !== 1 ? 's' : ''}
          </span>
        }
        actions={
          <button
            onClick={() => setShowConvoke(true)}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] h-8 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: '#E8920A' }}
          >
            <Plus size={14} /> Nouvelle convocation
          </button>
        }
      />

      <div className="px-9 py-6 space-y-5">
        {/* Sélecteur de période */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div
            className="inline-flex rounded-[10px] p-[3px] gap-px border"
            style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
          >
            {PERIOD_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-[7px] text-[12.5px] transition-colors"
                style={{
                  background: period === key ? 'var(--ds-bg-subtle)' : 'none',
                  color: period === key ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                  fontWeight: period === key ? 600 : 500,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="h-8 px-2.5 rounded-lg border text-[13px] outline-none" style={inputStyle}
              />
              <span className="ds-text-tertiary text-[13px]">→</span>
              <input
                type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="h-8 px-2.5 rounded-lg border text-[13px] outline-none" style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* Cartes résumé — calculées depuis les données de la période */}
        <section
          className="grid grid-cols-2 xl:grid-cols-4 border rounded-[12px] overflow-hidden"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          {[
            { icon: CalendarDays, label: 'Extras convoqués', value: stats.total, color: 'var(--ds-text-primary)' },
            { icon: Check, label: 'Ont confirmé', value: stats.confirmed, color: 'var(--ds-success-strong)' },
            { icon: X, label: 'Ont décliné', value: stats.declined, color: 'var(--ds-error-strong)' },
            { icon: Hourglass, label: 'En attente', value: stats.pending, color: 'var(--ds-text-secondary)' },
          ].map((kpi, i) => (
            <div
              key={i}
              className="flex flex-col gap-1 px-5 py-4"
              style={{ borderRight: i < 3 ? '1px solid var(--ds-border)' : 'none' }}
            >
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] ds-text-secondary">
                <kpi.icon size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
                {kpi.label}
              </div>
              <div
                className="font-extrabold tabular-nums leading-none tracking-[-0.025em]"
                style={{ fontSize: '22px', color: kpi.color, marginTop: '4px' }}
              >
                {loading ? '—' : kpi.value}
              </div>
            </div>
          ))}
        </section>

        {/* Grille visuelle hebdomadaire — une ligne par extra, une colonne par jour */}
        <WeekGrid restaurantId={restaurantId} onResend={handleResend} resendingId={resendingId} />
      </div>

      {showConvoke && (
        <ConvokeModal
          restaurantId={restaurantId}
          restaurantName={restaurantName}
          onClose={() => setShowConvoke(false)}
        />
      )}
    </RestaurantLayout>
  )
}

// Ligne agrégée d'un extra dans la grille hebdo : ses convocations indexées par jour.
type ExtraRow = {
  extraId: Id<'extras'>
  firstName: string
  lastName: string
  skills: string[]
  byDate: Map<string, PlanningRow>
}

// Grille visuelle de la semaine : colonne gauche fixe (extra) + 7 colonnes jour.
// Données via planning.getByPeriod sur [lundi, dimanche] de la semaine affichée ;
// navigation ‹ › décale le dateFrom/dateTo de ±7 jours (relance la query).
function WeekGrid({
  restaurantId,
  onResend,
  resendingId,
}: {
  restaurantId: Id<'restaurants'> | null
  onResend: (id: Id<'extraConvocations'>, firstName: string) => void
  resendingId: string | null
}) {
  const [weekOffset, setWeekOffset] = useState(0)
  const days = useMemo(() => weekDaysFrom(weekOffset), [weekOffset])
  const dateFrom = ymd(days[0])
  const dateTo = ymd(days[6])
  const todayIso = ymd(new Date())

  const rows = useQuery(
    api.planning.getByPeriod,
    restaurantId ? { restaurantId, dateFrom, dateTo } : 'skip',
  )
  const loading = rows === undefined && restaurantId !== null

  // Agrège les convocations par extra puis par jour. Plusieurs convocations le même
  // jour : la plus récente l'emporte (rows triées sentAt ASC → le dernier set gagne).
  const extras = useMemo(() => {
    const map = new Map<string, ExtraRow>()
    for (const r of rows ?? []) {
      let e = map.get(r.extraId)
      if (!e) {
        e = { extraId: r.extraId, firstName: r.firstName, lastName: r.lastName, skills: r.skills, byDate: new Map() }
        map.set(r.extraId, e)
      }
      e.byDate.set(r.shiftDate, r)
    }
    return [...map.values()].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'fr'),
    )
  }, [rows])

  const monthLabel = days[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const GRID = '150px repeat(7, 1fr)'
  const todayColBg = 'rgba(245,158,11,0.04)'

  return (
    <section
      className="rounded-[12px] border overflow-hidden"
      style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
    >
      {/* Navigation semaine */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-bg-base)' }}
      >
        <div className="text-[13px] font-semibold ds-text-primary first-letter:uppercase">
          {monthLabel}
          <span className="ds-text-tertiary font-normal"> · {dmLabel(days[0])} – {dmLabel(days[6])}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            aria-label="Semaine précédente"
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border transition-colors"
            style={{ borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
          >
            <ChevronLeft size={15} />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-2 h-7 inline-flex items-center rounded-lg border text-[11.5px] font-medium transition-colors"
              style={{ borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
            >
              Aujourd'hui
            </button>
          )}
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            aria-label="Semaine suivante"
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border transition-colors"
            style={{ borderColor: 'var(--ds-border)', color: 'var(--ds-text-secondary)' }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* En-tête de grille : coin vide + 7 jours */}
      <div className="grid border-b" style={{ gridTemplateColumns: GRID, borderColor: 'var(--ds-border)' }}>
        <div />
        {days.map((d, i) => {
          const isToday = ymd(d) === todayIso
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-0.5 py-2.5 border-l"
              style={{ borderColor: 'var(--ds-border)', background: isToday ? todayColBg : undefined }}
            >
              <span className="text-[11px] uppercase tracking-wide ds-text-tertiary">{DAY_SHORT[i]}</span>
              {isToday ? (
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[13px] font-medium text-white"
                  style={{ background: '#F59E0B' }}
                >
                  {d.getDate()}
                </span>
              ) : (
                <span className="text-[16px] font-medium ds-text-primary leading-6">{d.getDate()}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Corps */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <Clock size={20} style={{ color: 'var(--ds-text-tertiary)' }} className="animate-pulse" />
          <p className="text-[13px] ds-text-tertiary">Chargement…</p>
        </div>
      ) : extras.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--ds-bg-subtle)' }}>
            <CalendarClock size={22} style={{ color: 'var(--ds-text-tertiary)' }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold ds-text-primary">Aucune convocation cette semaine</p>
            <p className="text-[12.5px] ds-text-tertiary max-w-[320px] mt-1">
              Naviguez entre les semaines ou convoquez un extra pour un service à venir.
            </p>
          </div>
        </div>
      ) : (
        <div>
          {extras.map((ex, idx) => {
            const initials = `${ex.firstName[0] ?? ''}${ex.lastName[0] ?? ''}`.toUpperCase() || '?'
            const av = AVATAR_COLORS[idx % AVATAR_COLORS.length]
            return (
              <div
                key={ex.extraId}
                className="grid border-b"
                style={{ gridTemplateColumns: GRID, borderColor: 'var(--ds-border)' }}
              >
                {/* Colonne extra fixe */}
                <div className="flex items-center gap-2 px-3 py-2.5 min-w-0">
                  <div
                    className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: av.bg, color: av.color }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium ds-text-primary truncate">
                      {ex.firstName} {ex.lastName}
                    </div>
                    {ex.skills.length > 0 && (
                      <div className="text-[10px] ds-text-tertiary truncate">
                        {ex.skills.map(s => SKILL_LABEL[s] ?? s).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
                {/* 7 cellules statut */}
                {days.map((d, i) => {
                  const isToday = ymd(d) === todayIso
                  return (
                    <div
                      key={i}
                      className="border-l p-1.5 flex items-stretch"
                      style={{ borderColor: 'var(--ds-border)', background: isToday ? todayColBg : undefined }}
                    >
                      <StatusCell conv={ex.byDate.get(ymd(d))} onResend={onResend} resendingId={resendingId} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Légende */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-t"
        style={{ borderColor: 'var(--ds-border)', background: 'var(--ds-bg-base)' }}
      >
        <LegendItem label="Disponible" swatch={<span className="w-3 h-3 rounded-[3px]" style={{ background: '#D1FAE5' }} />} />
        <LegendItem label="Non disponible" swatch={<span className="w-3 h-3 rounded-[3px]" style={{ background: '#FEE2E2' }} />} />
        <LegendItem
          label="En attente"
          swatch={<span className="w-3 h-3 rounded-[3px] border border-dashed" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)' }} />}
        />
        <LegendItem label="Pas convoqué" swatch={<span className="ds-text-tertiary text-[13px] leading-none">—</span>} />
      </div>
    </section>
  )
}

// Une cellule jour × extra : disponible / non dispo / en attente / pas convoqué.
function StatusCell({
  conv,
  onResend,
  resendingId,
}: {
  conv: PlanningRow | undefined
  onResend: (id: Id<'extraConvocations'>, firstName: string) => void
  resendingId: string | null
}) {
  if (!conv) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="ds-text-tertiary text-[13px] leading-none">—</span>
      </div>
    )
  }
  if (conv.response === 'accepted') {
    const when = timeLabel(conv.shiftStart, conv.shiftEnd)
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center rounded-[6px] py-1"
        style={{ background: '#D1FAE5', color: '#065F46' }}
      >
        <span className="text-[11px] font-medium">✓ Dispo</span>
        {when && <span className="text-[10px]">{when}</span>}
      </div>
    )
  }
  if (conv.response === 'declined') {
    return (
      <div
        className="flex-1 flex items-center justify-center rounded-[6px] py-1"
        style={{ background: '#FEE2E2', color: '#991B1B' }}
      >
        <span className="text-[11px] font-medium">✗ Non dispo</span>
      </div>
    )
  }
  // En attente (response 'pending' ou null)
  const isResending = resendingId === conv.convocationId
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center rounded-[6px] py-1"
      style={{ background: 'var(--ds-bg-subtle)', border: '0.5px dashed var(--ds-border)' }}
    >
      <span className="text-[11px] ds-text-tertiary">⏳ En attente</span>
      <button
        onClick={() => onResend(conv.convocationId, conv.firstName)}
        disabled={isResending}
        className="text-[10px] underline disabled:opacity-50"
        style={{ color: '#F59E0B' }}
      >
        {isResending ? 'Envoi…' : 'Relancer'}
      </button>
    </div>
  )
}

function LegendItem({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] ds-text-secondary">
      {swatch}
      {label}
    </span>
  )
}

// Modal de convocation standalone — réutilise l'action extras.convoke (et la query
// extras.list pour le choix de l'extra). Sélection de l'extra en premier, puis le
// détail du service. Aucune dépendance à Settings.tsx.
function ConvokeModal({
  restaurantId,
  restaurantName,
  onClose,
}: {
  restaurantId: Id<'restaurants'> | null
  restaurantName: string
  onClose: () => void
}) {
  const extras = useQuery(api.extras.list, restaurantId ? { restaurantId } : 'skip')
  const convoke = useAction(api.extras.convoke)
  const [extraId, setExtraId] = useState<Id<'extras'> | ''>('')
  const [form, setForm] = useState({
    shiftDate: '', shiftStart: '', shiftEnd: '',
    subject: `[${restaurantName}] Demande de disponibilité`,
    message: '',
  })
  const [sending, setSending] = useState(false)
  const selected = extras?.find(e => e._id === extraId) ?? null

  async function send() {
    if (!extraId || sending) return
    if (!form.message.trim()) {
      toast.error("Ajoutez un message avant d'envoyer")
      return
    }
    setSending(true)
    try {
      const res = await convoke({
        extraId,
        subject: form.subject.trim() || `[${restaurantName}] Demande de disponibilité`,
        message: form.message,
        shiftDate: form.shiftDate || undefined,
        shiftStart: form.shiftStart || undefined,
        shiftEnd: form.shiftEnd || undefined,
      })
      if (res.success) {
        toast.success(`Email envoyé à ${selected?.firstName ?? "l'extra"}`)
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
        className="rounded-2xl overflow-hidden w-[500px] max-w-full max-h-[90vh] flex flex-col"
        style={{ background: 'var(--ds-bg-surface)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--ds-border)' }}>
          <div className="font-bold text-[15px] ds-text-primary">Nouvelle convocation</div>
          <button onClick={onClose} className="ds-text-tertiary hover:ds-text-primary"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Sélection de l'extra en premier */}
          <div>
            <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Extra à convoquer</label>
            {extras === undefined ? (
              <div className="h-10 rounded-lg border animate-pulse" style={{ background: 'var(--ds-bg-subtle)', borderColor: 'var(--ds-border)' }} />
            ) : extras.length === 0 ? (
              <p className="text-[12.5px] ds-text-tertiary py-2">
                Aucun extra enregistré. Ajoutez-en dans Paramètres → Équipe.
              </p>
            ) : (
              <select
                value={extraId}
                onChange={e => setExtraId(e.target.value as Id<'extras'>)}
                className="w-full rounded-lg border px-3 py-2 outline-none"
                style={inputStyle}
              >
                <option value="">Sélectionner un extra…</option>
                {extras.map(ex => (
                  <option key={ex._id} value={ex._id}>
                    {ex.firstName} {ex.lastName}
                    {ex.skills.length ? ` — ${ex.skills.map(s => SKILL_LABEL[s] ?? s).join(', ')}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selected && (
            <>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Date du service</label>
                <input
                  type="date" value={form.shiftDate}
                  onChange={e => setForm(f => ({ ...f, shiftDate: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 outline-none" style={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Heure de début</label>
                  <input
                    type="time" value={form.shiftStart}
                    onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 outline-none" style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Heure de fin</label>
                  <input
                    type="time" value={form.shiftEnd}
                    onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 outline-none" style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Objet de l'email</label>
                <input
                  type="text" value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 outline-none" style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold ds-text-primary mb-1.5">Message</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={4}
                  placeholder={`Bonjour ${selected.firstName}, nous avons besoin de toi…`}
                  className="w-full rounded-lg border px-3 py-2 outline-none resize-none" style={inputStyle}
                />
                <p className="text-[11.5px] ds-text-tertiary mt-1.5">
                  L'email part de noreply@splitzy.fr ; l'extra répond via les boutons du message.
                </p>
              </div>
            </>
          )}
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
            onClick={send}
            disabled={sending || !extraId || !form.message.trim()}
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
