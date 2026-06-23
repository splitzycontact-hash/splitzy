import { useMemo, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { UserPlus, X, Check, Power, Users } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
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

  const assignServer = useMutation(api.tables.assignServer)
  const clearAll = useMutation(api.tables.clearAllAssignments)
  const checkIn = useMutation(api.shifts.checkIn)
  const createShift = useMutation(api.shifts.create)
  const removeShift = useMutation(api.shifts.remove)

  const [activeZoneId, setActiveZoneId] = useState<Id<'zones'> | null>(null)
  const [dragName, setDragName] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Nombre de tables assignées par membre — affiché dans le roster.
  const assignedCountByMember = useMemo(() => {
    const m = new Map<string, number>()
    if (overview) {
      for (const t of overview.tables) {
        if (t.assignedMemberId) m.set(t.assignedMemberId, (m.get(t.assignedMemberId) ?? 0) + 1)
      }
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

  async function handleClearAll() {
    if (!restaurantId) return
    if (!window.confirm('Fin de service : détacher tous les serveurs de toutes les tables ?')) return
    await clearAll({ restaurantId })
    toast.success('Service clôturé')
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
        <div className="px-9 py-6 flex flex-col lg:flex-row gap-5">
          {/* Plan */}
          <div className="flex-1 bg-white rounded-xl border border-border shadow-card p-6">
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
                wrapTable={(tableId, node) => (
                  <DroppableTable key={tableId} tableId={tableId}>{node}</DroppableTable>
                )}
              />
            )}
          </div>

          {/* Roster */}
          <div className="w-full lg:w-72 shrink-0 bg-white rounded-xl border border-border shadow-card p-5">
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
              {overview.staffToday.map(s => (
                <DraggableServer
                  key={s.memberId}
                  memberId={s.memberId}
                  name={s.memberName}
                  colorIndex={s.colorIndex}
                  checkedIn={s.isPresent}
                  assignedCount={assignedCountByMember.get(s.memberId) ?? 0}
                  onCheckIn={async () => { await checkIn({ shiftId: s.shiftId }); toast.success('Arrivée pointée') }}
                  onRemove={async () => {
                    await removeShift({ shiftId: s.shiftId })
                    toast.success('Retiré du service')
                  }}
                />
              ))}
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
    </RestaurantLayout>
  )
}
