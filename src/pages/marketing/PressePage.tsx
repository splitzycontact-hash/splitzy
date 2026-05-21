import { useRef, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { FileText, Users, Palette, Image, ArrowRight, Check } from 'lucide-react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useFadeInView, useCountUp } from './shared'

// ── Text reveal ──────────────────────────────────────────────────────────
function TextReveal({ children, className = '' }: { children: string; className?: string }) {
  const words = children.split(' ')
  return (
    <span className={className}>
      {words.map((word, i) => (
        <m.span
          key={i}
          style={{ display: 'inline-block' }}
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {word}{i < words.length - 1 ? ' ' : ''}
        </m.span>
      ))}
    </span>
  )
}

// ── Magnetic button ──────────────────────────────────────────────────────
function MagneticBtn({
  children, href, dark = false,
}: { children: React.ReactNode; href: string; dark?: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect()
    setPos({ x: (e.clientX - r.left - r.width / 2) * 0.28, y: (e.clientY - r.top - r.height / 2) * 0.28 })
  }
  return (
    <m.a
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 180, damping: 18, mass: 0.5 }}
      className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-semibold transition-colors"
      style={dark
        ? { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }
        : { background: '#E8920A', color: 'white' }}
    >
      {children}
    </m.a>
  )
}

// ── Toast ────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      onAnimationComplete={() => setTimeout(onDone, 3500)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-[14px] font-medium"
      style={{ background: '#18181B', color: 'white', maxWidth: 360 }}
    >
      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#E8920A' }}>
        <Check size={11} strokeWidth={3} />
      </span>
      {msg}
    </m.div>
  )
}

function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const show = (m: string) => setMsg(m)
  const dismiss = () => setMsg(null)
  return { msg, show, dismiss }
}

// ── Spring stat ──────────────────────────────────────────────────────────
function SpringStat({ label, value, suffix = '', prefix = '', sublabel }: {
  label: string; value: number; suffix?: string; prefix?: string; sublabel: string
}) {
  const { ref, inView } = useFadeInView()
  const counted = useCountUp(value, { duration: 2000, inView })
  return (
    <div ref={ref} className="p-8" style={{ background: '#18181B' }}>
      <div className="text-[11px] tracking-[0.14em] uppercase mb-3" style={{ color: '#52525B' }}>{label}</div>
      <div className="flex items-baseline gap-1" style={{ lineHeight: 1 }}>
        {prefix && <span className="text-[28px] font-black" style={{ color: '#E8920A', letterSpacing: '-0.04em' }}>{prefix}</span>}
        <span className="font-black tabular-nums" style={{ color: '#E8920A', fontSize: 'clamp(40px, 5vw, 60px)', letterSpacing: '-0.05em' }}>{counted}</span>
        {suffix && <span className="text-[22px] font-bold" style={{ color: '#E8920A' }}>{suffix}</span>}
      </div>
      <p className="mt-2 text-[13px]" style={{ color: '#52525B' }}>{sublabel}</p>
    </div>
  )
}

