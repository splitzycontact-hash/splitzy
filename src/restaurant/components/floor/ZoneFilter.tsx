import type { Doc, Id } from "../../../../convex/_generated/dataModel"

interface ZoneFilterProps {
  zones: Doc<"zones">[]
  activeZoneId: Id<"zones"> | null
  onZoneChange: (id: Id<"zones"> | null) => void
}

// Filtre horizontal de zones du plan de salle. Chip "Tout" + un chip par zone.
export default function ZoneFilter({ zones, activeZoneId, onZoneChange }: ZoneFilterProps) {
  return (
    <div className="flex flex-row gap-2 overflow-x-auto">
      <Chip
        label="Tout"
        active={activeZoneId === null}
        onClick={() => onZoneChange(null)}
      />
      {zones.map(z => (
        <Chip
          key={z._id}
          label={z.name}
          active={activeZoneId === z._id}
          activeColor={z.color}
          onClick={() => onZoneChange(z._id)}
        />
      ))}
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
  activeColor = 'var(--ds-accent)',
}: {
  label: string
  active: boolean
  onClick: () => void
  activeColor?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold transition-colors"
      style={
        active
          ? { background: activeColor, color: '#fff', border: 'none' }
          : {
              background: 'var(--ds-bg-subtle)',
              color: 'var(--ds-text-secondary)',
              border: '1px solid var(--ds-border)',
            }
      }
    >
      {label}
    </button>
  )
}
