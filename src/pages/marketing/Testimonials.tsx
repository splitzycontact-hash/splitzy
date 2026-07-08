import { useRef, useState } from 'react'
import { m, useMotionValue, useSpring } from 'framer-motion'
import { fadeInUp, useFadeInView } from './shared'

function TextReveal({ children }: { children: string }) {
  const words = children.split(' ')
  return (
    <span>
      {words.map((word, i) => (
        <span key={i}>
          <m.span
            style={{ display: 'inline-block' }}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {word}
          </m.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

const TESTIMONIALS = [
  {
    quote: "Splitzy m'a permis de récupérer un client mécontent avant qu'il ne laisse un avis 1 étoile. En deux messages, le problème était réglé. C'est la première fois qu'un outil fait vraiment ça.",
    name: 'Marie D.',
    restaurant: 'Le Petit Zinc — Paris 6e',
    initials: 'MD',
    bgColor: '#FFF4E5',
    textColor: '#E8920A',
    stars: 5,
  },
  {
    quote: "On a passé notre note Google de 4,1 à 4,4 en deux mois. Les feedbacks négatifs qu'on recevait avant partaient directement sur Google. Maintenant ils viennent chez nous et on peut réagir.",
    name: 'Thomas R.',
    restaurant: 'Brasserie du Marché — Paris 11e',
    initials: 'TR',
    bgColor: '#18181B',
    textColor: '#FFFFFF',
    stars: 5,
  },
  {
    quote: "Le setup a pris 10 minutes. Dès le premier soir, on a reçu trois feedbacks. Dont un insatisfait qu'on a pu rappeler le lendemain. Il est revenu la semaine d'après.",
    name: 'Sophie C.',
    restaurant: "L'Ardoise — Paris 9e",
    initials: 'SC',
    bgColor: '#FFF4E5',
    textColor: '#E8920A',
    stars: 5,
  },
]

type Testimonial = typeof TESTIMONIALS[number]

function TestimonialCard({ t }: { t: Testimonial }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateY = useSpring(mx, { stiffness: 300, damping: 30 })
  const rotateX = useSpring(my, { stiffness: 300, damping: 30 })

  function onMouseMove(e: React.MouseEvent) {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 10)
    my.set(-((e.clientY - rect.top) / rect.height - 0.5) * 10)
  }

  function onMouseLeave() {
    mx.set(0)
    my.set(0)
  }

  return (
    <m.div
      variants={fadeInUp}
      style={{ perspective: '1000px' }}
      className="h-full"
    >
      <m.div
        ref={cardRef}
        style={{ rotateX, rotateY }}
        initial={{ borderColor: '#E4E4E7' }}
        whileHover={{ borderColor: '#E8920A', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', transition: { duration: 0.2 } }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="bg-white rounded-[12px] p-7 border flex flex-col h-full cursor-default"
      >
        {/* Stars */}
        <div className="flex items-center gap-0.5 mb-5">
          {Array.from({ length: t.stars }).map((_, i) => (
            <span key={i} className="text-[18px]" style={{ color: '#E8920A' }}>★</span>
          ))}
        </div>

        {/* Quote */}
        <p className="text-[15px] leading-[1.7] flex-1" style={{ color: '#0A0A0A', fontStyle: 'italic' }}>
          "{t.quote}"
        </p>

        {/* Separator */}
        <div className="my-5 border-t" style={{ borderColor: '#E4E4E7' }} />

        {/* Author */}
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold"
            style={{ background: t.bgColor, color: t.textColor }}
          >
            {t.initials}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold truncate" style={{ color: '#0A0A0A' }}>
              {t.name}
            </p>
            <p className="text-[13px] truncate" style={{ color: '#52525B' }}>
              {t.restaurant}
            </p>
          </div>
        </div>
      </m.div>
    </m.div>
  )
}

export function Testimonials() {
  const { ref, inView } = useFadeInView()
  const [index, setIndex] = useState(0)

  return (
    <section id="temoignages" className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-14 md:mb-16">
          <m.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block text-[11px] font-bold uppercase tracking-[0.12em] mb-5"
            style={{ color: '#E8920A' }}
          >
            Ils en parlent
          </m.span>

          <h2
            className="text-balance"
            style={{ fontWeight: 900, fontSize: 'clamp(28px, 4.5vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.03em', color: '#0A0A0A' }}
          >
            <TextReveal>{"Ils ont protégé"}</TextReveal>
            <br />
            <TextReveal>{"leur note Google."}</TextReveal>
          </h2>

          <m.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="mt-5 text-[16px] leading-[1.6] max-w-[480px] mx-auto"
            style={{ color: '#52525B' }}
          >
            Des restaurants parisiens qui utilisent Splitzy au quotidien.
          </m.p>
        </div>

        {/* Desktop grid */}
        <m.div
          className="hidden md:grid grid-cols-3 gap-6 lg:gap-8"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } }}
        >
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </m.div>

        {/* Mobile carousel */}
        <div className="md:hidden">
          <div className="overflow-hidden">
            <m.div
              className="flex"
              animate={{ x: `-${index * 100}%` }}
              transition={{ type: 'spring', stiffness: 240, damping: 30 }}
            >
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="shrink-0 w-full px-1">
                  <TestimonialCard t={t} />
                </div>
              ))}
            </m.div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Témoignage ${i + 1}`}
                className="h-2 rounded-full transition-all duration-200"
                style={{ width: i === index ? 24 : 8, background: i === index ? '#E8920A' : '#D4D4D4' }}
              />
            ))}
          </div>
        </div>

        {/* Trust line */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="mt-12 text-center"
          style={{ color: '#52525B', fontSize: 14 }}
        >
          Rejoignez +47 établissements parisiens qui protègent leur réputation.{' '}
          <a
            href="/contact"
            className="underline underline-offset-4 font-medium hover:opacity-80 transition-opacity"
            style={{ color: '#E8920A' }}
          >
            Demander une démo →
          </a>
        </m.div>
      </div>
    </section>
  )
}
