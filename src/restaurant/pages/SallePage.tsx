import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { UserPlus, X, Check, Power, Users, Star, Unlock, Download, Coins, Send, ChefHat, PhoneCall, Crown, Zap, XCircle } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { useRestaurantId } from '../context/RestaurantContext'
import { RestaurantLayout } from '../layout/RestaurantLayout'
import { PageHeader } from '../components/PageHeader'
import FloorPlan, { type RosterEntry } from '../components/floor/FloorPlan'
import { SERVER_COLORS } from '../components/floor/floorColors'

// Module 3 — Service : vue opérationnelle live du plan de salle. On glisse un
// serveur du roster sur une table pour l'assigner (DnD), on pointe arrivées et
// on clôt le service. Le plan (positions/zones) se configure dans Paramètres →
// Tables & Plan ; ici on n'édite pas la disposition.

// id DnD d'un serveur draggable ("server:<memberId>") et d'une table droppable
// ("table:<tableId>"). Préfixés pour éviter toute collision d'id entre les deux.
const SERVER_PREFIX = 'server:'
const TABLE_PREFIX = 'table:'

// Date du jour (UTC) au format YYYY-MM-DD. DOIT matcher la clé lue par
// getServiceOverview (qui filtre sur `new Date().toISOString().slice(0,10)`),
// sinon un shift créé ici n'apparaîtrait pas dans le roster du jour.
function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

// M11-B — Libellés FR du mode de répartition (restaurants.tipSettings.mode) et
// du rôle d'un membre, affichés dans le récap de clôture.
const TIP_MODE_LABEL: Record<string, string> = {
  equal: 'Égalitaire',
  hours: 'Prorata heures',
  points: 'Par coefficient',
  table: 'Par table',
  revenue: 'Par CA',
}
const ROLE_LABEL: Record<string, string> = {
  owner: 'Propriétaire',
  manager: 'Manager',
  staff: 'Équipier',
}

// Serveur du roster, draggable. Affiche pastille colorée + pointage + retrait.
function DraggableServer({
  memberId, name, colorIndex, checkedIn, assignedCount, onCheckIn, onRemove,
}: {
  memberId: Id<'members'>
  name: string
  colorIndex: number
  checkedIn: boolean
  assignedCount: number
  onCheckIn: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${SERVER_PREFIX}${memberId}`,
  })
  const c = SERVER_COLORS[colorIndex]
  return (
    <div
      className="flex items-center gap-2 rounded-xl p-2.5 transition-opacity"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <button
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="flex items-center gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing touch-none text-left"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: c.border, width: 10, height: 10 }}
        />
        <span className="text-sm font-semibold truncate" style={{ color: c.text }}>{name}</span>
        {assignedCount > 0 && (
          <span className="text-[11px] font-bold shrink-0" style={{ color: c.text, opacity: 0.7 }}>
            · {assignedCount} table{assignedCount > 1 ? 's' : ''}
          </span>
        )}
      </button>
      <button
        onClick={onCheckIn}
        disabled={checkedIn}
        title={checkedIn ? 'Présent' : 'Pointer arrivée'}
        className="shrink-0 flex items-center justify-center rounded-lg transition-colors"
        style={{
          width: 28, height: 28,
          background: checkedIn ? 'var(--ds-success-soft)' : 'var(--ds-bg-surface)',
          border: `1px solid ${checkedIn ? 'var(--ds-success)' : 'var(--ds-border)'}`,
          color: checkedIn ? 'var(--ds-success-strong)' : 'var(--ds-text-tertiary)',
          cursor: checkedIn ? 'default' : 'pointer',
        }}
      >
        <Check size={14} />
      </button>
      <button
        onClick={onRemove}
        title="Retirer du service"
        className="shrink-0 flex items-center justify-center rounded-lg transition-colors hover:bg-red-50"
        style={{
          width: 28, height: 28,
          border: '1px solid var(--ds-border)',
          color: 'var(--ds-text-tertiary)',
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

// Conteneur droppable enrobant une pastille de table sur la grille (mode service).
function DroppableTable({ tableId, children }: { tableId: Id<'tables'>; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${TABLE_PREFIX}${tableId}` })
  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 8,
        boxShadow: isOver ? '0 0 0 2px var(--ds-accent)' : undefined,
        transition: 'box-shadow 120ms',
      }}
    >
      {children}
    </div>
  )
}

