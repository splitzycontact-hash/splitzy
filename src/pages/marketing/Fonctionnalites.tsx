import { useRef, useState } from 'react'
import { m } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useFadeInView, useCountUp } from './shared'
import FonctionnalitesHero from '../../components/Fonctionnalites/FonctionnalitesHero'

// ── Text reveal (mot par mot au scroll) ─────────────────────────────────
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
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {word}{i < words.length - 1 ? ' ' : ''}
        </m.span>
      ))}
    </span>
  )
}

// ── Magnetic button ──────────────────────────────────────────────────────
function MagneticCta({ children, href }: { children: React.ReactNode; href: string }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect()
    setPos({ x: (e.clientX - r.left - r.width / 2) * 0.28, y: (e.clientY - r.top - r.height / 2) * 0.28 })
  }

  return (
    <m.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.5 }}
      className="inline-flex items-center gap-2 text-white text-[15px] font-semibold px-7 py-3.5 rounded-xl"
      style={{ background: '#E8920A' }}
    >
      {children}
    </m.a>
  )
}

// ── Spring counter stat ──────────────────────────────────────────────────
function ReservationStat() {
  const { ref, inView } = useFadeInView()
  const val = useCountUp(59, { duration: 2200, inView })
  return (
    <div ref={ref}>
      <div
        className="font-black tabular-nums leading-none"
        style={{ fontSize: 'clamp(56px, 8vw, 80px)', letterSpacing: '-0.05em', color: '#E8920A' }}
      >
        {val}%
      </div>
      <p className="mt-3 text-zinc-400 text-[15px]">de clients potentiels dissuadés</p>
      <p className="mt-1 text-zinc-500 text-[13px]">dès que 3 avis négatifs apparaissent en ligne</p>
    </div>
  )
}

// ── QR step timeline ─────────────────────────────────────────────────────
const QR_STEPS = [
  { n: '01', label: 'Le client scanne le QR code sur la table' },
  { n: '02', label: 'Voit son addition (connecté ou non à la caisse)' },
  { n: '03', label: 'Paie : carte, Apple Pay, Google Pay' },
  { n: '04', label: "Partage l'addition automatiquement" },
  { n: '05', label: 'Télécharge son reçu' },
]

function QrStepList() {
  const { ref, inView } = useFadeInView()
  return (
    <m.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }}
      className="mt-8 space-y-4"
    >
      {QR_STEPS.map((s) => (
        <m.div
          key={s.n}
          variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } } }}
          className="flex items-start gap-4"
        >
          <span
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold mt-0.5"
            style={{ background: '#FFF4E5', color: '#E8920A' }}
          >
            {s.n}
          </span>
          <p className="text-[15px] text-zinc-600 leading-snug pt-1.5">{s.label}</p>
        </m.div>
      ))}
    </m.div>
  )
}

// ── QR phone mockup ──────────────────────────────────────────────────────
function QrPhoneMockup() {
  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative mx-auto"
      style={{ maxWidth: 280 }}
    >
      {/* Phone frame */}
      <div
        className="relative rounded-[40px] overflow-hidden border-4 shadow-2xl"
        style={{ borderColor: '#18181B', background: '#0A0A0A', padding: '28px 12px 20px' }}
      >
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full" style={{ background: '#0A0A0A', border: '2px solid #27272A' }} />
        {/* Screen */}
        <div className="rounded-3xl overflow-hidden" style={{ background: '#FAFAFA', minHeight: 400 }}>
          {/* Header */}
          <div className="px-4 pt-5 pb-3 border-b" style={{ borderColor: '#E4E4E7' }}>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-zinc-500">Table 4 · Bistrot de la Paix</div>
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>
          {/* Items */}
          <div className="px-4 py-4 space-y-2.5">
            {[
              { name: 'Entrecôte', price: '24,00' },
              { name: 'Coupe de vin', price: '6,00' },
              { name: 'Café', price: '2,50' },
            ].map((item) => (
              <div key={item.name} className="flex justify-between">
                <span className="text-[12px] text-zinc-700">{item.name}</span>
                <span className="text-[12px] font-semibold text-zinc-900">{item.price} €</span>
              </div>
            ))}
            <div className="pt-2.5 mt-2.5 border-t flex justify-between" style={{ borderColor: '#E4E4E7' }}>
              <span className="text-[13px] font-bold text-zinc-900">Total</span>
              <span className="text-[13px] font-bold" style={{ color: '#E8920A' }}>32,50 €</span>
            </div>
          </div>
          {/* CTA */}
          <div className="px-4 pb-5 pt-1">
            <div
              className="w-full py-3.5 rounded-xl text-center text-white text-[13px] font-bold"
              style={{ background: '#E8920A' }}
            >
              Payer 32,50 € →
            </div>
          </div>
          {/* Payment methods */}
          <div className="px-4 pb-5 grid grid-cols-2 gap-2">
            <div className="py-2.5 rounded-xl border text-center text-[11px] font-semibold text-zinc-700" style={{ borderColor: '#E4E4E7' }}>
              Apple Pay
            </div>
            <div className="py-2.5 rounded-xl border text-center text-[11px] font-semibold text-zinc-700" style={{ borderColor: '#E4E4E7' }}>
              Google Pay
            </div>
          </div>
        </div>
      </div>
      {/* Floating badge */}
      <m.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-6 top-1/3 bg-white rounded-2xl shadow-xl px-3 py-2 border"
        style={{ borderColor: '#E4E4E7' }}
      >
        <div className="text-[10px] font-bold text-emerald-600">✓ Payé en 8 sec</div>
      </m.div>
    </m.div>
  )
}

