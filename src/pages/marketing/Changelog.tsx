import { useRef, useState } from 'react'
import { m, useScroll, useTransform } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

// ── Text reveal ──────────────────────────────────────────────────────────
function TextReveal({ children, className = '' }: { children: string; className?: string }) {
  const words = children.split(' ')
  return (
    <span className={className}>
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

// ── Magnetic button ──────────────────────────────────────────────────────
function MagneticCta({ children, onClick, type = 'button', className = '', style = {} }: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect()
    setPos({ x: (e.clientX - r.left - r.width / 2) * 0.28, y: (e.clientY - r.top - r.height / 2) * 0.28 })
  }

  return (
    <m.button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.5 }}
      className={className}
      style={{ background: '#E8920A', color: 'white', ...style }}
    >
      {children}
    </m.button>
  )
}

// ── Badge colors by type ──────────────────────────────────────────────────
const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  Performance: { bg: '#FFF4E5', color: '#E8920A' },
  Dashboard:   { bg: '#F0FDF4', color: '#16A34A' },
  Mobile:      { bg: '#EFF6FF', color: '#2563EB' },
  Payments:    { bg: '#FDF4FF', color: '#9333EA' },
  Lancement:   { bg: '#18181B', color: '#FFFFFF' },
}

// ── Changelog data ────────────────────────────────────────────────────────
const ENTRIES = [
  {
    version: 'v0.9',
    date: 'Mai 2026',
    tag: 'Performance',
    title: 'Chargement mobile 3× plus rapide',
    body: 'Le flow client QR se charge maintenant en moins de 2 secondes sur mobile, même sur 4G faible.',
    changes: [
      { icon: '⚡', text: 'Bundle initial réduit de 400 kB à 134 kB (−66%)' },
      { icon: '⚡', text: 'Lazy loading de toutes les routes' },
      { icon: '⚡', text: 'Framer Motion optimisé via LazyMotion' },
      { icon: '⚡', text: 'Clerk isolé du flow client (ne se charge plus pour les clients QR)' },
    ],
  },
  {
    version: 'v0.8',
    date: 'Mai 2026',
    tag: 'Dashboard',
    title: "Fix dashboard gérant — plus de flash d'erreur",
    body: null,
    changes: [
      { icon: '🐛', text: 'Fix : plus de flash "Aucune table configurée" pendant le chargement' },
      { icon: '🐛', text: 'Fix : spinner pendant le chargement des QR codes' },
      { icon: '✨', text: 'Amélioration : navigation dashboard plus fluide' },
    ],
  },
  {
    version: 'v0.7',
    date: 'Avril 2026',
    tag: 'Mobile',
    title: 'Flow client entièrement revu pour mobile',
    body: null,
    changes: [
      { icon: '📱', text: '100dvh partout (plus de débordement Safari iOS)' },
      { icon: '📱', text: 'Inputs 16px (plus de zoom automatique iOS)' },
      { icon: '📱', text: 'Safe area iPhone corrigée' },
      { icon: '📱', text: 'Touch targets 44px minimum' },
      { icon: '📱', text: 'PhoneWrapper désactivé sur mobile' },
    ],
  },
  {
    version: 'v0.6',
    date: 'Mars 2026',
    tag: 'Payments',
    title: 'Intégration Square en production',
    body: null,
    changes: [
      { icon: '💳', text: 'Intégration Square live (paiements réels)' },
      { icon: '💳', text: 'Reçus par email automatiques' },
      { icon: '🔐', text: '3D Secure activé' },
    ],
  },
  {
    version: 'v0.5',
    date: 'Février 2026',
    tag: 'Lancement',
    title: 'Premier déploiement public',
    body: null,
    changes: [
      { icon: '🚀', text: 'splitzy.fr en ligne' },
      { icon: '🚀', text: 'Flow client QR complet (8 écrans)' },
      { icon: '🚀', text: 'Dashboard gérant V1' },
      { icon: '🚀', text: 'Onboarding restaurant' },
    ],
  },
]

// ── Single changelog entry ────────────────────────────────────────────────
type Entry = typeof ENTRIES[number]

