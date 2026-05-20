import { m } from 'framer-motion'
import { useFadeInView } from './shared'
import { IconArrowRight, IconCheck } from './Icons'

export function CtaFinal() {
  const { ref, inView } = useFadeInView()

  return (
    <section
      id="cta-final"
      className="relative py-20 md:py-28 overflow-hidden"
      aria-labelledby="cta-heading"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #E8920A 0%, #B8730A 100%)' }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] rounded-full opacity-50 mix-blend-overlay"
          style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.5), transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-30 mix-blend-overlay"
          style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,0.5), transparent 70%)' }}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 80%)',
        }}
      />

      <div ref={ref} className="relative max-w-3xl mx-auto px-4 md:px-6 text-center">
        <m.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={inView ? { opacity: 1, scale: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } } : {}}
        >
          <h2
            id="cta-heading"
            className="text-[32px] md:text-[48px] font-bold text-white leading-[1.1] text-balance"
          >
            Prêt à simplifier vos additions ?
          </h2>
          <p className="mt-5 text-[16px] md:text-[19px] text-white/85 max-w-xl mx-auto leading-[1.55]">
            Rejoignez 240+ restaurants qui utilisent Splitzy chaque jour. Configuré en 5 minutes, gratuit pour commencer.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <a
                href="/restaurant/onboarding"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 bg-white text-orange-700 font-semibold text-[15px] px-7 py-3.5 rounded-xl shadow-lg shadow-black/15 hover:shadow-xl hover:shadow-black/20 transition-all"
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  Commencer gratuitement
                  <IconArrowRight size={16} />
                </span>
              </a>
            </m.div>
            <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <a
                href="/demo"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-medium text-[15px] px-7 py-3.5 rounded-xl hover:bg-white/15 hover:border-white/40 transition-colors"
              >
                <span className="whitespace-nowrap">Parler à un expert</span>
              </a>
            </m.div>
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/70">
            {['Aucune carte requise', 'Désactivable à tout moment', 'Support en français'].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <IconCheck size={14} stroke={2.4} />
                {t}
              </li>
            ))}
          </ul>
        </m.div>
      </div>
    </section>
  )
}