// ── Feedback flow diagram ─────────────────────────────────────────────────
function FeedbackDiagram() {
  const { ref, inView } = useFadeInView()
  const nodes = [
    { label: 'Client insatisfait', icon: '😤', color: '#52525B', bg: 'rgba(82,82,91,0.1)' },
    { label: 'Page Splitzy', icon: '📱', color: '#E8920A', bg: 'rgba(232,146,10,0.1)' },
  ]
  const branches = [
    { rating: '1–3 ★', path: 'Message privé → gérant', result: 'Résolution ✅', ratingColor: '#EF4444' },
    { rating: '4–5 ★', path: 'Lien Google Reviews', result: '★★★★★', ratingColor: '#22C55E' },
  ]
  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-0"
    >
      {nodes.map((n, i) => (
        <div key={i} className="flex flex-col items-center">
          <m.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: i * 0.25 }}
            className="px-5 py-3 rounded-2xl border text-[13px] font-semibold text-center"
            style={{ background: n.bg, borderColor: n.color, color: n.color, minWidth: 200 }}
          >
            {n.icon} {n.label}
          </m.div>
          {i < nodes.length - 1 && (
            <m.div
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ duration: 0.3, delay: (i + 0.5) * 0.25 }}
              className="w-px h-8 origin-top"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            />
          )}
        </div>
      ))}

      {/* Arrow down */}
      <m.div
        initial={{ scaleY: 0 }}
        animate={inView ? { scaleY: 1 } : {}}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="w-px h-8 origin-top"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      />

      {/* Branch */}
      <div className="flex gap-4 items-start">
        {branches.map((b, i) => (
          <m.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45, delay: 0.7 + i * 0.15 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div
              className="px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{ background: 'rgba(255,255,255,0.08)', color: b.ratingColor }}
            >
              {b.rating}
            </div>
            <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div
              className="text-[11px] text-zinc-400 px-3 py-2 rounded-xl text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="font-medium text-zinc-300">{b.path}</div>
            </div>
            <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <div className="text-[12px] font-bold text-white">{b.result}</div>
          </m.div>
        ))}
      </div>
    </m.div>
  )
}

