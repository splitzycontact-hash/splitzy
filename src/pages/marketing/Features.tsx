import { m } from 'framer-motion'
import { Link } from 'react-router-dom'
import { fadeInUp, useFadeInView } from './shared'
import { IconWallet, IconChartBar, IconBell, IconSparkles, IconUsers, IconMenuBook } from './Icons'

function FeatureCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <m.div
      variants={fadeInUp}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={
        'group relative bg-white border border-ink-100 rounded-2xl overflow-hidden transition-shadow duration-300 ' +
        'hover:border-orange-200 hover:shadow-xl hover:shadow-orange-600/5 ' +
        className
      }
    >
      {children}
    </m.div>
  )
}

function SmallCard({ Icon, title, desc, to }: {
  Icon: React.ComponentType<{ size?: number; stroke?: number }>
  title: string
  desc: string
  to?: string
}) {
  return (
    <FeatureCard className="p-6 md:p-7 h-full flex flex-col">
      <div
        className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-orange-600 mb-4"
        style={{ background: 'linear-gradient(135deg, #FFF4E5 0%, #FFE4BF 100%)' }}
      >
        <Icon size={20} stroke={1.7} />
      </div>
      <h3 className="text-[17px] md:text-[18px] font-semibold text-ink-900 leading-snug">{title}</h3>
      <p className="mt-2 text-[14px] leading-[1.55] text-ink-500">{desc}</p>
      {to && (
        <Link to={to} className="mt-3 text-[13px] font-medium text-orange-600 hover:text-orange-700 transition-colors">
          En savoir plus →
        </Link>
      )}
    </FeatureCard>
  )
}

function DarkSmallCard({ Icon, title, desc, to, secondaryLink }: {
  Icon: React.ComponentType<{ size?: number; stroke?: number }>
  title: string; desc: string; to?: string
  secondaryLink?: { label: string; to: string }
}) {
  return (
    <m.div
      variants={fadeInUp}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative noise-card rounded-2xl overflow-hidden transition-all duration-300 hover:border-orange-400/30 hover:shadow-xl hover:shadow-orange-600/10 p-6 md:p-7 h-full flex flex-col"
    >
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-orange-600/20 text-orange-400 mb-4">
        <Icon size={20} stroke={1.7} />
      </div>
      <h3 className="text-[17px] md:text-[18px] font-semibold text-white leading-snug font-display">{title}</h3>
      <p className="mt-2 text-[14px] leading-[1.55] text-white/50">{desc}</p>
      {to && (
        <Link to={to} className="mt-3 text-[13px] font-medium text-orange-400 hover:text-orange-300 transition-colors">
          En savoir plus →
        </Link>
      )}
      {secondaryLink && (
        <Link
          to={secondaryLink.to}
          onClick={() => window.scrollTo(0, 0)}
          className="mt-1.5 text-[13px] font-medium text-white/45 hover:text-orange-300 transition-colors"
        >
          {secondaryLink.label}
        </Link>
      )}
    </m.div>
  )
}

