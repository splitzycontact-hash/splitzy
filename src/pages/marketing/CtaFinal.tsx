import { useRef, useState } from 'react'
import { m } from 'framer-motion'
import { IconArrowRight } from './Icons'

function MagneticBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  function onMouseMove(e: React.MouseEvent) {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({
      x: (e.clientX - r.left - r.width / 2) * 0.28,
      y: (e.clientY - r.top - r.height / 2) * 0.28,
    })
  }

  return (
    <m.a
      ref={ref}
      href={href}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.5 }}
      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-semibold text-white"
      style={{ background: '#E8920A', boxShadow: '0 0 40px rgba(232,146,10,0.45), 0 8px 20px rgba(232,146,10,0.35)' }}
    >
      {children}
    </m.a>
  )
}

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`

export function CtaFinal() {
  return (
    <section
      id="cta-final"
      className="relative py-24 md:py-32 overflow-hidden"
      style={{ background: '#1A1A1A' }}
      aria-labelledby="cta-heading"
    >
      {/* Noise texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: NOISE_SVG, opacity: 0.04 }}
      />

      {/* Subtle radial glow */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(232,146,10,0.10) 0%, transparent 65%)',
      }} />

      <div className="relative max-w-[960px] mx-auto px-6">
        <h2 id="cta-heading" className="sr-only">
          Accéder à Splitzy ou planifier une démonstration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-stretch">
          {/* ── Encart 1 — client existant ── */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="flex flex-col rounded-2xl p-8 md:p-10"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4" style={{ color: '#A1A1AA' }}>
              Déjà client
            </p>
            <h3
              className="text-white text-balance font-display"
              style={{ fontWeight: 800, fontSize: 'clamp(24px, 3vw, 30px)', lineHeight: 1.12, letterSpacing: '-0.03em' }}
            >
              Déjà équipé de Splitzy&nbsp;?
            </h3>
            <p className="mt-4 text-[15px] leading-[1.65]" style={{ color: '#A1A1AA' }}>
              Retrouvez votre plan de salle, vos encaissements et vos statistiques en temps réel.
            </p>
            <div className="mt-8 md:mt-auto md:pt-8">
              <a
                href="/restaurant/sign-in"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-medium text-white transition-colors hover:bg-white/10"
                style={{ border: '1px solid rgba(255,255,255,0.25)' }}
              >
                Accéder à mon Dashboard
                <IconArrowRight size={15} />
              </a>
            </div>
          </m.div>

          {/* ── Encart 2 — prospect ── */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="relative flex flex-col rounded-2xl p-8 md:p-10 overflow-hidden"
            style={{ background: 'rgba(232,146,10,0.06)', border: '1px solid rgba(232,146,10,0.35)' }}
          >
            <div aria-hidden="true" className="absolute -top-24 -right-24 w-[280px] h-[280px] pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.18), transparent 70%)' }} />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.12em] mb-4" style={{ color: '#E8920A' }}>
              Nouveau sur Splitzy
            </p>
            <h3
              className="relative text-white text-balance font-display"
              style={{ fontWeight: 800, fontSize: 'clamp(24px, 3vw, 30px)', lineHeight: 1.12, letterSpacing: '-0.03em' }}
            >
              Modernisez la gestion de votre établissement.
            </h3>
            <p className="relative mt-4 text-[15px] leading-[1.65]" style={{ color: '#A1A1AA' }}>
              Encaissement en 30 secondes, tables libérées plus vite, pilotage en temps réel.
              Installation en 15 minutes, sans engagement.
            </p>
            <div className="relative mt-8 md:mt-auto md:pt-8">
              <MagneticBtn href="/contact">
                Planifier une démonstration →
              </MagneticBtn>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  )
}
