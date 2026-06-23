import type { Doc, Id } from "../../../../convex/_generated/dataModel"
import FloorCell from "./FloorCell"
import TableChip from "./TableChip"
import UnpositionedTray from "./UnpositionedTray"
import ZoneFilter from "./ZoneFilter"

// Entrée du roster de service : un serveur, sa couleur, son pointage et sa zone.
// Consommée par TableChip pour colorer une table selon le serveur assigné.
export interface RosterEntry {
  memberId: Id<"members">
  name: string
  // Nom d'affichage libre (displayName) si défini — déjà appliqué dans `name`
  // côté getServiceOverview ; exposé ici pour les consommateurs qui en ont besoin.
  displayName?: string
  colorIndex: number
  checkedIn: boolean
  zone: string | null
}

interface FloorPlanProps {
  mode: "config" | "service"
  gridCols: number
  gridRows: number
  tables: Doc<"tables">[]
  zones: Doc<"zones">[]
  roster?: RosterEntry[]
  activeZoneId: Id<"zones"> | null
  selectedTableId?: Id<"tables"> | null
  onCellClick?: (x: number, y: number) => void
  onTableClick?: (tableId: Id<"tables">) => void
  onZoneChange?: (zoneId: Id<"zones"> | null) => void
  // Mode service : enrobe chaque table d'un conteneur droppable (DnD). Absent en
  // config → la table est rendue telle quelle. Le wrapper doit porter une `key`.
  wrapTable?: (tableId: Id<"tables">, node: React.ReactNode) => React.ReactNode
  // Tick d'horloge propagé aux TableChip pour le timer d'inactivité (service).
  now?: number
}

// Plan de salle : grille CSS positionnant les tables (gridX/gridY) sur des
// cellules, filtre de zones au-dessus, et — en mode config — un bac latéral des
// tables non encore placées. Aucun DndContext ici : le drag est porté par
// SallePage (parent), ce composant n'est que le rendu.
export default function FloorPlan({
  mode,
  gridCols,
  gridRows,
  tables,
  zones,
  roster,
  activeZoneId,
  selectedTableId,
  onCellClick,
  onTableClick,
  onZoneChange,
  wrapTable,
  now,
}: FloorPlanProps) {
  // Tables placées indexées par "x,y" pour un lookup O(1) dans la double boucle.
  const placed = new Map<string, Doc<"tables">>()
  for (const t of tables) {
    if (t.gridX != null && t.gridY != null) placed.set(`${t.gridX},${t.gridY}`, t)
  }

  // Mode config uniquement : tables sans position, listées dans le bac latéral.
  const unpositioned = tables.filter(t => t.gridX == null || t.gridY == null)

  const cells: React.ReactNode[] = []
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      const t = placed.get(`${x},${y}`)
      if (t) {
        const chip = (
          <TableChip
            table={t}
            roster={roster}
            activeZoneId={activeZoneId}
            selected={selectedTableId === t._id}
            onTableClick={() => onTableClick?.(t._id)}
            now={now}
          />
        )
        // Mode service : wrapTable enrobe la pastille d'un conteneur droppable
        // (DnD, porte la `key`). En config (wrapTable absent) : pastille nue.
        cells.push(
          wrapTable
            ? wrapTable(t._id, chip)
            : <div key={t._id}>{chip}</div>
        )
      } else {
        cells.push(
          <FloorCell
            key={`cell-${x}-${y}`}
            x={x}
            y={y}
            onClick={onCellClick ? () => onCellClick(x, y) : undefined}
            dimmed={activeZoneId !== null}
          />
        )
      }
    }
  }

  return (
    <div className="flex flex-row gap-4">
      <div className="flex-1 flex flex-col gap-3">
        <ZoneFilter
          zones={zones}
          activeZoneId={activeZoneId}
          onZoneChange={onZoneChange ?? (() => {})}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCols},1fr)`,
            gridTemplateRows: `repeat(${gridRows},1fr)`,
            gap: 4,
          }}
        >
          {cells}
        </div>
      </div>

      {mode === "config" && (
        <UnpositionedTray
          tables={unpositioned}
          selectedTableId={selectedTableId}
          onTableClick={id => onTableClick?.(id)}
        />
      )}
    </div>
  )
}