// ── Dashboard mockup ──────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <m.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative mx-auto max-w-3xl"
    >
      <div className="bg-white rounded-2xl border shadow-[0_24px_64px_-20px_rgba(0,0,0,0.15)]" style={{ borderColor: '#E4E4E7' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E4E4E7' }}>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-[12px] font-semibold text-zinc-500">Dashboard · Bistrot de la Paix</span>
          </div>
          <div
            className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A' }}
          >
            ● Live
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-px" style={{ background: '#E4E4E7' }}>
          {[
            { label: 'Note moy.', value: '4,7', unit: '★', color: '#E8920A' },
            { label: 'Feedbacks', value: '23', unit: 'ce mois', color: '#3B82F6' },
            { label: 'Tables', value: '12', unit: 'actives', color: '#8B5CF6' },
            { label: 'Rotation', value: '34', unit: 'min/table', color: '#059669' },
          ].map((s) => (
            <div key={s.label} className="bg-white px-4 py-4">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wide">{s.label}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-[22px] font-bold text-zinc-900" style={{ letterSpacing: '-0.03em' }}>{s.value}</span>
                <span className="text-[11px] text-zinc-400">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Feedback list */}
        <div className="px-6 py-4">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">Derniers feedbacks</div>
          <div className="space-y-2.5">
            {[
              { stars: 5, text: 'Service impeccable, on reviendra !', time: 'il y a 3 min', color: '#22C55E' },
              { stars: 4, text: 'Très bon repas, attente un peu longue.', time: 'il y a 18 min', color: '#84CC16' },
              { stars: 2, text: 'Entrée froide, dommage.', time: 'il y a 1h', color: '#EF4444', private: true },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: '#F4F4F5' }}>
                <div className="text-[11px] font-bold mt-0.5" style={{ color: f.color }}>{'★'.repeat(f.stars)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-zinc-700 truncate">{f.text}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{f.time}</p>
                </div>
                {f.private && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: '#FFF4E5', color: '#E8920A' }}
                  >
                    Privé
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Floating annotations */}
      <m.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-6 top-1/4 bg-white rounded-xl shadow-lg px-3 py-2 border text-[11px] font-semibold"
        style={{ borderColor: '#E8920A', color: '#E8920A' }}
      >
        Satisfaction 94%
      </m.div>
      <m.div
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute -right-4 bottom-1/3 bg-white rounded-xl shadow-lg px-3 py-2 border text-[11px] font-semibold text-zinc-800"
        style={{ borderColor: '#E4E4E7' }}
      >
        Export CSV
      </m.div>
    </m.div>
  )
}

// ── Split mode cards ──────────────────────────────────────────────────────
const SPLIT_MODES = [
  {
    icon: '🧾',
    title: 'Par article',
    desc: 'Chaque convive sélectionne ses plats. Splitzy calcule.',
  },
  {
    icon: '👥',
    title: 'Par personnes',
    desc: 'Division égale entre N personnes en un clic.',
  },
  {
    icon: '💬',
    title: 'Montant libre',
    desc: "Chacun saisit ce qu'il souhaite payer.",
  },
]

function SplitCard({ mode, index }: { mode: typeof SPLIT_MODES[number]; index: number }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.12 }}
      whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.2 } }}
      className="flex flex-col items-center text-center p-7 rounded-2xl border cursor-default"
      style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="text-4xl mb-4">{mode.icon}</div>
      <h3 className="text-[16px] font-bold text-white mb-2">{mode.title}</h3>
      <p className="text-[13px] text-zinc-400 leading-relaxed">{mode.desc}</p>
    </m.div>
  )
}

// ── Dashboard feature grid ────────────────────────────────────────────────
const DASHBOARD_FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Satisfaction en temps réel',
    desc: 'Graphe des notes par heure, semaine, mois.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Feedbacks privés',
    desc: 'Historique complet, réponses directes au client.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: 'Rotation des tables',
    desc: 'Heatmap horaire pour optimiser chaque service.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    title: 'Export données clients',
    desc: 'CSV complet : emails, téléphones, historique.',
  },
]