function ChangelogEntry({ entry, index }: { entry: Entry; index: number }) {
  const tagStyle = TAG_STYLES[entry.tag] ?? { bg: '#F4F4F5', color: '#52525B' }

  return (
    <m.article
      initial={{ opacity: 0, x: 32 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, boxShadow: '0 12px 32px -12px rgba(232,146,10,0.2)', borderColor: '#E8920A', transition: { duration: 0.2 } }}
      className="relative bg-white rounded-2xl p-7 border cursor-default"
      style={{ borderColor: '#E4E4E7' }}
    >
      {/* Dot on timeline */}
      <div
        className="absolute -left-[41px] top-7 w-3 h-3 rounded-full border-2 border-white"
        style={{ background: '#E8920A', boxShadow: '0 0 0 3px rgba(232,146,10,0.2)' }}
      />

      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: tagStyle.bg, color: tagStyle.color }}
        >
          {entry.version} · {entry.tag}
        </span>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: '#F4F4F5', color: '#71717A' }}
        >
          {entry.date}
        </span>
      </div>

      <h3 className="text-[18px] font-bold mb-3" style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}>
        {entry.title}
      </h3>

      {entry.body && (
        <p className="text-[14px] mb-4 leading-relaxed" style={{ color: '#52525B' }}>{entry.body}</p>
      )}

      <ul className="space-y-2">
        {entry.changes.map((c, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: '#3F3F46' }}>
            <span className="shrink-0 mt-0.5">{c.icon}</span>
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    </m.article>
  )
}

// ── Timeline section ──────────────────────────────────────────────────────
function TimelineSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 75%', 'end 25%'],
  })
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section ref={containerRef} className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
      <div className="max-w-[720px] mx-auto px-6 md:px-8">
        <div className="relative">
          {/* Timeline line container */}
          <div
            className="absolute left-0 top-0 bottom-0 w-px"
            style={{ background: '#E4E4E7', marginLeft: -1 }}
          >
            <m.div
              className="absolute top-0 left-0 w-full origin-top"
              style={{ scaleY, background: '#E8920A', height: '100%' }}
            />
          </div>

          {/* Entries */}
          <div className="pl-10 space-y-8">
            {ENTRIES.map((entry, i) => (
              <ChangelogEntry key={entry.version} entry={entry} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Email CTA ─────────────────────────────────────────────────────────────
function EmailCta() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return
    setSent(true)
  }

  return (
    <section className="py-24 md:py-32" style={{ background: '#18181B' }}>
      <div className="max-w-[640px] mx-auto px-6 text-center">
        <m.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <h2
            className="text-white text-balance"
            style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(28px, 4vw, 40px)' }}
          >
            Vous voulez être notifié des nouveautés ?
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: '#71717A' }}>
            On envoie un email à chaque release importante. Pas de spam, désabonnement en un clic.
          </p>

          {sent ? (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 inline-flex items-center gap-3 px-6 py-4 rounded-2xl"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ADE80' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[14px] font-semibold">
                Inscrit ! On vous prévient dès la prochaine sortie.
              </span>
            </m.div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.fr"
                required
                className="flex-1 px-4 py-3.5 rounded-xl text-[14px] text-zinc-900 outline-none focus:ring-2 focus:ring-orange-500/40 placeholder:text-zinc-400"
                style={{ background: '#FAFAFA', border: '1.5px solid #E4E4E7' }}
              />
              <MagneticCta
                type="submit"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-semibold"
              >
                S'abonner →
              </MagneticCta>
            </form>
          )}

          <p className="mt-5 text-[12px]" style={{ color: '#52525B' }}>
            Aucun spam. Désabonnement en un clic. Données hébergées en France.
          </p>
        </m.div>
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export function ChangelogPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#FAFAFA' }}>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-44 pb-28" style={{ background: '#FAFAFA' }}>
        {/* Gradient for navbar readability */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 100%)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.1), transparent 70%)' }}
        />
        <div className="relative max-w-[1100px] mx-auto px-6 text-center">
          <div className="flex justify-center mb-8">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-[0.1em]"
              style={{ background: '#FFF4E5', color: '#E8920A' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E8920A' }} />
              Changelog
            </span>
          </div>
          <h1
            className="text-balance"
            style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0, fontSize: 'clamp(42px, 6.5vw, 72px)', color: '#0A0A0A' }}
          >
            <TextReveal>Ce qu'on a construit.</TextReveal>
          </h1>
          <p className="mt-7 max-w-[520px] mx-auto text-[17px] leading-relaxed" style={{ color: '#52525B' }}>
            Toutes les nouveautés Splitzy, dans l'ordre.{' '}
            <span style={{ color: '#0A0A0A', fontWeight: 600 }}>On publie dès qu'on ship.</span>
          </p>
          {/* Last update badge */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.4 }}
            className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-semibold"
            style={{ borderColor: '#E4E4E7', color: '#52525B', background: 'white' }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Dernière mise à jour : Mai 2026
          </m.div>
        </div>
      </section>

      {/* ── TIMELINE ─────────────────────────────────────────────────────── */}
      <TimelineSection />

      {/* ── EMAIL CTA ────────────────────────────────────────────────────── */}
      <EmailCta />

      <Footer />
    </div>
  )
}
