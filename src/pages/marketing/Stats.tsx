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
  {
    value: 93,
    suffix: '%',
    label: 'consultent les avis',
    sublabel: "de vos futurs clients lisent Google avant de franchir votre porte",
    delay: 0,
  },
  {
    value: 59,
    suffix: '%',
    label: 'de clients perdus',
    sublabel: "dissuadés dès que 3 avis négatifs apparaissent en ligne",
    delay: 0.15,
  },
  {
    value: 9,
    prefix: '+',
    suffix: '%',
    label: 'de CA en plus',
    sublabel: "par étoile gagnée sur votre note Google — Harvard Business School",
    delay: 0.3,
  },
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
          93% de vos futurs clients lisent vos avis avant de venir.
          3 mauvais suffit à en faire fuir 59%. La bonne nouvelle :
          chaque étoile gagnée, c'est jusqu'à 9% de CA en plus.
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
