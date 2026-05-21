import { useRef, useState } from 'react'
import { m } from 'framer-motion'

function TextReveal({ children }: { children: string }) {
  const words = children.split(' ')
  return (
    <span>
      {words.map((word, i) => (
        <m.span
          key={i}
          style={{ display: 'inline-block' }}
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {word}{i < words.length - 1 ? ' ' : ''}
        </m.span>
      ))}
    </span>
  )
}

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
      style={{ background: '#E8920A' }}
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
      className="relative py-28 md:py-36 overflow-hidden text-center"
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
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(232,146,10,0.07) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-[680px] mx-auto px-6">
        <h2
          id="cta-heading"
          className="text-white text-balance"
          style={{ fontWeight: 900, fontSize: 'clamp(34px, 5.5vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.04em' }}
        >
          <TextReveal>{'Votre prochaine '}</TextReveal>
          <br />
          <TextReveal>{'1 étoile peut attendre.'}</TextReveal>
        </h2>

        <m.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.35 }}
          className="mt-6 text-[17px] md:text-[18px] leading-[1.7] max-w-[480px] mx-auto"
          style={{ color: '#A1A1AA' }}
        >
          Rejoignez les restaurants parisiens qui protègent leur réputation avec Splitzy.
          Installation en 15 minutes. Sans engagement.
        </m.p>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.5 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <MagneticBtn href="/restaurant/onboarding">
            Commencer gratuitement →
          </MagneticBtn>

          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-medium text-white transition-colors hover:bg-white/10"
            style={{ border: '1px solid rgba(255,255,255,0.25)' }}
          >
            Parler à un expert
          </a>
        </m.div>
      </div>
    </section>
  )
}
