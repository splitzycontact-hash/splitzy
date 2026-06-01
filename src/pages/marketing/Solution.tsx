import { useRef } from 'react'
import { m, useScroll, useTransform } from 'framer-motion'

// ── Floating badge + phone mockup ────────────────────────────────────────────
function FeedbackPhoneMockup() {
  return (
    <div className="relative flex items-center justify-center py-8">
      {/* Floating badge */}
      <m.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-2 right-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-xl"
        style={{ background: '#FFFFFF', color: '#0A0A0A' }}
      >
        🚫{' '}
        <span style={{ textDecoration: 'line-through', color: '#EF4444' }}>
          Avis Google
        </span>
      </m.div>

      {/* Phone shell */}
      <div
        className="relative w-[230px] rounded-[32px] overflow-hidden"
        style={{
          background: '#1C1C1E',
          border: '7px solid #2C2C2E',
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
          transform: 'rotate(4deg)',
        }}
      >
        {/* Screen */}
        <div className="px-4 pt-6 pb-5" style={{ background: '#F7F7F7', minHeight: 360 }}>
          <p className="text-[10px] text-center font-semibold mb-4" style={{ color: '#52525B' }}>
            Comment s'est passé votre repas ?
          </p>
          {/* Stars */}
          <div className="flex justify-center gap-1.5 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className="text-[22px]" style={{ color: s <= 3 ? '#E8920A' : '#D4D4D4' }}>
                ★
              </span>
            ))}
          </div>
          {/* Textarea */}
          <div
            className="rounded-xl p-3 text-[10px] leading-relaxed mb-3"
            style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', color: '#52525B' }}
          >
            Le service était trop lent mais la nourriture était excellente...
          </div>
          {/* CTA */}
          <div
            className="py-2.5 rounded-xl text-center text-[11px] font-semibold text-white"
            style={{ background: '#E8920A' }}
          >
            Envoyer au restaurant
          </div>
          <p className="mt-2 text-[9px] text-center" style={{ color: '#A1A1AA' }}>
            Votre avis sera partagé uniquement avec le gérant
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard visual ─────────────────────────────────────────────────────────
function DashboardVisual() {
  return (
    <div
      className="rounded-2xl overflow-hidden w-full max-w-[400px] mx-auto"
      style={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white">Dashboard</span>
          <span className="text-[11px]" style={{ color: '#52525B' }}>Aujourd'hui</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2 p-4">
        {[
          { label: 'Note moy.', value: '4,7 ★', color: '#E8920A' },
          { label: 'Feedbacks', value: '23', color: '#22C55E' },
          { label: 'Tables', value: '12', color: '#3B82F6' },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="text-[17px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: '#71717A' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feedback list */}
      <div className="px-4 pb-4 space-y-2">
        {[
          { init: 'MD', bg: '#FFF4E5', tc: '#E8920A', text: 'Excellent service, je reviendrai !', stars: 5 },
          { init: 'TR', bg: '#18181B', tc: '#FFFFFF', text: 'Très bonne expérience globale.', stars: 4 },
        ].map((f, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: f.bg, color: f.tc }}
            >
              {f.init}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-0.5 mb-0.5">
                {Array.from({ length: f.stars }).map((_, j) => (
                  <span key={j} className="text-[10px]" style={{ color: '#E8920A' }}>★</span>
                ))}
              </div>
              <p className="text-[10px] truncate" style={{ color: '#A1A1AA' }}>{f.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mini chart */}
      <div className="px-4 pb-5">
        <svg viewBox="0 0 200 50" className="w-full h-10" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8920A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#E8920A" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,38 L30,32 L55,36 L80,24 L105,19 L130,13 L155,17 L180,8 L200,5"
            fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            d="M0,38 L30,32 L55,36 L80,24 L105,19 L130,13 L155,17 L180,8 L200,5 L200,50 L0,50 Z"
            fill="url(#cg)"
          />
        </svg>
      </div>
    </div>
  )
}

// ── QR code visual ────────────────────────────────────────────────────────────
function QrVisual() {
  return (
    <div className="relative flex items-center justify-center py-6">
      <div
        className="relative w-[200px] h-[200px] rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* QR pattern */}
        <svg viewBox="0 0 100 100" width="150" height="150">
          {/* Corner TL */}
          <rect x="5" y="5" width="26" height="26" rx="3" fill="none" stroke="white" strokeWidth="3" />
          <rect x="10" y="10" width="16" height="16" rx="1" fill="white" />
          {/* Corner TR */}
          <rect x="69" y="5" width="26" height="26" rx="3" fill="none" stroke="white" strokeWidth="3" />
          <rect x="74" y="10" width="16" height="16" rx="1" fill="white" />
          {/* Corner BL */}
          <rect x="5" y="69" width="26" height="26" rx="3" fill="none" stroke="white" strokeWidth="3" />
          <rect x="10" y="74" width="16" height="16" rx="1" fill="white" />
          {/* Center orange logo */}
          <rect x="41" y="41" width="18" height="18" rx="3" fill="#E8920A" />
          {/* Data dots */}
          {[
            [36,6],[41,6],[51,6],[61,6],[36,11],[46,11],[56,11],[61,11],
            [36,21],[41,21],[51,21],[61,21],[36,26],[46,26],[56,26],
            [6,36],[11,36],[21,36],[36,36],[46,36],[61,36],[71,36],[76,36],[86,36],[96,36],
            [6,46],[16,46],[26,46],[76,46],[96,46],
            [6,56],[11,56],[21,56],[36,56],[76,56],[86,56],[96,56],
            [6,61],[21,61],[36,61],[61,61],[76,61],[86,61],
            [36,71],[46,71],[61,71],[76,71],[86,71],[96,71],
            [36,81],[56,81],[66,81],[86,81],[96,81],
            [36,91],[46,91],[66,91],[76,91],[96,91],
          ].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="4" height="4" rx="0.5" fill="rgba(255,255,255,0.65)" />
          ))}
        </svg>

        {/* Scan line */}
        <m.div
          animate={{ y: [-80, 80] }}
          transition={{ duration: 2.2, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          className="absolute w-full h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent 5%, #E8920A 50%, transparent 95%)', opacity: 0.85 }}
        />
      </div>
    </div>
  )
}

// ── Text reveal ───────────────────────────────────────────────────────────────
function TextReveal({ line, baseDelay = 0 }: { line: string; baseDelay?: number }) {
  const words = line.split(' ')
  return (
    <span style={{ display: 'block' }}>
      {words.map((word, i) => (
        <span key={i}>
          <m.span
            style={{ display: 'inline-block' }}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: baseDelay + i * 0.065, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {word}
          </m.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

// ── Feature block ─────────────────────────────────────────────────────────────
interface FeatureBlockProps {
  number: string
  titleLine1: string
  titleLine2: string
  body: string
  cta: string
  ctaHref: string
  reversed?: boolean
  Visual: React.ComponentType
  stat?: string
}

function FeatureBlock({ number, titleLine1, titleLine2, body, cta, ctaHref, reversed = false, Visual, stat }: FeatureBlockProps) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [28, -28])

  const textContent = (
    <div>
      <m.span
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: '#E8920A' }}
      >
        Feature {number}
      </m.span>

      <m.h3
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="mt-3 font-bold text-white leading-[1.15]"
        style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', letterSpacing: '-0.02em' }}
      >
        {titleLine1}
        <br />
        {titleLine2}
      </m.h3>

      <m.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.18 }}
        className="mt-4 text-[15px] leading-[1.75]"
        style={{ color: '#A1A1AA' }}
      >
        {body}
      </m.p>

      {stat && (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.26 }}
          className="mt-5 px-4 py-3 rounded-lg text-[14px] font-medium text-white"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(232,146,10,0.5)' }}
        >
          {stat}
        </m.div>
      )}

      <m.a
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.32 }}
        href={ctaHref}
        className="mt-5 inline-block text-[14px] font-medium underline underline-offset-4 hover:opacity-75 transition-opacity"
        style={{ color: '#E8920A' }}
      >
        {cta}
      </m.a>
    </div>
  )

  const visualContent = (
    <m.div ref={sectionRef} style={{ y }}>
      <Visual />
    </m.div>
  )

  return (
    <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
      {reversed ? visualContent : textContent}
      {reversed ? textContent : visualContent}
    </div>
  )
}