// Ligne d'une table assignée à un serveur (sidebar « En service ») : nom, timer
// d'inactivité, toggle alerte ⭐, et libération manuelle (dining/payment only).
function AssignedTableRow({
  table, now, onToggleAlert, onRelease, onCallManager, onSetVip, onForcePayment, onCloseWithoutPayment,
}: {
  table: Doc<'tables'>
  now: number
  onToggleAlert: () => void
  onRelease: () => void
  onCallManager: () => void
  onSetVip: () => void
  onForcePayment: () => void
  onCloseWithoutPayment: () => void
}) {
  const elapsedMin = table.sittingStartedAt != null
    ? Math.floor((now - table.sittingStartedAt) / 60000)
    : null
  const showTimer = elapsedMin != null && elapsedMin >= 30
  const danger = elapsedMin != null && elapsedMin >= 60
  // Une table active (en cours de repas ou de paiement) peut être libérée et
  // peut déclencher un appel gérant ; pas une table libre/payée.
  const isActive = table.status === 'dining' || table.status === 'payment'

  return (
    <div className="pl-4 pr-1 py-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-mid shrink-0">{table.label ?? `T${table.number}`}</span>
        {table.isVip && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded animate-pulse"
            style={{ background: '#FEF9C3', color: '#B45309' }}>⭐ VIP</span>
        )}
        {table.forcePaymentMode && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded animate-pulse"
            style={{ background: '#FFEDD5', color: '#EA580C' }}>⚡</span>
        )}
        {showTimer && (
          <span
            className={`text-[10px] font-bold leading-none px-1.5 py-0.5 rounded ${danger ? 'animate-pulse' : ''}`}
            style={{
              background: danger ? '#FEE2E2' : '#FFEDD5',
              color: danger ? '#DC2626' : '#EA580C',
            }}
          >
            {elapsedMin}min
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5 shrink-0">
          <button
            onClick={onToggleAlert}
            title={table.alert ? 'Retirer l\'alerte' : 'Marquer en alerte'}
            className="flex items-center justify-center rounded-lg transition-colors hover:bg-brand-bg"
            style={{ width: 26, height: 26 }}
          >
            <Star size={13} className={table.alert ? 'text-brand fill-brand' : 'text-muted'} />
          </button>
          {isActive && !table.isVip && (
            <button onClick={onSetVip} title="Marquer VIP"
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-yellow-50"
              style={{ width: 26, height: 26 }}>
              <Crown size={13} className="text-yellow-500" />
            </button>
          )}
          {isActive && table.isVip && (
            <button onClick={onSetVip} title="Retirer VIP"
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-yellow-50"
              style={{ width: 26, height: 26 }}>
              <Crown size={13} className="text-yellow-500 fill-yellow-400" />
            </button>
          )}
          {table.status === 'dining' && !table.forcePaymentMode && (
            <button onClick={onForcePayment} title="Forcer paiement QR"
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-orange-50"
              style={{ width: 26, height: 26 }}>
              <Zap size={13} className="text-orange-500" />
            </button>
          )}
          {isActive && (
            <button
              onClick={onRelease}
              title="Libérer la table"
              className="flex items-center justify-center rounded-lg transition-colors hover:bg-red-50"
              style={{ width: 26, height: 26 }}
            >
              <Unlock size={13} className="text-red-500" />
            </button>
          )}
        </div>
      </div>
      {isActive && (
        <button
          onClick={onCallManager}
          className="mt-1 w-full flex items-center justify-center gap-1.5 text-[11px] text-muted hover:text-brand border border-dashed border-border rounded-md py-1 transition-colors"
        >
          <PhoneCall className="w-3 h-3" /> Appeler le gérant
        </button>
      )}
      {isActive && (
        <button
          onClick={onCloseWithoutPayment}
          className="mt-1 w-full flex items-center justify-center gap-1.5
                     text-[11px] text-red-400 hover:text-red-600
                     border border-dashed border-red-200 rounded-md py-1
                     transition-colors"
        >
          <XCircle className="w-3 h-3" /> Clôturer sans paiement
        </button>
      )}
    </div>
  )
}

type DialogState =
  | { type: 'release'; table: Doc<'tables'> }
  | { type: 'close_no_pay'; table: Doc<'tables'> }
  | null

