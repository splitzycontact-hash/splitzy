import type { Doc, Id } from "../../../../convex/_generated/dataModel"
import { SERVER_COLORS, STATUS_COLORS } from "./floorColors"

interface TableChipProps {
  table: Doc<"tables">
  roster?: Array<{ memberId: Id<"members">; colorIndex: number }>
  activeZoneId: Id<"zones"> | null
  selected?: boolean
  onTableClick?: () => void
}

// Pastille d'une table : couleur = serveur assigné (si présent dans le roster),
// sinon statut de la table. Atténuée quand un filtre de zone exclut la table.
// Nom affiché = label personnalisé sinon T{number}.
export default function TableChip({ table, roster, activeZoneId, selected, onTableClick }: TableChipProps) {
  let colors: { bg: string; border: string; text: string }
  if (table.assignedMemberId && roster) {
    const entry = roster.find(r => r.memberId === table.assignedMemberId)
    colors = entry ? SERVER_COLORS[entry.colorIndex] : STATUS_COLORS[table.status]
  } else {
    colors = STATUS_COLORS[table.status]
  }

  const dimmed = activeZoneId !== null && table.zoneId !== activeZoneId
  const radius = table.shape === "round" ? 9999 : 8

  return (
    <button
      type="button"
      onClick={onTableClick}
      disabled={!onTableClick}
      className="flex flex-col items-start justify-center transition-opacity"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        borderRadius: radius,
        padding: '6px 10px',
        opacity: dimmed ? 0.28 : 1,
        cursor: onTableClick ? 'pointer' : 'default',
        boxShadow: selected ? '0 0 0 2px var(--ds-accent)' : undefined,
      }}
    >
      <span className="font-bold text-[13px] leading-none truncate max-w-[72px]">
        {table.label ?? `T${table.number}`}
      </span>
      <span className="text-[10px] leading-none mt-0.5 opacity-70">{table.capacity} pl.</span>
    </button>
  )
}
