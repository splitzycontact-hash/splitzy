import { m } from 'framer-motion'

const RESTAURANTS = [
  'Le Bouillon Chartier', 'Café de Flore', 'La Coupole',
  'Brasserie Lipp', 'Le Comptoir', 'Chez Janou',
  'Le Grand Véfour', 'Septime', 'Frenchie',
  'Le Baratin', 'Au Passage', 'Clown Bar',
]

function Pill({ name }: { name: string }) {
  return (
    <span className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 mx-3 rounded-full bg-white border border-ink-100 text-[14px] font-medium text-ink-700 shadow-sm whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
      {name}
    </span>
  )
}

export function LogoMarquee() {
  return (
    <section className="relative py-14 md:py-20 section-cream overflow-hidden border-y border-ink-100/60">
      <m.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-400 mb-8"
      >
        Ils font confiance à Splitzy
      </m.p>

      {/* Row 1 */}
      <div className="relative flex overflow-hidden">
        <div className="flex animate-marquee">
          {[...RESTAURANTS, ...RESTAURANTS].map((r, i) => <Pill key={i} name={r} />)}
        </div>
      </div>

      {/* Row 2 — inverse, décalée */}
      <div className="relative flex overflow-hidden mt-4">
        <div className="flex" style={{ animation: 'marquee-left 38s linear infinite reverse' }}>
          {[...RESTAURANTS.slice(6), ...RESTAURANTS.slice(0, 6), ...RESTAURANTS.slice(6), ...RESTAURANTS.slice(0, 6)].map((r, i) => (
            <Pill key={i} name={r} />
          ))}
        </div>
      </div>

      {/* Fade edges */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--cream)] to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--cream)] to-transparent" />
    </section>
  )
}
