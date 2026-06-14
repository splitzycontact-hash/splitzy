import { useMemo, useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { toast } from 'sonner'
import { CalendarDays, Plus, Check, X, Clock, Mail, CalendarClock, Hourglass } from 'lucide-react'
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

const GRID_COLS = '1.6fr 1.4fr 1.4fr 1fr 0.7fr'

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
// "YYYY-MM-DD" → "lundi 16 juin 2026" (parsé en date locale, pas UTC).
function frDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function Planning() {
  const restaurantId = useRestaurantId()
  const restaurant = useRestaurant()
  const restaurantName = restaurant?.name ?? 'Splitzy'

  const [period, setPeriod] = useState<PeriodKind>('upcoming')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showConvoke, setShowConvoke] = useState(false)

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

  // Groupes par date — structure du tableau ; le contenu détaillé des lignes est
  // rempli en partie 2 (placeholders pour l'instant).
  const groups = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows ?? []) map.set(r.shiftDate, (map.get(r.shiftDate) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
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

        {/* Tableau principal — structure ; lignes détaillées remplies en partie 2 */}
        <section
          className="rounded-[12px] border overflow-hidden"
          style={{ background: 'var(--ds-bg-surface)', borderColor: 'var(--ds-border)', boxShadow: 'var(--ds-shadow-sm)' }}
        >
          <div
            className="grid items-center gap-3 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] ds-text-tertiary border-b"
            style={{ gridTemplateColumns: GRID_COLS, borderColor: 'var(--ds-border)', background: 'var(--ds-bg-base)' }}
          >
            <span>Extra</span>
            <span>Skills</span>
            <span>Date &amp; horaire</span>
            <span>Statut</span>
            <span className="text-right">Action</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Clock size={20} style={{ color: 'var(--ds-text-tertiary)' }} className="animate-pulse" />
              <p className="text-[13px] ds-text-tertiary">Chargement…</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-6">
              <CalendarClock size={24} style={{ color: 'var(--ds-text-tertiary)' }} />
              <p className="text-[14px] font-semibold ds-text-primary">Aucune convocation sur cette période</p>
              <p className="text-[12.5px] ds-text-tertiary max-w-[300px]">
                {period === 'custom' && !range
                  ? 'Sélectionnez une plage de dates pour afficher le planning.'
                  : 'Cliquez sur « Nouvelle convocation » pour solliciter un extra.'}
              </p>
            </div>
          ) : (
            <div>
              {groups.map(([date, count]) => (
                <div key={date}>
                  {/* Séparateur de jour */}
                  <div
                    className="px-5 py-2 text-[12px] font-semibold ds-text-secondary border-b first-letter:uppercase"
                    style={{ background: 'var(--ds-bg-base)', borderColor: 'var(--ds-border)' }}
                  >
                    {frDateLong(date)} · {count} extra{count !== 1 ? 's' : ''}
                  </div>
                  {/* Lignes placeholder (contenu détaillé = partie 2) */}
                  {Array.from({ length: count }).map((_, j) => (
                    <div
                      key={j}
                      className="grid items-center gap-3 px-5 py-3 border-b"
                      style={{ gridTemplateColumns: GRID_COLS, borderColor: 'var(--ds-border)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full shrink-0" style={{ background: 'var(--ds-bg-subtle)' }} />
                        <div className="h-3 w-24 rounded" style={{ background: 'var(--ds-bg-subtle)' }} />
                      </div>
                      <div className="h-3 w-20 rounded" style={{ background: 'var(--ds-bg-subtle)' }} />
                      <div className="h-3 w-28 rounded" style={{ background: 'var(--ds-bg-subtle)' }} />
                      <div className="h-3 w-16 rounded" style={{ background: 'var(--ds-bg-subtle)' }} />
                      <div className="h-3 w-10 rounded justify-self-end" style={{ background: 'var(--ds-bg-subtle)' }} />
                    </div>
                  ))}
                </div>
              ))}
              <div className="px-5 py-2.5 text-[11.5px] ds-text-tertiary text-center">
                Détail des lignes disponible prochainement.
              </div>
            </div>
          )}
        </section>
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
