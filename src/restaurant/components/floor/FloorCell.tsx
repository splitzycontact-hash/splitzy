interface FloorCellProps {
  x: number
  y: number
  onClick?: () => void
  dimmed?: boolean
}

// Cellule vide de la grille du plan de salle. Cliquable seulement en mode config
// (onClick fourni et non atténuée) ; sinon inerte (pointer-events none).
export default function FloorCell({ x, y, onClick, dimmed }: FloorCellProps) {
  const interactive = !!onClick && !dimmed
  return (
    <button
      type="button"
      aria-label={`Cellule ${x + 1}, ${y + 1}`}
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      className="w-full transition-colors"
      style={{
        aspectRatio: '1 / 1',
        border: '1px dashed var(--ds-border)',
        background: 'var(--ds-bg-subtle)',
        borderRadius: 8,
        pointerEvents: dimmed || !onClick ? 'none' : 'auto',
        opacity: dimmed || !onClick ? 0.4 : 1,
        cursor: interactive ? 'pointer' : 'default',
      }}
    />
  )
}