function SmartSplitVisual() {
  return (
    <div className="relative h-full min-h-[260px] flex items-end">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/60 via-white to-white" />
      <div className="relative w-full p-6 md:p-7 pt-12">
        <div className="bg-white rounded-2xl shadow-[0_18px_40px_-20px_rgba(24,24,27,0.18)] border border-ink-100 p-4 max-w-[280px] ml-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-400">Addition</span>
            <span className="text-[11px] text-ink-400 whitespace-nowrap">Table 4</span>
          </div>
          <div className="space-y-2">
            {[
              { who: 'Léa',    plat: 'Entrecôte', price: '24,00 €', avatar: 'L', color: '#E8920A' },
              { who: 'Hugo',   plat: 'Risotto',   price: '19,50 €', avatar: 'H', color: '#059669' },
              { who: 'Marion', plat: 'Saumon',    price: '22,00 €', avatar: 'M', color: '#3B82F6' },
            ].map((r) => (
              <div key={r.who} className="flex items-center gap-2.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: r.color }}
                >
                  {r.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-ink-900 truncate">{r.plat}</p>
                  <p className="text-[10px] text-ink-400 truncate">{r.who}</p>
                </div>
                <p className="shrink-0 text-[12px] font-bold text-ink-900 tabular-nums whitespace-nowrap">{r.price}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-dashed border-ink-200 flex items-center justify-between">
            <span className="text-[11px] text-ink-500 uppercase tracking-wider font-medium">Total</span>
            <span className="text-[14px] font-bold text-orange-600 tabular-nums whitespace-nowrap">65,50&nbsp;€</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const SALLE_TABLES: { n: number; status: 'free' | 'dining' | 'payment' }[] = [
  { n: 1, status: 'dining' }, { n: 2, status: 'free' },   { n: 3, status: 'payment' }, { n: 4, status: 'dining' },
  { n: 5, status: 'free' },   { n: 6, status: 'dining' }, { n: 7, status: 'payment' }, { n: 8, status: 'free' },
]

const SALLE_STATUS = {
  free:    { bg: '#F4F4F5', border: '#E4E4E7', text: '#A1A1AA' },
  dining:  { bg: '#FFF4E5', border: '#FCD9A0', text: '#B45309' },
  payment: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
}

function SalleVisual() {
  return (
    <div className="relative h-full min-h-[260px] flex items-center">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/60 via-white to-white" />
      <div className="relative w-full p-6 md:p-7">
        <div className="bg-white rounded-2xl shadow-[0_18px_40px_-20px_rgba(24,24,27,0.18)] border border-ink-100 p-4 max-w-[300px] mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-400">Salle en direct</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              Live
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {SALLE_TABLES.map((t) => {
              const s = SALLE_STATUS[t.status]
              return (
                <div
                  key={t.n}
                  className="rounded-lg py-2.5 text-center text-[11px] font-bold tabular-nums"
                  style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
                >
                  T{t.n}
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-dashed border-ink-200 flex items-center gap-2">
            <span className="shrink-0 w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <IconBell size={13} stroke={2} />
            </span>
            <p className="text-[11px] text-ink-500 leading-snug">
              <span className="font-semibold text-ink-900">Table 3</span> demande le paiement — 142,80 €
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LargeCard({ Icon, title, desc, Visual, to }: {
  Icon: React.ComponentType<{ size?: number; stroke?: number }>
  title: string
  desc: string
  Visual: React.ComponentType
  to?: string
}) {
  return (
    <FeatureCard className="overflow-hidden md:col-span-2 flex flex-col md:flex-row min-h-[280px]">
      <div className="p-6 md:p-8 md:max-w-[340px] flex flex-col">
        <div
          className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-orange-600 mb-5"
          style={{ background: 'linear-gradient(135deg, #FFF4E5 0%, #FFE4BF 100%)' }}
        >
          <Icon size={20} stroke={1.7} />
        </div>
        <h3 className="text-[20px] md:text-[22px] font-semibold text-ink-900 leading-snug">{title}</h3>
        <p className="mt-3 text-[15px] leading-[1.6] text-ink-500">{desc}</p>
        {to && (
          <Link to={to} className="mt-4 text-[14px] font-medium text-orange-600 hover:text-orange-700 transition-colors">
            En savoir plus →
          </Link>
        )}
      </div>
      <div className="flex-1 border-t md:border-t-0 md:border-l border-ink-100 relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '180px 180px' }} />
        <Visual />
      </div>
    </FeatureCard>
  )
}

export function Features() {
  const { ref, inView } = useFadeInView()

  return (
    <section
      id="fonctionnalites"
      className="relative py-16 md:py-24 section-cream"
      aria-labelledby="features-heading"
    >
      <div ref={ref} className="max-w-6xl mx-auto px-4 md:px-6">
        <m.div
          className="text-center"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          <m.span
            variants={fadeInUp}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ background: 'linear-gradient(135deg, rgba(232,146,10,0.15), rgba(232,146,10,0.05))', color: '#E8920A', border: '1px solid rgba(232,146,10,0.25)' }}
          >
            Fonctionnalités
          </m.span>
          <m.h2
            id="features-heading"
            variants={fadeInUp}
            className="mt-5 text-[28px] md:text-[40px] font-bold text-ink-900 leading-[1.15] text-balance max-w-2xl mx-auto font-display"
          >
            Quatre piliers. Un seul outil.
          </m.h2>
          <m.p
            variants={fadeInUp}
            className="mt-4 text-[16px] md:text-[18px] text-ink-500 max-w-xl mx-auto leading-[1.6]"
          >
            Paiement, pilotage, IA, équipe — pensé pour les gérants débordés, pas pour les ingénieurs.
          </m.p>
        </m.div>

        <m.div
          className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
        >
          <LargeCard
            Icon={IconWallet}
            title="Paiement fractionné sans friction"
            desc="QR code sur table, zéro app. Trois modes de partage — par article, parts égales, montant libre — et un verrou de mode qui évite les mélanges entre convives. Apple Pay, Google Pay, CB."
            Visual={SmartSplitVisual}
            to="/fonctionnalites#paiement"
          />
          <m.div
            className="flex flex-col gap-5 md:gap-6"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          >
            <DarkSmallCard
              Icon={IconSparkles}
              title="IA embarquée"
              desc="Insights sur vos ventes, analyse automatique des feedbacks, suggestions d'action concrètes."
              to="/fonctionnalites#ia"
              secondaryLink={{ label: 'Estimer ma rentabilité →', to: '/rentabilite' }}
            />
            <SmallCard
              Icon={IconUsers}
              title="Équipe : planning, extras, chat"
              desc="Shifts, renforts convoqués par email, messagerie interne gérant ↔ salle en direct."
              to="/fonctionnalites#equipe"
            />
          </m.div>

          <m.div
            className="flex flex-col gap-5 md:gap-6"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          >
            <SmallCard
              Icon={IconBell}
              title="Feedback privé, avant Google"
              desc="Le client mécontent vous parle en privé au lieu de poster une étoile. Alerte immédiate si note basse."
            />
            <DarkSmallCard
              Icon={IconMenuBook}
              title="Menu en direct"
              desc="Rupture (86), changement de prix ou plat du jour : visibles sur le menu QR instantanément."
            />
          </m.div>
          <LargeCard
            Icon={IconChartBar}
            title="Pilotage temps réel"
            desc="CA du jour, plan de salle interactif, alertes manager — paiement bloqué, QR inactif, avis négatif. Tout le service en direct, où que vous soyez."
            Visual={SalleVisual}
            to="/fonctionnalites#pilotage"
          />
        </m.div>
      </div>
    </section>
  )
}
