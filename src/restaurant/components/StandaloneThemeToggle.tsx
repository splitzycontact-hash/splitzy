import { Moon, SunDim } from 'lucide-react'
import { useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useTheme } from '../context/ThemeContext'

type Props = {
  className?: string
}

/**
 * Bascule de thème clair/sombre du dashboard.
 *
 * Branchée sur le ThemeContext du projet (clé localStorage `splitzy-dash-theme`,
 * attribut `data-theme` posé par RestaurantLayout) — c'est lui la source de vérité
 * du thème. L'animation de bascule (révélation circulaire via View Transition API)
 * est conservée, avec repli gracieux si l'API n'est pas dispo.
 */
export function StandaloneThemeToggle({ className = '' }: Props) {
  const { theme, toggleTheme } = useTheme()
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const changeTheme = useCallback(async () => {
    if (!buttonRef.current || !document.startViewTransition) {
      toggleTheme()
      return
    }

    await document.startViewTransition(() => {
      flushSync(() => toggleTheme())
    }).ready

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect()
    const x = left + width / 2
    const y = top + height / 2
    const right = window.innerWidth - left
    const bottom = window.innerHeight - top
    const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom))

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRad}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  }, [toggleTheme])

  return (
    <button
      ref={buttonRef}
      onClick={changeTheme}
      aria-label="Basculer le thème clair/sombre"
      className={
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border ' +
        'transition-all duration-300 hover:scale-105 ' +
        className
      }
      style={{
        background: 'var(--ds-bg-surface)',
        borderColor: 'var(--ds-border)',
        color: 'var(--ds-text-primary)',
        boxShadow: 'var(--ds-shadow-sm)',
      }}
    >
      {theme === 'dark' ? (
        <SunDim className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  )
}

export default StandaloneThemeToggle
