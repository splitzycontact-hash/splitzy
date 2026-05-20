import { motion } from 'framer-motion'
import { fadeInUp, useFadeInView } from './shared'

const RESTAURANT_LOGOS = [
  { name: 'La Belle Époque', serif: true,  letterSpacing: '0.04em' },
  { name: 'Chez Marcel',     serif: false, letterSpacing: '0.06em', uppercase: true },
  { name: "L'Ardoise",       serif: true,  italic: true },
  { name: 'Brasserie Lyon',  serif: false, letterSpacing: '0.18em', uppercase: true, weight: 500 },
  { name: 'Petit Bistrot',   serif: true,  italic: true },
  { name: 'Café des Halles', serif: false, letterSpacing: '0.05em' },
  { name: 'Le Comptoir',     serif: true,  letterSpacing: '0.02em' },
  { name: 'Maison Verte',    serif: false, letterSpacing: '0.16em', uppercase: true, weight: 500 },
]

function LogoWordmark({ logo }: { logo: typeof RESTAURANT_LOGOS[number] }) {
  const style: React.CSSProperties = {
    fontFamily: logo.serif
      ? "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
      : "'Geist', sans-serif",
    letterSpacing: logo.letterSpacing || '0',
    fontWeight: logo.weight || 600,
    fontStyle: logo.italic ? 'italic' : 'normal',
    textTransform: logo.uppercase ? 'uppercase' : 'none',
  }
  return (
    <span className="text-[20px] md:text-[22px] text-white whitespace-nowrap select-none" style={style}>
      {logo.name}
    </span>
  )
}

export function Logos() {
  const { ref, inView } = useFadeInView()

  return (
    <section
      className="relative py-14 md:py-20 bg-ink-900 border-t border-white/[0.06]"
      aria-labelledby="logos-heading"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <motion.p
          ref={ref}
          id="logos-heading"
          className="text-center text-[12px] md:text-[13px] font-medium uppercase tracking-[0.14em] text-white/40"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          custom={0}
        >
          Ils font confiance à Splitzy
        </motion.p>

        {/* Desktop: 6 logos grid */}
        <motion.div
          className="hidden md:grid mt-10 grid-cols-3 lg:grid-cols-6 gap-y-8 gap-x-8 lg:gap-x-10 items-center justify-items-center max-w-5xl mx-auto"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{
            hidden:  {},
            visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
          }}
        >
          {RESTAURANT_LOGOS.slice(0, 6).map((logo) => (
            <motion.div
              key={logo.name}
              variants={fadeInUp}
              className="opacity-40 hover:opacity-90 transition-opacity duration-300"
            >
              <LogoWordmark logo={logo} />
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile: infinite marquee */}
        <div className="md:hidden mt-8 marquee-mask overflow-hidden">
          <motion.div
            className="flex items-center gap-x-10 whitespace-nowrap"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
          >
            {[...RESTAURANT_LOGOS, ...RESTAURANT_LOGOS].map((logo, i) => (
              <div key={i} className="opacity-40">
                <LogoWordmark logo={logo} />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