export function SallePage() {
  const restaurantId = useRestaurantId()
  const overview = useQuery(
    api.shifts.getServiceOverview,
    restaurantId ? { restaurantId } : 'skip',
  )
  const team = useQuery(
    api.members.getTeamMembers,
    restaurantId ? { restaurantId } : 'skip',
  )
  // Paiements encaissés du jour → récap de clôture de service (modal + export CSV).
  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime()
  }, [])
  const payments = useQuery(
    api.payments.list,
    restaurantId ? { restaurantId, from: todayStart } : 'skip',
  )
  // M11-B — Répartition des pourboires selon restaurants.tipSettings (mode + part cuisine).
  const tipDist = useQuery(
    api.closures.getTipDistribution,
    restaurantId ? { restaurantId, serviceDate: todayKey() } : 'skip',
  )

  const assignServer = useMutation(api.tables.assignServer)
  const clearAll = useMutation(api.tables.clearAllAssignments)
  const toggleAlert = useMutation(api.tables.toggleAlert)
  const resetToFree = useMutation(api.tables.resetToFree)
  const forcePaymentMut = useMutation(api.tables.forcePayment)
  const setVipMut = useMutation(api.tables.setVip)
  const sendTipReport = useAction(api.closures.sendTipReport)
  const checkIn = useMutation(api.shifts.checkIn)
  const createShift = useMutation(api.shifts.create)
  const removeShift = useMutation(api.shifts.remove)
  const callManager = useMutation(api.messages.callManager)
  const closeWithoutPaymentMut = useMutation(api.tables.closeWithoutPayment)

  const [activeZoneId, setActiveZoneId] = useState<Id<'zones'> | null>(null)
  const [dragName, setDragName] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [sendingReport, setSendingReport] = useState(false)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [closeReason, setCloseReason] = useState('')

  // Timer d'inactivité : tick toutes les 30 s pour réactualiser les temps écoulés
  // (les TableChip et les lignes sidebar recalculent depuis sittingStartedAt).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Tables assignées regroupées par serveur — alimente le compteur du roster et
  // les lignes de la sidebar (timer + toggle alerte + libération). Triées par n°.
  const tablesByMember = useMemo(() => {
    const m = new Map<string, Doc<'tables'>[]>()
    if (overview) {
      for (const t of overview.tables) {
        if (!t.assignedMemberId) continue
        const arr = m.get(t.assignedMemberId) ?? []
        arr.push(t)
        m.set(t.assignedMemberId, arr)
      }
      for (const arr of m.values()) arr.sort((a, b) => a.number - b.number)
    }
    return m
  }, [overview])

  // Membres actifs pas encore dans le roster du jour → éligibles à « Ajouter ».
  const eligible = useMemo(() => {
    if (!team || !overview) return []
    const inRoster = new Set(overview.staffToday.map(s => s.memberId))
    return team.filter(m => m.status === 'active' && !inRoster.has(m._id))
  }, [team, overview])

  // undefined = chargement ; null = accès refusé / restaurant introuvable.
  if (overview === undefined) {
    return (
      <RestaurantLayout>
        <PageHeader title="Service" subtitle="Plan de salle en temps réel" />
        <div className="flex items-center justify-center py-24 text-sm text-muted">Chargement…</div>
      </RestaurantLayout>
    )
  }
  if (overview === null) {
    return (
      <RestaurantLayout>
        <PageHeader title="Service" subtitle="Plan de salle en temps réel" />
        <div className="flex items-center justify-center py-24 text-sm text-muted">Accès indisponible.</div>
      </RestaurantLayout>
    )
  }

  const roster: RosterEntry[] = overview.staffToday.map(s => ({
    memberId: s.memberId,
    name: s.memberName,
    displayName: s.displayName,
    colorIndex: s.colorIndex,
    checkedIn: s.isPresent,
    zone: s.zone ?? null,
  }))

  const placedCount = overview.tables.filter(t => t.gridX != null && t.gridY != null).length

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id)
    if (id.startsWith(SERVER_PREFIX)) {
      const memberId = id.slice(SERVER_PREFIX.length)
      setDragName(overview!.staffToday.find(s => s.memberId === memberId)?.memberName ?? null)
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDragName(null)
    const activeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    if (!overId || !activeId.startsWith(SERVER_PREFIX) || !overId.startsWith(TABLE_PREFIX)) return
    const memberId = activeId.slice(SERVER_PREFIX.length) as Id<'members'>
    const tableId = overId.slice(TABLE_PREFIX.length) as Id<'tables'>
    await assignServer({ tableId, memberId })
    toast.success('Serveur assigné')
  }

  async function handleTableClick(tableId: Id<'tables'>) {
    const t = overview!.tables.find(x => x._id === tableId)
    if (t?.assignedMemberId) {
      await assignServer({ tableId }) // détache (memberId absent)
      toast.success('Table détachée')
    }
  }

  function handleClearAll() {
    if (!restaurantId) return
    setShowRecap(true)
  }

  async function handleConfirmClose() {
    if (!restaurantId) return
    await clearAll({ restaurantId })
    setShowRecap(false)
    toast.success('Service clôturé')
  }

  // M11-C — Envoie le rapport de répartition par email : un email à chaque
  // serveur (son montant) + un récap complet à l'owner/managers. Calcul refait
  // côté backend (closures.sendTipReport), le front n'est pas la source de vérité.
  async function handleSendReport() {
    if (!restaurantId || sendingReport) return
    setSendingReport(true)
    try {
      const r = await sendTipReport({ restaurantId, serviceDate: todayKey() })
      if (r.noTips) {
        toast.info('Aucun pourboire à répartir ce soir')
      } else if (r.emailDisabled) {
        toast.error("Envoi d'emails indisponible (clé Resend manquante)")
      } else {
        const parts: string[] = []
        if (r.sent) parts.push(`${r.sent} serveur${r.sent > 1 ? 's' : ''}`)
        if (r.ownerSent) parts.push('récap gérant')
        toast.success(parts.length ? `Rapport envoyé : ${parts.join(' + ')}` : 'Rapport envoyé')
        if (r.failed) toast.error(`${r.failed} email${r.failed > 1 ? 's' : ''} en échec`)
        if (r.skipped) toast.info(`${r.skipped} serveur${r.skipped > 1 ? 's' : ''} sans email`)
      }
    } catch (err) {
      console.error('[SallePage] sendTipReport:', err)
      toast.error("Échec de l'envoi du rapport")
    } finally {
      setSendingReport(false)
    }
  }

  // Stats du jour (paiements encaissés) + export CSV (séparateur `;`, BOM Excel FR).
  const enc = (payments ?? []).filter(p => p.status === 'Encaissé')
  const ca = enc.reduce((s, p) => s + p.subtotalCents, 0)
  const tips = enc.reduce((s, p) => s + (p.tipCents ?? 0), 0)
  const tickets = enc.length
  const couverts = enc.reduce((s, p) => s + (p.guests ?? 0), 0)
  function exportCSV() {
    const lines = [
      'Table;Montant (€);Pourboire (€);Moyen paiement;Couverts;Heure',
      ...enc.map(p => [
        p.tableNumber ?? '',
        (p.subtotalCents / 100).toFixed(2).replace('.', ','),
        ((p.tipCents ?? 0) / 100).toFixed(2).replace('.', ','),
        p.paymentMethod ?? '',
        p.guests ?? '',
        new Date(p.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      ].join(';')),
    ]
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })),
      download: `service-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click()
  }

  async function handleToggleAlert(tableId: Id<'tables'>) {
    await toggleAlert({ tableId })
  }

  function handleRelease(t: Doc<'tables'>) {
    setDialog({ type: 'release', table: t })
  }

  async function confirmRelease() {
    if (!dialog || dialog.type !== 'release') return
    await resetToFree({ tableId: dialog.table._id })
    toast.success('Table libérée')
    setDialog(null)
  }

  function handleCloseWithoutPayment(t: Doc<'tables'>) {
    setCloseReason('')
    setDialog({ type: 'close_no_pay', table: t })
  }

  async function confirmCloseWithoutPayment() {
    if (!dialog || dialog.type !== 'close_no_pay') return
    await closeWithoutPaymentMut({
      tableId: dialog.table._id,
      reason: closeReason || undefined,
    })
    toast.success('Table clôturée sans paiement')
    setDialog(null)
  }

  async function handleForcePayment(t: Doc<'tables'>) {
    await forcePaymentMut({ tableId: t._id })
    toast.success(`Paiement QR forcé — T${t.number}`)
  }

  async function handleSetVip(t: Doc<'tables'>) {
    await setVipMut({ tableId: t._id, isVip: !t.isVip })
    toast.success(t.isVip ? 'VIP retiré' : `T${t.number} — VIP activé`)
  }

  // M6-B — Alerte le gérant en temps réel depuis une table : message broadcast
  // (contenu normalisé côté serveur) → apparaît dans le chat de toute l'équipe.
  async function handleCallManager(t: Doc<'tables'>) {
    if (!restaurantId) return
    try {
      await callManager({ restaurantId, tableNumber: t.number })
      toast.success('Gérant alerté')
    } catch (err) {
      console.error('[SallePage] callManager:', err)
      toast.error("Échec de l'appel du gérant")
    }
  }

  return (
    <RestaurantLayout>
      <PageHeader
        title="Service"
        subtitle="Glissez un serveur sur une table pour l'assigner"
        actions={
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-semibold text-mid hover:bg-bg transition-colors"
          >
            <Power size={15} /> Fin de service
          </button>
        }
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="px-4 py-5 md:px-9 md:py-6 flex flex-col lg:flex-row gap-5">
          {/* Plan */}
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-border shadow-card p-3 md:p-6 overflow-x-auto">
            {placedCount === 0 ? (
              <div className="text-sm text-muted py-12 text-center">
                Aucune table positionnée. Placez vos tables dans Paramètres → Tables &amp; Plan.
              </div>
            ) : (
              <FloorPlan
                mode="service"
                gridCols={overview.gridCols}
                gridRows={overview.gridRows}
                tables={overview.tables}
                zones={overview.zones}
                roster={roster}
                activeZoneId={activeZoneId}
                onZoneChange={setActiveZoneId}
                onTableClick={handleTableClick}
                now={now}
                wrapTable={(tableId, node) => (
                  <DroppableTable key={tableId} tableId={tableId}>{node}</DroppableTable>
                )}
              />
            )}
          </div>

          {/* Roster */}
          <div className="w-full lg:w-72 shrink-0 bg-white rounded-xl border border-border shadow-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-muted" />
                <h2 className="text-sm font-bold text-dark">En service</h2>
                <span className="text-xs text-muted">({roster.length})</span>
              </div>
              {!showAdd && eligible.length > 0 && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors"
                >
                  <UserPlus size={13} /> Ajouter
                </button>
              )}
            </div>

            {showAdd && (
              <div className="mb-4 border border-border rounded-xl p-2 space-y-1">
                {eligible.length === 0 ? (
                  <div className="text-xs text-muted py-2 text-center">Toute l'équipe est en service.</div>
                ) : (
                  eligible.map(m => (
                    <button
                      key={m._id}
                      onClick={async () => {
                        if (!restaurantId) return
                        await createShift({
                          restaurantId,
                          memberId: m._id,
                          date: todayKey(),
                          startTime: '00:00',
                          endTime: '23:59',
                        })
                        toast.success('Ajouté au service')
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-dark hover:bg-brand-bg transition-colors"
                    >
                      {m.displayName ?? (m.firstName ? `${m.firstName} ${m.lastName ?? ''}`.trim() : null) ?? m.name ?? 'Membre'}
                    </button>
                  ))
                )}
                <button
                  onClick={() => setShowAdd(false)}
                  className="w-full text-center px-3 py-1.5 text-xs text-muted hover:text-dark transition-colors"
                >
                  Fermer
                </button>
              </div>
            )}

            {roster.length === 0 && !showAdd && (
              <div className="text-sm text-muted py-6 text-center">
                Personne en service. Ajoutez un membre de l'équipe.
              </div>
            )}

            <div className="flex flex-col gap-2">
              {overview.staffToday.map(s => {
                const assigned = tablesByMember.get(s.memberId) ?? []
                return (
                  <div key={s.memberId} className="flex flex-col">
                    <DraggableServer
                      memberId={s.memberId}
                      name={s.memberName}
                      colorIndex={s.colorIndex}
                      checkedIn={s.isPresent}
                      assignedCount={assigned.length}
                      onCheckIn={async () => { await checkIn({ shiftId: s.shiftId }); toast.success('Arrivée pointée') }}
                      onRemove={async () => {
                        await removeShift({ shiftId: s.shiftId })
                        toast.success('Retiré du service')
                      }}
                    />
                    {assigned.length > 0 && (
                      <div className="mt-0.5 border-l-2 border-border ml-2">
                        {assigned.map(t => (
                          <AssignedTableRow
                            key={t._id}
                            table={t}
                            now={now}
                            onToggleAlert={() => handleToggleAlert(t._id)}
                            onRelease={() => handleRelease(t)}
                            onCallManager={() => handleCallManager(t)}
                            onSetVip={() => handleSetVip(t)}
                            onForcePayment={() => handleForcePayment(t)}
                            onCloseWithoutPayment={() => handleCloseWithoutPayment(t)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DragOverlay>
          {dragName ? (
            <div
              className="rounded-xl px-3 py-2 text-sm font-semibold shadow-lg"
              style={{ background: SERVER_COLORS[0].bg, border: `1px solid ${SERVER_COLORS[0].border}`, color: SERVER_COLORS[0].text }}
            >
              {dragName}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showRecap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-5 md:p-8 w-full max-w-lg mx-4 max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-dark">Récap du service</h2>
              <button onClick={() => setShowRecap(false)}><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {([
                ['CA', `${(ca / 100).toFixed(2)} €`],
                ['Pourboires', `${(tips / 100).toFixed(2)} €`],
                ['Tickets', `${tickets}`],
                ['Couverts', `${couverts}`],
                ['Panier moyen', tickets ? `${(ca / tickets / 100).toFixed(2)} €` : '—'],
              ] as [string, string][]).map(([l, v]) => (
                <div key={l} className="bg-bg rounded-xl p-4">
                  <p className="text-xs text-muted mb-1">{l}</p>
                  <p className="text-xl font-bold text-dark">{v}</p>
                </div>
              ))}
            </div>

            {/* M11-B — Répartition des pourboires selon tipSettings */}
            {tipDist && tipDist.totalTips > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-brand" />
                    <h3 className="text-sm font-bold text-dark">Répartition des pourboires</h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-bg text-brand">
                    {TIP_MODE_LABEL[tipDist.mode] ?? tipDist.mode}
                  </span>
                </div>

                <div className="bg-bg rounded-xl p-4 mb-3 flex items-center justify-between">
                  <span className="text-xs text-muted">Total collecté ce soir</span>
                  <span className="text-lg font-bold text-dark">{(tipDist.totalTips / 100).toFixed(2)} €</span>
                </div>

                {tipDist.kitchenShare > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 mb-3 rounded-lg border border-border">
                    <span className="flex items-center gap-1.5 text-sm text-mid"><ChefHat size={14} /> Cuisine</span>
                    <span className="text-sm font-semibold text-dark">{(tipDist.kitchenShare / 100).toFixed(2)} €</span>
                  </div>
                )}

                {tipDist.distribution.length > 0 ? (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 bg-bg text-[11px] font-semibold text-muted uppercase tracking-wide">
                      <span>Serveur</span>
                      <span className="text-center">Tables</span>
                      <span className="text-right">Montant</span>
                    </div>
                    {tipDist.distribution.map((d) => (
                      <div key={d.memberId} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2.5 border-t border-border items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-dark truncate">{d.name}</p>
                          <p className="text-[11px] text-muted">{ROLE_LABEL[d.role] ?? d.role}</p>
                        </div>
                        <span className="text-sm text-mid text-center tabular-nums">{d.tablesServed}</span>
                        <span className="text-sm font-bold text-dark text-right tabular-nums flex items-center gap-1 justify-end">
                          {(d.amountCents / 100).toFixed(2)} € <Star size={12} className="text-brand" fill="currentColor" />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted text-center py-3">Aucun serveur éligible à la répartition.</p>
                )}

                <button
                  onClick={handleSendReport}
                  disabled={sendingReport}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-dark text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Send size={15} /> {sendingReport ? 'Envoi en cours…' : 'Envoyer le rapport'}
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={exportCSV}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-mid hover:bg-bg transition-colors"
              >
                <Download size={15} /> Export CSV
              </button>
              <button
                onClick={handleConfirmClose}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Clôturer
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog?.type === 'release' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl space-y-4">
            <h3 className="font-semibold text-base">
              Libérer T{dialog.table.number} ?
            </h3>
            <p className="text-sm ds-text-secondary">
              Le paiement en cours sera annulé.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDialog(null)}
                className="px-4 py-2 text-sm rounded-xl border border-border"
              >
                Annuler
              </button>
              <button
                onClick={confirmRelease}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white"
              >
                Libérer
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog?.type === 'close_no_pay' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl space-y-4">
            <h3 className="font-semibold text-base">
              Clôturer T{dialog.table.number} sans paiement
            </h3>
            <select value={closeReason}
              onChange={e => setCloseReason(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-[16px] md:text-sm">
              <option value="">Raison (optionnelle)</option>
              <option value="offert">Repas offert</option>
              <option value="erreur">Erreur de table</option>
              <option value="incident">Incident client</option>
              <option value="autre">Autre</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDialog(null)}
                className="px-4 py-2 text-sm rounded-xl border border-border">
                Annuler
              </button>
              <button onClick={confirmCloseWithoutPayment}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white">
                Clôturer
              </button>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  )
}
