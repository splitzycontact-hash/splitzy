import { m } from 'framer-motion'
import { fadeInUp, useFadeInView } from './shared'
import { IconCheck } from './Icons'

interface Plan {
  id: string
  name: string
  price: string
  period: string
  desc: string
  features: string[]
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
  ctaStyle: 'ghost' | 'filled' | 'dark'
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'GRATUIT',
    price: '0€',
    period: '/mois',
    desc: 'Pour tester sans risque',
    features: [
      "Jusqu'à 3 tables",
      'Paiement fractionné par QR code',
      '10 feedbacks / mois',
      'Dashboard basique (vue d\'ensemble)',
      'Support par email',
    ],
    cta: 'Commencer →',
    href: '/restaurant/onboarding',
    ctaStyle: 'ghost',
  },
  {
    id: 'essentiel',
    name: 'ESSENTIEL',
    price: '59€',
    period: '/mois HT',
    desc: 'Pour piloter votre service au quotidien',
    features: [
      'Tables et feedbacks illimités',
      'Paiement fractionné — 3 modes + verrou',
      'Plan de salle interactif en temps réel',
      'Planning équipe, extras & chat interne',
      'Clôture de service & répartition des pourboires',
      'Analytics avancés & alertes manager',
      'Emails clients capturés à chaque paiement',
      'Frais bancaires inclus',
    ],
    cta: 'Réserver une démo →',
    href: '/contact',
    highlighted: true,
    badge: 'LE PLUS POPULAIRE',
    ctaStyle: 'filled',
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '99€',
    period: '/mois HT',
    desc: 'Pour les établissements ambitieux',
    features: [
      'Tout le plan Essentiel',
      'Insights IA — ventes, feedbacks, suggestions d\'action',
      'Intégrations POS (Square, Lightspeed, Tiller…)',
      'CRM Clients — email, téléphone, historique des visites',
      'Multi-établissements (à venir)',
      'Support prioritaire (réponse < 4h)',
    ],
    cta: 'Nous contacter →',
    href: '/contact?sujet=Pro',
    ctaStyle: 'dark',
  },
]

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <m.div
      variants={fadeInUp}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative bg-white rounded-2xl flex flex-col"
      style={{
        border: plan.highlighted ? '2px solid #E8920A' : '1px solid #E4E4E7',
        boxShadow: plan.highlighted ? '0 16px 48px rgba(232,146,10,0.12)' : undefined,
        padding: plan.highlighted ? '40px 28px 28px' : '28px',
      }}
    >
      {/* Badge */}
      {plan.badge && (
        <div
          className="absolute -top-[14px] left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-white text-[11px] font-bold uppercase tracking-[0.08em] whitespace-nowrap"
          style={{ background: '#E8920A' }}
        >
          {plan.badge}
        </div>
      )}

      {/* Plan name */}
      <div className="text-[12px] font-bold uppercase tracking-[0.08em] mb-3" style={{ color: '#52525B' }}>
        {plan.name}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1.5 mb-1">
        <span
          className="font-black leading-none tabular-nums"
          style={{ fontSize: 40, color: '#0A0A0A', letterSpacing: '-0.03em' }}
        >
          {plan.price}
        </span>
        <span className="text-[14px]" style={{ color: '#52525B' }}>{plan.period}</span>
      </div>
      <p className="text-[14px] mb-5" style={{ color: '#52525B' }}>{plan.desc}</p>

      {/* Divider */}
      <div className="border-t mb-5" style={{ borderColor: '#E4E4E7' }} />

      {/* Features */}
      <ul className="space-y-3 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span
              className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full mt-0.5"
              style={{ background: '#F0FDF4', color: '#22C55E' }}
            >
              <IconCheck size={10} stroke={2.8} />
            </span>
            <span className="text-[14px] leading-snug" style={{ color: '#0A0A0A' }}>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href={plan.href}
        className="mt-7 inline-flex items-center justify-center w-full px-5 py-3.5 rounded-xl text-[15px] font-semibold transition-opacity hover:opacity-85"
        style={
          plan.ctaStyle === 'filled'
            ? { background: '#E8920A', color: '#FFFFFF' }
            : plan.ctaStyle === 'dark'
            ? { background: 'transparent', border: '1px solid #0A0A0A', color: '#0A0A0A' }
            : { background: 'transparent', border: '1px solid #E4E4E7', color: '#0A0A0A' }
        }
      >
        {plan.cta}
      </a>
    </m.div>
  )
}

export function PricingPreview() {
  const { ref, inView } = useFadeInView()

  return (
    <section id="tarifs" className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <m.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block text-[11px] font-bold uppercase tracking-[0.12em] mb-5"
            style={{ color: '#E8920A' }}
          >
            Tarifs
          </m.span>

          <m.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="text-balance font-display"
            style={{ fontWeight: 900, fontSize: 'clamp(28px, 4.5vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.03em', color: '#0A0A0A' }}
          >
            Simple. Transparent.
            <br />
            Sans surprise.
          </m.h2>

          <m.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="mt-5 text-[16px] leading-[1.6] max-w-[440px] mx-auto"
            style={{ color: '#52525B' }}
          >
            Aucune commission prélevée sur vos clients. Jamais.
          </m.p>
        </div>

        {/* Cards */}
        <m.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 items-center max-w-[920px] mx-auto"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }}
        >
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </m.div>

        {/* Details link */}
        <m.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 text-center text-[14px]"
          style={{ color: '#52525B' }}
        >
          <a
            href="/fonctionnalites"
            className="underline underline-offset-4 font-medium hover:opacity-80 transition-opacity"
            style={{ color: '#E8920A' }}
          >
            Comparer toutes les fonctionnalités →
          </a>
        </m.p>
      </div>
    </section>
  )
}
