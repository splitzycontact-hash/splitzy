import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { m } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
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
        <span key={i}>
          <m.span
            style={{ display: 'inline-block' }}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {word}
          </m.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
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

// ── Badge disponibilité ──────────────────────────────────────────────────
function DispoBadge({ available, dark = false, note }: { available: boolean; dark?: boolean; note?: string }) {
  if (available) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.06em]"
        style={dark
          ? { background: 'rgba(34,197,94,0.12)', color: '#4ADE80' }
          : { background: '#F0FDF4', color: '#15803D' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: dark ? '#4ADE80' : '#22C55E' }} />
        {note ? `Disponible · ${note}` : 'Disponible'}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.06em]"
      style={dark
        ? { background: 'rgba(255,255,255,0.07)', color: '#A1A1AA', border: '1px solid rgba(255,255,255,0.12)' }
        : { background: '#F4F4F5', color: '#71717A', border: '1px solid #E4E4E7' }}
    >
      À venir
    </span>
  )
}

// ── Module card (variantes claire / sombre) ──────────────────────────────
type Module = {
  icon: string
  title: string
  desc: string
  available: boolean
  note?: string
}

function ModuleCard({ mod, index, dark = false }: { mod: Module; index: number; dark?: boolean }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="rounded-2xl p-6 flex flex-col hover:-translate-y-1 transition-transform duration-200"
      style={dark
        ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
        : { background: '#FFFFFF', border: '1px solid #E4E4E7', boxShadow: '0 1px 3px rgba(24,24,27,0.04)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px]"
          style={dark ? { background: 'rgba(232,146,10,0.12)' } : { background: '#FFF4E5' }}
        >
          {mod.icon}
        </div>
        <DispoBadge available={mod.available} dark={dark} note={mod.note} />
      </div>
      <h3 className="text-[15px] font-bold mb-2" style={{ color: dark ? '#FFFFFF' : '#0A0A0A' }}>
        {mod.title}
      </h3>
      <p className="text-[13px] leading-relaxed" style={{ color: dark ? '#A1A1AA' : '#71717A' }}>
        {mod.desc}
      </p>
    </m.div>
  )
}

// ── Section header commun ────────────────────────────────────────────────
function SectionHeader({
  badge, title, sub, dark = false, center = false,
}: {
  badge: string; title: string; sub?: string; dark?: boolean; center?: boolean
}) {
  return (
    <div className={center ? 'text-center' : ''}>
      <span
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] mb-6"
        style={dark
          ? { background: 'rgba(232,146,10,0.12)', color: '#E8920A' }
          : { background: '#FFF4E5', color: '#E8920A' }}
      >
        {badge}
      </span>
      <h2
        className={dark ? 'text-white text-balance' : 'text-balance'}
        style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(30px, 4.2vw, 46px)', color: dark ? undefined : '#0A0A0A' }}
      >
        <TextReveal>{title}</TextReveal>
      </h2>
      {sub && (
        <p
          className={`mt-5 text-[16px] leading-relaxed ${center ? 'max-w-[560px] mx-auto' : 'max-w-[560px]'}`}
          style={{ color: dark ? '#A1A1AA' : '#52525B' }}
        >
          {sub}
        </p>
      )}
    </div>
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
  { n: '03', label: 'Choisit sa part : par article, parts égales ou montant libre' },
  { n: '04', label: 'Paie : carte, Apple Pay, Google Pay' },
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
        <div className="text-[10px] font-bold text-emerald-600">✓ Part payée en 30 sec</div>
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
            { label: 'CA du jour', value: '1 842', unit: '€', color: '#E8920A' },
            { label: 'Note moy.', value: '4,7', unit: '★', color: '#3B82F6' },
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
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">Alertes & activité</div>
          <div className="space-y-2.5">
            {[
              { stars: 0, text: 'Table 6 : paiement bloqué depuis 4 min', time: 'à l’instant', color: '#EF4444', tag: 'Alerte' },
              { stars: 5, text: 'Service impeccable, on reviendra !', time: 'il y a 3 min', color: '#22C55E' },
              { stars: 2, text: 'Entrée froide, dommage.', time: 'il y a 1h', color: '#EF4444', tag: 'Privé' },
            ].map((f, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: '#F4F4F5' }}>
                <div className="text-[11px] font-bold mt-0.5" style={{ color: f.color }}>
                  {f.stars > 0 ? '★'.repeat(f.stars) : '⚠'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-zinc-700 truncate">{f.text}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{f.time}</p>
                </div>
                {f.tag && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: '#FFF4E5', color: '#E8920A' }}
                  >
                    {f.tag}
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
        Temps réel
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

// ── Split mode cards (fond clair) ─────────────────────────────────────────
// Code réel : src/context/types.ts (splitMode 'item' | 'equal' | 'custom'),
// src/pages/Items.tsx + src/components/features/SplitStrip.tsx (splitFactor ÷2/÷3/÷4)
const SPLIT_MODES = [
  {
    icon: '🧾',
    title: 'Par article',
    desc: 'Chaque convive sélectionne ses plats. Un article se partage à 2, 3 ou 4 (÷2 ÷3 ÷4).',
  },
  {
    icon: '👥',
    title: 'Parts égales',
    desc: 'Division égale entre N personnes en un clic.',
  },
  {
    icon: '💶',
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
      className="flex flex-col items-center text-center p-7 rounded-2xl border cursor-default bg-white"
      style={{ borderColor: '#E4E4E7', boxShadow: '0 1px 3px rgba(24,24,27,0.04)' }}
    >
      <div className="text-4xl mb-4">{mode.icon}</div>
      <h3 className="text-[16px] font-bold mb-2" style={{ color: '#0A0A0A' }}>{mode.title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: '#71717A' }}>{mode.desc}</p>
    </m.div>
  )
}

// ── Données modules (chaque entrée vérifiée dans le code — GOAL_WEB_00) ───

// Pilotage :
//   KPIs & Analytics  → src/restaurant/pages/Overview.tsx + Analytics.tsx (routes /restaurant, /restaurant/analytics)
//   Plan de salle     → src/restaurant/pages/SallePage.tsx + convex/zones.ts (route /restaurant/salle)
//   Menu en direct    → src/restaurant/pages/MenuPage.tsx (isAvailable = 86, plat du jour, prix live)
//   Alertes manager   → src/restaurant/pages/Overview.tsx (paiement bloqué, QR inactif, avis négatifs)
//   Clôture           → src/restaurant/pages/SallePage.tsx + convex/closures.ts (getTipDistribution, sendTipReport)
//   Multi-étab.       → PAS ENCORE EN CODE (aucune vue agrégée dans src/restaurant/) → "À venir"
const PILOTAGE_MODULES: Module[] = [
  {
    icon: '📊',
    title: 'KPIs & Analytics temps réel',
    desc: 'CA du service, couverts, ticket moyen, rotation des tables, moyens de paiement, pourboires. Graphes par période et heatmap horaire.',
    available: true,
  },
  {
    icon: '🗺',
    title: 'Plan de salle interactif',
    desc: 'Tables en drag & drop, statuts en direct, tables VIP, timer d’inactivité. Forcez le paiement QR ou clôturez une table à distance.',
    available: true,
  },
  {
    icon: '🍽',
    title: 'Menu en direct',
    desc: 'Rupture (« 86 »), changement de prix ou plat du jour : répercuté instantanément sur le menu QR des clients. Sync Square en un clic.',
    available: true,
  },
  {
    icon: '🔔',
    title: 'Alertes manager',
    desc: '« Table 6 : paiement bloqué depuis 4 min », « Aucun paiement — problème QR ? », avis négatif reçu : prévenu au moment où ça se passe.',
    available: true,
  },
  {
    icon: '🌙',
    title: 'Clôture de service',
    desc: 'Récap automatique (CA, couverts, pourboires), répartition des pourboires par serveur, export CSV et rapport envoyé par email.',
    available: true,
  },
  {
    icon: '🏢',
    title: 'Multi-établissements',
    desc: 'Vue agrégée de tous vos restaurants, benchmark entre sites, déploiement de menu groupé. En cours de construction.',
    available: false,
  },
]

// Équipe :
//   Planning  → src/restaurant/pages/Planning.tsx + convex/planning.ts, convex/shifts.ts (route /restaurant/planning)
//   Extras    → src/restaurant/pages/ExtrasPage.tsx + convex/extras.ts, convex/extraConvocations.ts (route /restaurant/extras)
//   Chat      → src/restaurant/pages/ChatPage.tsx + components/FloatingChat.tsx + convex/messages.ts (route /restaurant/chat)
const EQUIPE_MODULES: Module[] = [
  {
    icon: '📅',
    title: 'Planning & shifts',
    desc: 'Vue calendrier par poste, création de shift en quelques clics, suivi de présence et métriques par serveur.',
    available: true,
  },
  {
    icon: '🤝',
    title: 'Extras & renforts',
    desc: 'Répertoire d’extras, convocation par email en un clic, confirmation depuis le lien reçu, pool de confiance avec notation après chaque service.',
    available: true,
  },
  {
    icon: '💬',
    title: 'Chat interne',
    desc: 'Messagerie gérant ↔ salle : broadcast à toute l’équipe ou messages directs, notifications, widget accessible depuis tout le dashboard.',
    available: true,
  },
]

// IA & Réputation :
//   Insights IA       → convex/insights.ts + src/restaurant/pages/Analytics.tsx (réservé plan Pro — gate isPro)
//   Feedback privé    → src/restaurant/pages/Reputation.tsx + convex/feedbacks.ts (route /restaurant/reputation)
const IA_MODULES: Module[] = [
  {
    icon: '✨',
    title: 'Insights IA',
    desc: 'Analyse automatique de vos ventes et feedbacks : tendances, rotation lente, suggestions d’action concrètes pour le prochain service.',
    available: true,
    note: 'plan Pro',
  },
  {
    icon: '⭐',
    title: 'Feedback privé & tags',
    desc: 'Chaque avis arrive dans une inbox privée avec tags automatiques (service, attente, cuisine). Alerte immédiate si note basse.',
    available: true,
  },
]

// ── Main component ────────────────────────────────────────────────────────
export function FonctionnalitesPage() {
  const { hash } = useLocation()

  // React Router ne scrolle pas vers les ancres (#paiement, #pilotage, #equipe, #ia)
  // lors d'une navigation client-side — on le fait manuellement après le mount.
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => clearTimeout(t)
  }, [hash])

  return (
    <div className="w-full min-h-screen" style={{ background: '#FAFAFA' }}>
      <Helmet>
        <title>Fonctionnalités — Splitzy</title>
        <meta name="description" content="Paiement fractionné par QR code, plan de salle en direct, planning équipe, chat interne, insights IA : toutes les fonctionnalités pour piloter votre restaurant à distance." />
      </Helmet>
      <Navbar />

      <FonctionnalitesHero />

      {/* ── PAIEMENT (#FAFAFA) ────────────────────────────────────────────
          Module vérifié : flow convive src/pages/Items.tsx → Payment.tsx,
          modes src/context/types.ts, verrou convex/featureFlags.ts (VERROU_MODE_PAIEMENT) */}
      <section id="paiement" className="py-24 md:py-32" style={{ background: '#FAFAFA', borderTop: '1px solid #E4E4E7' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div>
              <SectionHeader
                badge="Paiement"
                title="Le paiement fractionné qui a fait connaître Splitzy."
                sub="Zéro application à télécharger, zéro friction. Le client scanne, choisit sa part, paie et repart avec son reçu — en moins de 30 secondes."
              />
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

          {/* 3 modes de partage */}
          <div className="mt-20">
            <div className="text-center mb-10">
              <h3 className="text-balance" style={{ fontWeight: 800, letterSpacing: '-0.03em', fontSize: 'clamp(22px, 3vw, 30px)', color: '#0A0A0A' }}>
                Trois façons de partager l'addition.
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {SPLIT_MODES.map((mo, i) => (
                <SplitCard key={mo.title} mode={mo} index={i} />
              ))}
            </div>

            {/* Verrou de mode de paiement */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-6 rounded-2xl border p-6 md:p-7 flex flex-col md:flex-row md:items-center gap-5"
              style={{ background: '#FFFFFF', borderColor: 'rgba(232,146,10,0.35)', boxShadow: '0 10px 30px -18px rgba(232,146,10,0.35)' }}
            >
              <div
                className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-[22px]"
                style={{ background: '#FFF4E5' }}
              >
                🔒
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                  <h4 className="text-[16px] font-bold" style={{ color: '#0A0A0A' }}>Verrou de mode de paiement</h4>
                  <DispoBadge available note="nouveau" />
                </div>
                <p className="text-[14px] leading-relaxed" style={{ color: '#52525B' }}>
                  Dès que le premier convive paie, son mode de partage est verrouillé pour toute la table.
                  Impossible de mélanger « par article » et « parts égales » sur la même addition — fini les
                  confusions et les tables qui paient trop ou pas assez.
                </p>
              </div>
            </m.div>
          </div>
        </div>
      </section>

      {/* ── PILOTAGE (#18181B) ────────────────────────────────────────────── */}
      <section id="pilotage" className="py-24 md:py-32" style={{ background: '#18181B' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-14">
            <SectionHeader
              badge="Pilotage"
              title="Votre établissement en temps réel, où que vous soyez."
              sub="Le dashboard Splitzy vous donne la salle, les chiffres et les alertes en direct — depuis le comptoir, chez vous, ou à l'autre bout de la France."
              dark
              center
            />
          </div>

          <DashboardMockup />

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILOTAGE_MODULES.map((mod, i) => (
              <ModuleCard key={mod.title} mod={mod} index={i} dark />
            ))}
          </div>
        </div>
      </section>

      {/* ── ÉQUIPE (#FAFAFA) ──────────────────────────────────────────────── */}
      <section id="equipe" className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-14">
            <SectionHeader
              badge="Équipe"
              title="Votre équipe, organisée depuis le même outil."
              sub="Planning, renforts de dernière minute et communication avec la salle : tout est au même endroit que vos paiements et vos chiffres."
              center
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {EQUIPE_MODULES.map((mod, i) => (
              <ModuleCard key={mod.title} mod={mod} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── IA & RÉPUTATION (#18181B) ─────────────────────────────────────── */}
      <section id="ia" className="py-24 md:py-32" style={{ background: '#18181B' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left: diagram */}
            <div className="flex justify-center">
              <FeedbackDiagram />
            </div>
            {/* Right: text */}
            <div>
              <SectionHeader
                badge="IA & Réputation"
                title="L'insatisfaction, interceptée avant Google."
                sub="Un client mécontent a deux options : partir sans rien dire, ou poster une étoile sur Google. Splitzy crée une troisième voie : vous parler en privé. L'IA analyse chaque feedback et vous dit où agir."
                dark
              />
              {/* Spring counter */}
              <div className="mt-10">
                <ReservationStat />
              </div>
              <p className="mt-4 text-[13px]" style={{ color: '#52525B' }}>
                3 avis 1 étoile = −0,4 point de note moyenne.
              </p>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[760px] mx-auto">
            {IA_MODULES.map((mod, i) => (
              <ModuleCard key={mod.title} mod={mod} index={i} dark />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL (#FAFAFA) ───────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <h2
            className="text-balance"
            style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(36px, 5vw, 56px)', color: '#0A0A0A' }}
          >
            <TextReveal>Prêt à voir Splitzy en action ?</TextReveal>
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed" style={{ color: '#52525B' }}>
            Démonstration personnalisée, sans engagement. Configuré en 15 minutes.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <MagneticCta href="/contact">
              Réserver une démo →
            </MagneticCta>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1 text-[15px] font-semibold px-7 py-3.5 rounded-xl border transition-colors hover:border-zinc-400"
              style={{ color: '#0A0A0A', borderColor: '#E4E4E7' }}
            >
              Voir les tarifs
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-1 text-[15px] font-semibold px-7 py-3.5 rounded-xl border transition-colors hover:border-zinc-400"
              style={{ color: '#0A0A0A', borderColor: '#E4E4E7' }}
            >
              Voir comment ça marche
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
