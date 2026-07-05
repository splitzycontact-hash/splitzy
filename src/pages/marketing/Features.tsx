import { m } from 'framer-motion'
import { fadeInUp, useFadeInView } from './shared'
import { IconWallet, IconQr, IconChartBar, IconCloud, IconBell, IconBolt, IconShield } from './Icons'

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

function SmallCard({ Icon, title, desc }: {
  Icon: React.ComponentType<{ size?: number; stroke?: number }>
  title: string
  desc: string
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
    </FeatureCard>
  )
}

function DarkSmallCard({ Icon, title, desc }: {
  Icon: React.ComponentType<{ size?: number; stroke?: number }>
  title: string; desc: string
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

function PaymentVisual() {
  return (
    <div className="relative h-full min-h-[260px] flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/60 via-white to-white" />
      <div className="relative w-full p-6 md:p-7 flex flex-col items-center">
        <div className="text-center mb-6">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-400 mb-1">À régler</p>
          <p className="text-[36px] md:text-[42px] font-bold text-ink-900 tabular-nums leading-none">
            24,00&nbsp;<span className="text-orange-600">€</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 w-full max-w-[280px]">
          <div className="bg-ink-900 rounded-xl py-3 px-3 flex items-center justify-center text-white text-[13px] font-semibold gap-1.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.5 8.5c0-1 .7-1.8 1.6-2.3-.5-.8-1.4-1.3-2.5-1.3-1 0-1.8.6-2.4.6-.6 0-1.4-.6-2.3-.6C4.3 4.9 3 6.3 3 8.7c0 1.4.5 2.9 1.2 3.8.4.4.8 1 1.4 1 .5 0 .8-.4 1.5-.4.8 0 1 .4 1.6.4.6 0 1-.5 1.5-1 .5-.6.7-1.1.7-1.2-.5-.2-1.4-.8-1.4-1.8zM10 4.3c.4-.5.7-1.1.6-1.8-.6 0-1.3.4-1.7.9-.4.4-.7 1-.6 1.7.7 0 1.4-.4 1.7-.8z" />
            </svg>
            Pay
          </div>
          <div className="bg-white border border-ink-200 rounded-xl py-3 px-3 flex items-center justify-center text-ink-900 text-[13px] font-semibold gap-1.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="5"  cy="8" r="4" fill="#EB001B" />
              <circle cx="11" cy="8" r="4" fill="#F79E1B" />
              <path d="M8 5.2a4 4 0 0 0 0 5.6 4 4 0 0 0 0-5.6z" fill="#FF5F00" />
            </svg>
            CB
          </div>
          <div className="bg-white border border-ink-200 rounded-xl py-3 px-3 flex items-center justify-center text-ink-900 text-[13px] font-semibold gap-1.5 col-span-2">
            <svg width="50" height="14" viewBox="0 0 50 14" aria-hidden="true">
              <text x="0"  y="11" fontFamily="Geist, sans-serif" fontSize="10" fontWeight="700" fill="#4285F4">G</text>
              <text x="7"  y="11" fontFamily="Geist, sans-serif" fontSize="10" fontWeight="700" fill="#DB4437">o</text>
              <text x="14" y="11" fontFamily="Geist, sans-serif" fontSize="10" fontWeight="700" fill="#F4B400">o</text>
              <text x="21" y="11" fontFamily="Geist, sans-serif" fontSize="10" fontWeight="700" fill="#4285F4">g</text>
              <text x="27" y="11" fontFamily="Geist, sans-serif" fontSize="10" fontWeight="700" fill="#0F9D58">l</text>
              <text x="31" y="11" fontFamily="Geist, sans-serif" fontSize="10" fontWeight="700" fill="#DB4437">e</text>
              <text x="40" y="11" fontFamily="Geist, sans-serif" fontSize="10" fontWeight="600" fill="#5F6368">Pay</text>
            </svg>
          </div>
        </div>
        <p className="mt-5 text-[11px] text-ink-400 inline-flex items-center gap-1.5">
          <IconShield size={12} stroke={2} />
          Paiement sécurisé · 3DS
        </p>
      </div>
    </div>
  )
}

function LargeCard({ Icon, title, desc, Visual }: {
  Icon: React.ComponentType<{ size?: number; stroke?: number }>
  title: string
  desc: string
  Visual: React.ComponentType
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
            Tout ce dont votre restaurant a besoin.
          </m.h2>
          <m.p
            variants={fadeInUp}
            className="mt-4 text-[16px] md:text-[18px] text-ink-500 max-w-xl mx-auto leading-[1.6]"
          >
            Pensé pour les gérants débordés, pas pour les ingénieurs.
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
            title="Partage intelligent de l'addition"
            desc="Chaque convive sélectionne ses plats. Splitzy calcule automatiquement les montants individuels, TVA incluse."
            Visual={SmartSplitVisual}
          />
          <m.div
            className="flex flex-col gap-5 md:gap-6"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          >
            <DarkSmallCard Icon={IconQr} title="QR codes par table" desc="Générez autant de QR codes que de tables. Réutilisables, modifiables à tout moment." />
            <SmallCard Icon={IconChartBar} title="Dashboard en temps réel" desc="Suivez chaque transaction live. Export comptable en un clic." />
          </m.div>

          <m.div
            className="flex flex-col gap-5 md:gap-6"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
          >
            <SmallCard Icon={IconCloud} title="Sans application à télécharger" desc="100 % web. Vos clients scannent et c'est tout." />
            <DarkSmallCard Icon={IconBell} title="Notifications instantanées" desc="Soyez alerté dès qu'une table a fini de régler." />
          </m.div>
          <LargeCard
            Icon={IconBolt}
            title="Paiements sans friction"
            desc="Apple Pay, Google Pay, carte bancaire. Vos clients paient en moins de 30 secondes depuis leur téléphone."
            Visual={PaymentVisual}
          />
        </m.div>
      </div>
    </section>
  )
}
