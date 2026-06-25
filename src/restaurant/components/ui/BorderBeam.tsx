interface BorderBeamProps {
  size?: number
  duration?: number
  delay?: number
  colorFrom?: string
  colorTo?: string
  borderWidth?: number
}

/**
 * Effet de bord lumineux animé en rotation (conic-gradient masqué sur la bordure).
 * Repose sur @property --border-beam-angle + @keyframes border-beam (index.css).
 * Design uniquement — purement décoratif, pointer-events:none.
 */
export function BorderBeam({
  size = 200,
  duration = 6,
  delay = 0,
  colorFrom = '#E8920A',
  colorTo = '#FFD580',
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none"
      aria-hidden
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          padding: `${borderWidth}px`,
          background: `conic-gradient(from var(--border-beam-angle) at 50% 50%, transparent 0%, ${colorFrom} 20%, ${colorTo} 40%, transparent 60%)`,
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: `border-beam ${duration}s linear ${-delay}s infinite`,
          // largeur de référence du faisceau
          ['--border-beam-size' as string]: `${size}px`,
        }}
      />
    </div>
  )
}