// ── Section principale ────────────────────────────────────────────────────────
export function Solution() {
  return (
    <section id="solution" className="py-24 md:py-32" style={{ background: '#18181B' }}>
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20 md:mb-28">
          <m.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block text-[11px] font-bold uppercase tracking-[0.12em] mb-5"
            style={{ color: '#E8920A' }}
          >
            La solution
          </m.span>
          <h2
            className="text-white text-balance"
            style={{ fontWeight: 900, fontSize: 'clamp(30px, 5vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.03em' }}
          >
            <TextReveal line="Splitzy intercepte l'insatisfaction" baseDelay={0} />
            <TextReveal line="avant qu'elle arrive sur Google." baseDelay={0.25} />
          </h2>
        </div>

        {/* Blocks */}
        <div className="space-y-24 md:space-y-36">
          <FeatureBlock
            number="01"
            titleLine1="Interceptez l'insatisfaction"
            titleLine2="avant Google."
            body="Quand un client est mécontent, Splitzy lui propose d'abord de contacter directement le restaurant. Il exprime son problème en privé. Vous pouvez répondre et arranger la situation. Il ne part pas sur Google avec une étoile."
            cta="Voir comment ça marche →"
            ctaHref="/fonctionnalites"
            Visual={FeedbackPhoneMockup}
          />

          <FeatureBlock
            number="02"
            titleLine1="Votre réputation,"
            titleLine2="en temps réel."
            body="Recevez chaque feedback instantanément. Répondez avant que ça devienne un problème. Analytics complets — satisfaction, heures de pointe, rotation des tables. Export CSV inclus."
            cta="Découvrir le dashboard →"
            ctaHref="/fonctionnalites"
            reversed
            Visual={DashboardVisual}
          />

          <FeatureBlock
            number="03"
            titleLine1="Payez en moins de 30 secondes."
            titleLine2="Zéro appli, zéro friction."
            body="Le client scanne le QR code sur sa table. Il voit son addition, paie avec Apple Pay ou carte, et peut diviser l'addition automatiquement. Tout ça en moins de 30 secondes."
            cta="Voir le parcours client →"
            ctaHref="/fonctionnalites"
            stat="⚡ 74% des clients préfèrent payer sans appeler le serveur."
            Visual={QrVisual}
          />
        </div>
      </div>
    </section>
  )
}