// ── Main component ────────────────────────────────────────────────────────
export function FonctionnalitesPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#FAFAFA' }}>
      <Navbar />

      <FonctionnalitesHero />

      {/* ── FEATURE 1 : QR Paiement (#FAFAFA) ───────────────────────────── */}
      <section id="feature-01" className="py-24 md:py-32" style={{ background: '#FAFAFA', borderTop: '1px solid #E4E4E7' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div>
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] mb-6"
                style={{ background: '#FFF4E5', color: '#E8920A' }}
              >
                Feature 01
              </span>
              <h2
                className="text-balance"
                style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(32px, 4.5vw, 48px)', color: '#0A0A0A' }}
              >
                <TextReveal>Paiement en moins de 30 secondes.</TextReveal>
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed" style={{ color: '#52525B' }}>
                Zéro application à télécharger. Zéro friction. Le client scanne, voit son addition, paie et reçoit son reçu en moins de 30 secondes.
              </p>
              <QrStepList />
              {/* Stat */}
              <m.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-2xl border"
                style={{ background: '#FFF4E5', borderColor: 'rgba(232,146,10,0.2)' }}
              >
                <span className="text-[28px] font-black" style={{ color: '#E8920A', letterSpacing: '-0.04em' }}>12 min</span>
                <span className="text-[13px]" style={{ color: '#71717A' }}>
                  gagnées par table<br />par service
                </span>
              </m.div>
            </div>
            {/* Right: phone mockup */}
            <div className="flex justify-center">
              <QrPhoneMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE 2 : Feedback interception (#18181B) ──────────────────── */}
      <section id="feature-02" className="py-24 md:py-32" style={{ background: '#18181B' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left: diagram */}
            <div className="flex justify-center">
              <FeedbackDiagram />
            </div>
            {/* Right: text */}
            <div>
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] mb-6"
                style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}
              >
                Feature 02
              </span>
              <h2
                className="text-white text-balance"
                style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(32px, 4.5vw, 48px)' }}
              >
                <TextReveal>La feature qu'aucun concurrent n'a.</TextReveal>
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed" style={{ color: '#A1A1AA' }}>
                Traditionnellement, un client insatisfait a deux options : partir sans rien dire ou laisser un avis 1 étoile sur Google.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: '#A1A1AA' }}>
                Splitzy crée une <span className="text-white font-semibold">troisième voie</span> : vous contacter directement. L'avis négatif n'existe pas.
              </p>
              {/* Spring counter */}
              <div className="mt-10">
                <ReservationStat />
              </div>
              {/* Proof line */}
              <p className="mt-4 text-[13px]" style={{ color: '#52525B' }}>
                3 avis 1 étoile = −0,4 point de note moyenne.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE 3 : Dashboard (#FAFAFA) ──────────────────────────────── */}
      <section id="feature-03" className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-16">
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] mb-6"
              style={{ background: '#FFF4E5', color: '#E8920A' }}
            >
              Feature 03
            </span>
            <h2
              className="text-balance"
              style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(32px, 4.5vw, 48px)', color: '#0A0A0A' }}
            >
              <TextReveal>Votre réputation, sous contrôle.</TextReveal>
            </h2>
            <p className="mt-5 max-w-[560px] mx-auto text-[16px] leading-relaxed" style={{ color: '#52525B' }}>
              Recevez chaque feedback instantanément. Répondez avant que ça devienne un problème. Analytics complets.
            </p>
          </div>

          {/* Dashboard mockup */}
          <DashboardMockup />

          {/* Feature grid */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {DASHBOARD_FEATURES.map((f, i) => (
              <m.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="bg-white border rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-200 hover:shadow-lg hover:shadow-orange-600/5"
                style={{ borderColor: '#E4E4E7' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: '#FFF4E5' }}
                >
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-bold mb-2" style={{ color: '#0A0A0A' }}>{f.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#71717A' }}>{f.desc}</p>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE 4 : Partage d'addition (#18181B) ─────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#18181B' }}>
        <div className="max-w-[900px] mx-auto px-6 text-center">
          <span
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] mb-6"
            style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}
          >
            Feature 04
          </span>
          <h2
            className="text-white text-balance"
            style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(32px, 4.5vw, 48px)' }}
          >
            <TextReveal>Finies les discussions pour diviser l'addition.</TextReveal>
          </h2>
          <p className="mt-5 max-w-[520px] mx-auto text-[15px] leading-relaxed" style={{ color: '#A1A1AA' }}>
            Trois façons de partager, pour que chaque table soit satisfaite. En 2 tapotements.
          </p>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
            {SPLIT_MODES.map((m_, i) => (
              <SplitCard key={m_.title} mode={m_} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL (#FAFAFA → orange) ─────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <h2
            className="text-balance"
            style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(36px, 5vw, 56px)', color: '#0A0A0A' }}
          >
            <TextReveal>Prêt à essayer ?</TextReveal>
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed" style={{ color: '#52525B' }}>
            Configuré en 15 minutes. Gratuit pour commencer. Aucune carte requise.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <MagneticCta href="/restaurant/onboarding">
              Commencer gratuitement →
            </MagneticCta>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1 text-[15px] font-semibold px-7 py-3.5 rounded-xl border transition-colors hover:border-zinc-400"
              style={{ color: '#0A0A0A', borderColor: '#E4E4E7' }}
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
