import type { HTMLAttributes } from 'react'

/**
 * Skeleton de chargement — pulse doux, couleur via design token (dark mode ok).
 * Design uniquement.
 */
function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`ds-skeleton rounded-md ${className}`}
      style={{ background: 'var(--ds-bg-subtle)' }}
      {...props}
    />
  )
}

export { Skeleton }
