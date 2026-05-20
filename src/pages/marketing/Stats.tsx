import { motion } from 'framer-motion'
import { fadeInUp, useFadeInView, useCountUp } from './shared'

function StatMetric({
  value, decimals = 0, prefix = '', suffix, label, inView, accent = false,
}: {
  value: number; decimals?: number; prefix?: string; suffix?: string
  label: string; inView: boolean; accent?: boolean
}) {
  const display = useCountUp(value, { inView, decimals })
  return (
    <div className="text-center md:text-left">
      <div className="flex items-baseline gap-1 justify-center md:justify-start">
        <span className={
          'text-[44px] md:text-[64px] font-bold leading-none tabular-nums ' +
          (accent ? 'text-orange-500' : 'text-white')
        }>
          {prefix}{display}
        </span>
        {suffix && (
          <span className={
            'text-[20px] md:text-[28px] font-semibold leading-none ' +
            (accent ? 'text-orange-500/80' : 'text-white/70')
          }>
            {suffix}
          </span>
        )}
      </div>
      <p className="mt-3 text-[13px] md:text-[14px] text-white/55 uppercase tracking-[0.08em] font-medium">
        {label}
      </p>
    </div>
  )
}

export function Stats() {
  const { ref, inView } = useFadeInView()

  return (
    <section
      id="chiffres"
      className="relative py-16 md:py-24 bg-ink-900 overflow-hidden"
      aria-labelledby="stats-heading"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-30"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.3), transparent 70%)' }}
        />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hero-grid opacity-50" />

      <div ref={ref} className="relative max-w-6xl mx-auto px-4 md:px-6">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          <motion.span
            variants={fadeInUp}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/70 text-[11px] font-semibold uppercase tracking-[0.08em]"
          >
            Les chiffres
          </motion.span>
          <motion.h2
            id="stats-heading"
            variants={fadeInUp}
            className="mt-5 text-[28px] md:text-[40px] font-bold text-white leading-[1.15] text-balance max-w-2xl mx-auto"
          >
            Le partage d'addition,{' '}
            <span className="text-orange-500">à l'échelle.</span>
          </motion.h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6 md:gap-x-8 md:divide-x divide-white/10 max-w-5xl mx-auto">
          <div className="md:px-4">
            <StatMetric value={240} suffix="+" label="Restaurants équipés" inView={inView} accent />
          </div>
          <div className="md:px-4">
            <StatMetric value={1.2} decimals={1} suffix=" M€" label="Encaissés en 2025" inView={inView} />
          </div>
          <div className="md:px-4">
            <StatMetric value={28} suffix=" sec" label="Temps moyen de règlement" inView={inView} />
          </div>
          <div className="md:px-4">
            <StatMetric value={96} suffix=" %" label="Satisfaction client" inView={inView} />
          </div>
        </div>
      </div>
    </section>
  )
}
