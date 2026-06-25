import { useCallback, useRef } from 'react'

const COLORS = ['#E8920A', '#FFB853', '#22C55E', '#3B82F6', '#A855F7', '#F59E0B']

type Particle = {
  x: number; y: number; vx: number; vy: number
  w: number; h: number; rot: number; vrot: number
  color: string; opacity: number
}

/**
 * Confetti canvas — burst de 120 particules rectangulaires (RAF + gravité).
 * Retourne `fire()` (déclenche le burst) et `ConfettiCanvas` (à monter dans la page).
 * Design uniquement — purement décoratif, pointer-events:none.
 */
export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  const fire = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const particles: Particle[] = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * W,
      y: -20,
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 4,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 1,
    }))

    cancelAnimationFrame(rafRef.current)
    const step = () => {
      ctx.clearRect(0, 0, W, H)
      let alive = false
      for (const p of particles) {
        if (p.opacity <= 0) continue
        alive = true
        p.vy += 0.08
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vrot
        p.opacity -= 0.006
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.opacity)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (alive) rafRef.current = requestAnimationFrame(step)
      else ctx.clearRect(0, 0, W, H)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  const ConfettiCanvas = useCallback(
    () => (
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9999 }}
        aria-hidden
      />
    ),
    [],
  )

  return { fire, ConfettiCanvas }
}
