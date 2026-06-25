import { m } from "framer-motion"
import type { Doc, Id } from "../../../../convex/_generated/dataModel"
import { SERVER_COLORS, STATUS_COLORS } from "./floorColors"

interface TableChipProps {
  table: Doc<"tables">
  roster?: Array<{ memberId: Id<"members">; colorIndex: number }>
  activeZoneId: Id<"zones"> | null
  selected?: boolean
  onTableClick?: () => void
  // Tick d'horloge (epoch ms) — fourni en mode service pour afficher le timer
  // d'inactivité depuis sittingStartedAt. Absent (config) → pas de timer.
  now?: number
}

// Pastille d'une table : couleur = serveur assigné (si présent dans le roster),
// sinon statut de la table. Atténuée quand un filtre de zone exclut la table.
// Nom affiché = label personnalisé sinon T{number}.
export default function TableChip({ table, roster, activeZoneId, selected, onTableClick, now }: TableChipProps) {
  let colors: { bg: string; border: string; text: string }
  if (table.assignedMemberId && roster) {
    const entry = roster.find(r => r.memberId === table.assignedMemberId)
    colors = entry ? SERVER_COLORS[entry.colorIndex] : STATUS_COLORS[table.status]
  } else {
    colors = STATUS_COLORS[table.status]
  }

  const dimmed = activeZoneId !== null && table.zoneId !== activeZoneId
  const radius = table.shape === "round" ? 9999 : 8

  // Timer d'inactivité : minutes écoulées depuis sittingStartedAt. < 30 → masqué,
  // 30–59 → badge orange, ≥ 60 → badge rouge pulsé.
  const elapsedMin = now != null && table.sittingStartedAt != null
    ? Math.floor((now - table.sittingStartedAt) / 60000)
    : null
  const showTimer = elapsedMin != null && elapsedMin >= 30
  const danger = elapsedMin != null && elapsedMin >= 60

  return (
    <m.button
      type="button"
      onClick={onTableClick}
      disabled={!onTableClick}
      whileHover={onTableClick ? { scale: 1.03 } : undefined}
      whileTap={onTableClick ? { scale: 0.96 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex flex-col items-start justify-center transition-opacity"
      style={{
        background: colors.bg,
        border: table.alert ? '2px solid #E8920A' : `1px solid ${colors.border}`,
        color: colors.text,
        borderRadius: radius,
        padding: table.alert ? '5px 9px' : '6px 10px',
        opacity: dimmed ? 0.28 : 1,
        cursor: onTableClick ? 'pointer' : 'default',
        boxShadow: selected ? '0 0 0 2px var(--ds-accent)' : undefined,
        outline: selected ? '2px solid #E8920A' : 'none',
        outlineOffset: '2px',
      }}
    >
      <span className="font-bold text-[13px] leading-none truncate max-w-[72px]">
        {table.alert ? '⭐ ' : ''}{table.label ?? `T${table.number}`}
      </span>
      <span className="text-[10px] leading-none mt-0.5 opacity-70">{table.capacity} pl.</span>
      {showTimer && (
        <span
          className={`text-[9px] font-bold leading-none mt-1 px-1 py-0.5 rounded ${danger ? 'animate-pulse' : ''}`}
          style={{
            background: danger ? '#FEE2E2' : '#FFEDD5',
            color: danger ? '#DC2626' : '#EA580C',
          }}
        >
          {elapsedMin}min
        </span>
      )}
      {table.isVip && (
        <span className="text-[9px] font-bold leading-none mt-1 px-1 py-0.5 rounded animate-pulse"
          style={{ background: '#FEF9C3', color: '#B45309' }}>
          ⭐ VIP
        </span>
      )}
      {table.forcePaymentMode && (
        <span className="text-[9px] font-bold leading-none mt-1 px-1 py-0.5 rounded animate-pulse"
          style={{ background: '#FFEDD5', color: '#EA580C' }}>
          ⚡ QR
        </span>
      )}
    </m.button>
  )
}
