import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, useFadeInView } from './shared'
import { IconQuote, IconStar } from './Icons'

const TESTIMONIALS = [
  {
    name: 'Camille Dorel',
    role: 'Gérante',
    restaurant: 'La Belle Époque',
    city: 'Lyon',
    initials: 'CD',
    color: '#E8920A',
    quote: "On a divisé par 3 le temps passé sur les additions le vendredi soir. Mes serveurs sont enfin disponibles pour les clients, pas pour la calculatrice.",
    stars: 5,
  },
  {
    name: 'Marc Pellegrini',
    role: 'Patron',
    restaurant: 'Chez Marcel',
    city: 'Bordeaux',
    initials: 'MP',
    color: '#3B82F6',
    quote: "Mes clients adorent — surtout les groupes. Plus de gêne au moment de l'addition, chacun paie sa part et tout le monde repart de bonne humeur.",
    stars: 5,
  },
  {
    name: 'Jeanne Achkar',
    role: 'Cheffe propriétaire',
    restaurant: 'Petit Bistrot',
    city: 'Marseille',
    initials: 'JA',
    color: '#059669',
    quote: "Installé en un après-midi. L'équipe Splitzy a configuré notre menu, on s'est concentrés sur le service. Aucun matériel à acheter, c'est rare.",
    stars: 5,
  },
]

type Testimonial = typeof TESTIMONIALS[number]

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <motion.figure
      variants={fadeInUp}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="relative bg-white border border-ink-100 rounded-2xl p-7 md:p-8 h-full flex flex-col hover:border-orange-200 hover:shadow-xl hover:shadow-orange-600/5 transition-all duration-300"
    >
      <span aria-hidden="true" className="absolute -top-3 left-7 text-orange-500/80">
        <IconQuote size={26} />
      </span>
      <div className="flex items-center gap-0.5 text-orange-500 mb-4">
        {Array.from({ length: t.stars }).map((_, i) => (
          <IconStar key={i} size={16} />
        ))}
      </div>
      <blockquote className="text-[15px] md:text-[16px] leading-[1.65] text-ink-700 flex-1">
        « {t.quote} »
      </blockquote>
      <figcaption className="mt-6 pt-6 border-t border-ink-100 flex items-center gap-3">
        <div
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white text-[14px] font-bold"
          style={{ background: t.color }}
        >
          {t.initials}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink-900 truncate">{t.name}</p>
          <p className="text-[12px] text-ink-500 truncate">
            {t.role} · {t.restaurant} · {t.city}
          </p>
        </div>
      </figcaption>
    </motion.figure>
  )
}

export function Testimonials() {
  const { ref, inView } = useFadeInView()
  const [index, setIndex] = useState(0)

  return (
    <section
      id="temoignages"
      className="relative py-16 md:py-24 bg-ink-50"
      aria-labelledby="testimonials-heading"
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
            Ils en parlent mieux que nous
          </motion.span>
          <motion.h2
            id="testimonials-heading"
            variants={fadeInUp}
            className="mt-5 text-[28px] md:text-[40px] font-bold text-ink-900 leading-[1.15] text-balance max-w-2xl mx-auto"
          >
            Nos restaurants adorent Splitzy.
          </motion.h2>
        </motion.div>

        {/* Desktop grid */}
        <motion.div
          className="hidden md:grid mt-14 grid-cols-3 gap-6 lg:gap-8"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
        >
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </motion.div>

        {/* Mobile carousel */}
        <div className="md:hidden mt-10">
          <div className="overflow-hidden">
            <motion.div
              className="flex"
              animate={{ x: `-${index * 100}%` }}
              transition={{ type: 'spring', stiffness: 240, damping: 30 }}
            >
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="shrink-0 w-full px-1">
                  <TestimonialCard t={t} />
                </div>
              ))}
            </motion.div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Témoignage ${i + 1}`}
                className={
                  'h-2 rounded-full transition-all duration-200 ' +
                  (i === index ? 'w-6 bg-orange-600' : 'w-2 bg-ink-300')
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
