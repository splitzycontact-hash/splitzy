import type { Doc, Id } from "../../../../convex/_generated/dataModel"
import TableChip from "./TableChip"

interface UnpositionedTrayProps {
  tables: Doc<"tables">[]
  selectedTableId?: Id<"tables"> | null
  onTableClick: (id: Id<"tables">) => void
}

// Colonne latérale (mode config) listant les tables pas encore placées sur la
// grille. Masquée s'il n'y en a aucune.
export default function UnpositionedTray({ tables, selectedTableId, onTableClick }: UnpositionedTrayProps) {
  if (tables.length === 0) return null
  return (
    <div className="w-40 shrink-0 flex flex-col gap-2">
      <h3 className="text-[12px] font-semibold" style={{ color: 'var(--ds-text-secondary)' }}>
        Non placées
      </h3>
      <div className="flex flex-col gap-2">
        {tables.map(t => (
          <div
            key={t._id}
            style={
              selectedTableId === t._id
                ? { boxShadow: '0 0 0 2px var(--ds-accent)', borderRadius: 8 }
                : undefined
            }
          >
            <TableChip
              table={t}
              activeZoneId={null}
              onTableClick={() => onTableClick(t._id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
