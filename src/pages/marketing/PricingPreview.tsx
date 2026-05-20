import { motion } from 'framer-motion'
import { fadeInUp, useFadeInView } from './shared'
import { IconCheck, IconArrowRight, IconSparkles } from './Icons'

const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    description: 'Pour démarrer sans engagement.',
    price: '0',
    period: '/ mois',
    features: [
      "Jusqu'à 50 règlements / mois",
      'QR codes illimités',
      'Apple Pay & Google Pay',
      'Support par email',
    ],
    cta: 'Commencer',
    href: '/restaurant/onboarding',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Pour les restaurants qui tournent.',
    price: '49',
    period: '/ mois HT',
    features: [
      'Règlements illimités',
      'Dashboard temps réel & exports',
      'Multi-utilisateurs (équipe)',
      'Notifications instantanées',
      'Support prioritaire 7j/7',
    ],
    cta: 'Essai 14 jours',
    href: '/restaurant/onboarding?plan=pro',
    popular: true,
  },
]

type Plan = typeof PLANS[number]

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={
        'relative rounded-2xl p-7 md:p-8 flex flex-col h-full transition-all duration-300 ' +
        (plan.popular
          ? 'bg-white border-2 border-orange-600 shadow-2xl shadow-orange-600/15'
          : 'bg-white border border-ink-100 hover:border-ink-200 hover:shadow-lg')
      }
    >
      {plan.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-600 text-white text-[11px] font-semibold uppercase tracking-wider shadow-md shadow-orange-600/30">
          <IconSparkles size={11} stroke={2.4} />
          Le plus populaire
        </span>
      )}

      <header>
        <h3 className="text-[20px] font-semibold text-ink-900">{plan.name}</h3>
        <p className="mt-1.5 text-[14px] text-ink-500">{plan.description}</p>
      </header>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-[44px] md:text-[52px] font-bold text-ink-900 leading-none tabular-nums">
          {plan.price}€
        </span>
        <span className="text-[14px] text-ink-500">{plan.period}</span>
      </div>

      <ul className="mt-6 space-y-3 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span className={
              'shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full mt-0.5 ' +
              (plan.popular ? 'bg-orange-100 text-orange-700' : 'bg-ink-100 text-ink-600')
            }>
              <IconCheck size={12} stroke={2.6} />
            </span>
            <span className="text-[14px] leading-[1.55] text-ink-700">{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={plan.href}
        className={
          'mt-8 inline-flex items-center justify-center gap-1.5 w-full px-6 py-3.5 rounded-xl font-medium text-[15px] transition-all duration-200 ' +
          (plan.popular
            ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/30 hover:shadow-xl hover:shadow-orange-600/40 hover:-translate-y-0.5'
            : 'bg-ink-900 text-white hover:bg-ink-800 hover:-translate-y-0.5')
        }
      >
        {plan.cta}
        <IconArrowRight size={15} />
      </a>
    </motion.div>
  )
}

export function PricingPreview() {
  const { ref, inView } = useFadeInView()

  return (
    <section
      id="tarifs"
      className="relative py-16 md:py-24 bg-white"
      aria-labelledby="pricing-heading"
    >
      <div ref={ref} className="max-w-6xl mx-auto px-4 md:px-6">
        <motion.div
          className="text-center"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          <motion.span
            variants={fadeInUp}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[11px] font-semibold uppercase tracking-[0.08em]"
          >
            Tarifs
          </motion.span>
          <motion.h2
            id="pricing-heading"
            variants={fadeInUp}
            className="mt-5 text-[28px] md:text-[40px] font-bold text-ink-900 leading-[1.15] text-balance"
          >
            Un tarif simple et transparent.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-4 text-[16px] md:text-[18px] text-ink-500 max-w-xl mx-auto leading-[1.6]"
          >
            Commencez gratuitement, évoluez quand vous êtes prêts.
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
        >
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </motion.div>

        <p className="mt-10 text-center text-[14px] text-ink-500">
          Besoin de plus ?{' '}
          <a href="/pricing" className="text-orange-600 font-medium hover:text-orange-700">
            Voir tous les détails →
          </a>
        </p>
      </div>
    </section>
  )
}
