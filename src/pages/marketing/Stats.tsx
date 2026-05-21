import { m } from 'framer-motion'
import { useFadeInView, useCountUp } from './shared'

function TextReveal({ children }: { children: string }) {
  return (
    <span>
      {children.split(' ').map((word, i) => (
        <m.span
          key={i}
          style={{ display: 'inline-block' }}
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {word}{i < children.split(' ').length - 1 ? ' ' : ''}
        </m.span>
      ))}
    </span>
  )
}

function StatBlock({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  label,
  sublabel,
  inView,
  delay = 0,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  label: string
  sublabel: string
  inView: boolean
  delay?: number
}) {
  const counted = useCountUp(value, { inView, decimals })
  return (
    <m.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="py-10 md:py-14 text-center px-6 md:px-10"
    >
      <div
        className="font-black tabular-nums leading-none"
        style={{ fontSize: 'clamp(52px, 6.5vw, 72px)', color: '#E8920A', letterSpacing: '-0.04em' }}
      >
        {prefix}{counted}{suffix}
      </div>
      <p className="mt-4 text-[15px] font-semibold" style={{ color: '#0A0A0A' }}>
        {label}
      </p>
      <p className="mt-1.5 text-[13px] leading-[1.5]" style={{ color: '#52525B' }}>
        {sublabel}
      </p>
    </m.div>
  )
}

interface StatData {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  label: string
  sublabel: string
  delay: number
}

const STATS: StatData[] = [
  { value: 3, label: 'avis négatifs', sublabel: 'suffisent à détruire une réputation', delay: 0 },
  { value: 0.4, decimals: 1, prefix: '−', suffix: ' ★', label: 'de note en moyenne', sublabel: 'avec seulement 3 mauvais avis', delay: 0.15 },
  { value: 30, prefix: '−', suffix: '%', label: 'de réservations perdues', sublabel: "après une baisse de 0,4 point", delay: 0.3 },
]

export function Stats() {
  const { ref, inView } = useFadeInView()

  return (
    <section id="probleme" className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div className="max-w-[680px] mx-auto px-6 text-center">
        <m.span
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="inline-block text-[11px] font-bold uppercase tracking-[0.12em] mb-6"
          style={{ color: '#E8920A' }}
        >
          Le problème
        </m.span>

        <h2
          className="text-balance"
          style={{ fontWeight: 900, fontSize: 'clamp(30px, 5vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.03em', color: '#0A0A0A' }}
        >
          <TextReveal>{'3 avis négatifs.'}</TextReveal>
          <br />
          <TextReveal>{"C'est tout ce qu'il faut."}</TextReveal>
        </h2>

        <m.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.35 }}
          className="mt-6 text-[16px] leading-[1.65] max-w-[480px] mx-auto"
          style={{ color: '#52525B' }}
        >
          4,2 → 3,8 étoiles. Une baisse invisible qui coûte 30% de réservations en moins chaque mois.
        </m.p>
      </div>

      {/* Stats grid */}
      <div ref={ref} className="max-w-[900px] mx-auto mt-12 md:mt-16">
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ borderTop: '1px solid #E4E4E7', borderBottom: '1px solid #E4E4E7' }}
        >
          {STATS.map((s, i) => (
            <div
              key={i}
              className={i < STATS.length - 1 ? 'border-b md:border-b-0 md:border-r' : ''}
              style={{ borderColor: '#E4E4E7' }}
            >
              <StatBlock {...s} inView={inView} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