// ── Press kit card ────────────────────────────────────────────────────────
function KitCard({ Icon, title, desc, onDownload }: {
  Icon: React.ElementType; title: string; desc: string; onDownload: () => void
}) {
  return (
    <m.div
      whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl p-6 border flex flex-col gap-4"
      style={{ borderColor: '#E4E4E7' }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#FFF4E5' }}>
        <Icon size={20} style={{ color: '#E8920A' }} />
      </div>
      <div>
        <h3 className="text-[16px] font-bold mb-1" style={{ color: '#0A0A0A' }}>{title}</h3>
        <p className="text-[13px] leading-relaxed" style={{ color: '#71717A' }}>{desc}</p>
      </div>
      <button
        onClick={onDownload}
        className="mt-auto self-start inline-flex items-center gap-1.5 text-[13px] font-semibold px-4 py-2 rounded-lg border transition-colors hover:border-zinc-400"
        style={{ color: '#0A0A0A', borderColor: '#E4E4E7' }}
      >
        Télécharger <ArrowRight size={13} />
      </button>
    </m.div>
  )
}

const KIT_ITEMS = [
  { Icon: Image,    title: 'Logo Splitzy',       desc: 'SVG + PNG, fond blanc et fond sombre' },
  { Icon: FileText, title: 'One-pager produit',  desc: 'Présentation PDF 1 page — fonctionnement, chiffres, équipe' },
  { Icon: Users,    title: 'Photos équipe',       desc: 'Portraits haute résolution de Yann et Théo' },
  { Icon: Palette,  title: 'Charte graphique',   desc: 'Couleurs, typographie, règles usage du logo' },
]

// ── Main ─────────────────────────────────────────────────────────────────
export function PressePage() {
  const { msg, show, dismiss } = useToast()

  return (
    <div className="w-full min-h-screen" style={{ background: '#FAFAFA' }}>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-44 pb-28" style={{ background: '#FAFAFA' }}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 100%)' }} />
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.1), transparent 70%)' }} />
        <div className="relative max-w-[1100px] mx-auto px-6 text-center">
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-[0.1em]"
              style={{ background: '#FFF4E5', color: '#E8920A' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E8920A' }} />
              Presse
            </span>
          </div>
          <h1 className="text-balance" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0, fontSize: 'clamp(42px, 6.5vw, 72px)', color: '#0A0A0A' }}>
            <TextReveal>Splitzy dans les médias.</TextReveal>
          </h1>
          <p className="mt-7 max-w-[520px] mx-auto text-[17px] leading-relaxed" style={{ color: '#52525B' }}>
            Ressources, contacts et chiffres clés pour parler de Splitzy.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="mailto:presse@splitzy.fr"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-semibold text-white"
              style={{ background: '#E8920A' }}>
              presse@splitzy.fr <ArrowRight size={15} />
            </a>
            <a href="#kit-presse"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-semibold border transition-colors hover:border-zinc-400"
              style={{ color: '#0A0A0A', borderColor: '#E4E4E7' }}>
              Kit presse
            </a>
          </div>
        </div>
      </section>

      {/* ── CHIFFRES CLÉS (#18181B) ───────────────────────────────────────── */}
      <section style={{ background: '#18181B' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <SpringStat label="Restaurants en France" value={220} suffix="000" sublabel="établissements à équiper" />
            <SpringStat label="Marché QR à table EU" value={15} prefix="" suffix=" Md€" sublabel="valorisation du marché" />
            <SpringStat label="Croissance annuelle" value={15} prefix="+" suffix="%" sublabel="CAGR du marché" />
            <SpringStat label="Impact avis négatifs" value={3} suffix=" avis" sublabel="suffisent à perdre −0,4★" />
          </div>
        </div>
      </section>

      {/* ── À PROPOS (#FAFAFA) ────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-balance mb-8" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(28px, 4vw, 40px)', color: '#0A0A0A' }}>
              En deux phrases.
            </h2>
            <p className="text-[16px] leading-relaxed mb-6" style={{ color: '#52525B' }}>
              Splitzy est une solution française de paiement à table par QR code pour les restaurants, bars et cafés. Sa différence&nbsp;: avant qu&apos;un client mécontent ne poste un avis 1 étoile sur Google, Splitzy intercepte son insatisfaction via un feedback privé envoyé directement au gérant.
            </p>
            <p className="text-[16px] leading-relaxed" style={{ color: '#52525B' }}>
              Fondée en 2025, incubée au NEOMA Incubator, Splitzy cible les 220&nbsp;000 établissements de restauration en France.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-[13px]" style={{ color: '#71717A' }}>
              {['Fondée en 2025', 'Paris, France', 'NEOMA Incubator'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E8920A' }} />
                  {t}
                </span>
              ))}
            </div>
          </m.div>
        </div>
      </section>

      {/* ── KIT PRESSE (#FAFAFA suite) ────────────────────────────────────── */}
      <section id="kit-presse" className="pb-24 md:pb-32" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="border-t pt-16 mb-12" style={{ borderColor: '#E4E4E7' }}>
            <h2 className="text-balance" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(28px, 4vw, 40px)', color: '#0A0A0A' }}>
              Ressources
            </h2>
            <p className="mt-3 text-[15px]" style={{ color: '#71717A' }}>
              Tous les visuels et documents pour couvrir Splitzy.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {KIT_ITEMS.map((item) => (
              <KitCard
                key={item.title}
                Icon={item.Icon}
                title={item.title}
                desc={item.desc}
                onDownload={() => show("Disponible bientôt — contactez presse@splitzy.fr")}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT PRESSE (#18181B) ──────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#18181B' }}>
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <m.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <h2 className="text-white text-balance mb-5" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(28px, 4vw, 40px)' }}>
              Contact presse
            </h2>
            <p className="text-[15px] leading-relaxed mb-8" style={{ color: '#71717A' }}>
              Pour toute demande d&apos;interview, de visuels ou d&apos;informations, contactez notre équipe directement.
            </p>
            <a href="mailto:presse@splitzy.fr" className="text-[20px] font-bold block mb-2 hover:underline" style={{ color: '#E8920A' }}>
              presse@splitzy.fr
            </a>
            <p className="text-[13px] mb-10" style={{ color: '#52525B' }}>Réponse sous 24h ouvrées</p>
            <MagneticBtn href="/contact?sujet=Presse" dark>
              Envoyer un message <ArrowRight size={15} />
            </MagneticBtn>
          </m.div>
        </div>
      </section>

      <Footer />

      {/* Toast */}
      <AnimatePresence>
        {msg && <Toast msg={msg} onDone={dismiss} />}
      </AnimatePresence>
    </div>
  )
}
