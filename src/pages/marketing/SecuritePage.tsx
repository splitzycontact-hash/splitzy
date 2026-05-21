import { useRef, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Lock, Server, EyeOff, Key, RefreshCw, Check, X, ChevronDown, ArrowRight } from 'lucide-react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

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
function MagneticBtn({ children, href, dark = false }: {
  children: React.ReactNode; href: string; dark?: boolean
}) {
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

// ── Accordion item ────────────────────────────────────────────────────────
function AccordionItem({ id, title, children, openId, onToggle }: {
  id: string; title: string; children: React.ReactNode; openId: string | null; onToggle: (id: string) => void
}) {
  const isOpen = openId === id
  return (
    <div className="border-b" style={{ borderColor: '#E4E4E7' }}>
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
        aria-expanded={isOpen}
      >
        <span className="text-[15px] font-semibold group-hover:text-orange-600 transition-colors" style={{ color: '#0A0A0A' }}>
          {title}
        </span>
        <m.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
          style={{ color: isOpen ? '#E8920A' : '#71717A' }}
        >
          <ChevronDown size={18} />
        </m.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-[14px] leading-relaxed" style={{ color: '#52525B' }}>
              {children}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Certification card ────────────────────────────────────────────────────
const CERTS = [
  {
    Icon: ShieldCheck,
    title: 'PCI DSS',
    desc: "Tous les paiements sont traités par Viva Wallet, certifié PCI DSS Level 1 — le plus haut niveau de sécurité pour les transactions par carte.",
  },
  {
    Icon: Lock,
    title: '3D Secure',
    desc: "Chaque paiement est protégé par l'authentification 3D Secure (3DS2). Les transactions non authentifiées sont automatiquement bloquées.",
  },
  {
    Icon: Server,
    title: 'Hébergement EU',
    desc: "Toutes les données sont stockées en Europe (Convex Cloud, infrastructure AWS eu-west). Jamais de transfert hors UE.",
  },
  {
    Icon: EyeOff,
    title: 'RGPD',
    desc: "Splitzy est conforme au Règlement Général sur la Protection des Données. Vous pouvez demander la suppression de vos données à tout moment.",
  },
  {
    Icon: Key,
    title: 'Chiffrement bout en bout',
    desc: "Toutes les communications entre votre téléphone, nos serveurs et Viva Wallet sont chiffrées via TLS 1.3.",
  },
  {
    Icon: RefreshCw,
    title: 'Sauvegardes quotidiennes',
    desc: "Vos données (feedbacks, transactions, paramètres) sont sauvegardées automatiquement chaque jour avec rétention 30 jours.",
  },
]

// ── Payment flow ──────────────────────────────────────────────────────────
const FLOW_STEPS = [
  { n: '①', label: 'Le client scanne le QR code', sub: 'Connexion HTTPS chiffrée' },
  { n: '②', label: 'Il entre ses coordonnées de carte', sub: "Jamais stockées sur nos serveurs" },
  { n: '③', label: 'Viva Wallet traite la transaction', sub: 'PCI DSS Level 1' },
  { n: '④', label: 'Le paiement est confirmé', sub: 'En moins de 3 secondes' },
  { n: '⑤', label: 'Les fonds arrivent sur votre IBAN', sub: 'Le lendemain ouvré' },
]

// ── Data items ─────────────────────────────────────────────────────────────
const COLLECTS = [
  "Prénom du client (saisi volontairement)",
  "Montant et détail de l'addition",
  "Méthode de paiement (type uniquement, jamais le numéro)",
  "Note et feedback (si l'utilisateur en donne un)",
  "Adresse IP (logs de sécurité, 30 jours max)",
]
const NOT_COLLECTS = [
  "Numéro de carte bancaire",
  "Historique de navigation",
  "Données de localisation",
  "Compte réseaux sociaux",
  "Données revendues à des tiers — jamais",
]

// ── RGPD rights ───────────────────────────────────────────────────────────
const RGPD_RIGHTS = [
  {
    id: 'acces',
    title: "Droit d'accès",
    body: "Vous pouvez demander à tout moment la liste complète des données que Splitzy détient sur vous. Envoyez votre demande à privacy@splitzy.fr — réponse sous 30 jours.",
  },
  {
    id: 'rectif',
    title: "Droit de rectification",
    body: "Si des données vous concernant sont inexactes, vous pouvez en demander la correction.",
  },
  {
    id: 'effacement',
    title: "Droit à l'effacement (droit à l'oubli)",
    body: "Vous pouvez demander la suppression de toutes vos données. Les données liées à des transactions sont conservées 5 ans pour des raisons légales (obligations comptables).",
  },
  {
    id: 'portabilite',
    title: "Droit à la portabilité",
    body: "Vous pouvez récupérer vos données dans un format lisible (JSON ou CSV) pour les transférer vers un autre service.",
  },
]

// ── Main ─────────────────────────────────────────────────────────────────
export function SecuritePage() {
  const [openId, setOpenId] = useState<string | null>(null)
  const toggle = (id: string) => setOpenId(openId === id ? null : id)

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
              Sécurité
            </span>
          </div>
          <h1 className="text-balance" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0, fontSize: 'clamp(38px, 6vw, 68px)', color: '#0A0A0A' }}>
            <TextReveal>Vos données et vos paiements sont protégés.</TextReveal>
          </h1>
          <p className="mt-7 max-w-[560px] mx-auto text-[17px] leading-relaxed" style={{ color: '#52525B' }}>
            Splitzy est construit sur des infrastructures certifiées et des pratiques de sécurité rigoureuses.
          </p>
          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-[13px]" style={{ color: '#71717A' }}>
            {['PCI DSS Level 1', '3D Secure', 'RGPD conforme', 'Hébergement EU'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <ShieldCheck size={13} style={{ color: '#E8920A' }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CERTIFICATIONS (#FAFAFA) ──────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#FAFAFA', borderTop: '1px solid #E4E4E7' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-balance" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(28px, 4vw, 44px)', color: '#0A0A0A' }}>
              Standards de sécurité
            </h2>
            <p className="mt-3 text-[15px] max-w-[480px] mx-auto" style={{ color: '#71717A' }}>
              Les certifications sur lesquelles repose chaque transaction Splitzy.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CERTS.map(({ Icon, title, desc }, i) => (
              <m.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.09 }}
                className="bg-white border rounded-2xl p-7 hover:-translate-y-1 transition-transform duration-200 hover:shadow-lg hover:shadow-orange-600/5"
                style={{ borderColor: '#E4E4E7' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: '#FFF4E5' }}>
                  <Icon size={24} style={{ color: '#E8920A' }} />
                </div>
                <h3 className="text-[17px] font-bold mb-2" style={{ color: '#0A0A0A' }}>{title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#71717A' }}>{desc}</p>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIEMENTS (#18181B) ───────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#18181B' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div>
              <h2 className="text-white text-balance mb-10" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(28px, 4vw, 44px)' }}>
                <TextReveal>Comment fonctionne un paiement Splitzy ?</TextReveal>
              </h2>
              <div className="space-y-6">
                {FLOW_STEPS.map((step, i) => (
                  <m.div
                    key={step.n}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.12 }}
                    className="flex items-start gap-4"
                  >
                    <span className="shrink-0 text-[22px] font-black" style={{ color: '#E8920A', lineHeight: 1.2 }}>{step.n}</span>
                    <div>
                      <p className="text-[15px] font-semibold text-white">{step.label}</p>
                      <p className="text-[13px] mt-0.5" style={{ color: '#52525B' }}>{step.sub}</p>
                    </div>
                  </m.div>
                ))}
              </div>
              {/* Orange encart */}
              <m.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.6 }}
                className="mt-10 px-5 py-4 rounded-xl"
                style={{ background: '#FFF4E5', borderLeft: '3px solid #E8920A' }}
              >
                <p className="text-[14px] font-semibold leading-relaxed" style={{ color: '#0A0A0A' }}>
                  Splitzy ne stocke jamais les numéros de carte de vos clients. Zéro donnée bancaire sur nos serveurs.
                </p>
              </m.div>
            </div>
            {/* Right: flow diagram */}
            <div className="flex flex-col items-center gap-0">
              {(['📱 Client', 'Splitzy', 'Viva Wallet', 'IBAN restaurant']).map((node, i, arr) => (
                <m.div key={node} className="flex flex-col items-center">
                  <m.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.2 }}
                    className="px-6 py-3.5 rounded-2xl border text-[14px] font-semibold text-white"
                    style={{
                      background: i === 0 || i === 3 ? 'rgba(255,255,255,0.06)' : 'rgba(232,146,10,0.15)',
                      borderColor: i === 0 || i === 3 ? 'rgba(255,255,255,0.1)' : 'rgba(232,146,10,0.4)',
                      minWidth: 180,
                      textAlign: 'center',
                    }}
                  >
                    {node}
                  </m.div>
                  {i < arr.length - 1 && (
                    <m.div
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: i * 0.2 + 0.2 }}
                      className="flex flex-col items-center origin-top"
                    >
                      <div className="w-px h-4" style={{ background: 'rgba(232,146,10,0.3)' }} />
                      <div style={{ color: '#E8920A' }}>↓</div>
                      <div className="w-px h-4" style={{ background: 'rgba(232,146,10,0.3)' }} />
                    </m.div>
                  )}
                </m.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── DONNÉES (#FAFAFA) ─────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-balance" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(28px, 4vw, 44px)', color: '#0A0A0A' }}>
              Données personnelles
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Ce que Splitzy collecte */}
            <div className="bg-white border rounded-2xl p-8" style={{ borderColor: '#E4E4E7' }}>
              <h3 className="text-[18px] font-bold mb-6" style={{ color: '#0A0A0A' }}>Ce que nous collectons</h3>
              <ul className="space-y-3.5">
                {COLLECTS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px]" style={{ color: '#52525B' }}>
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: '#FFF4E5' }}>
                      <Check size={11} style={{ color: '#E8920A' }} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Ce que Splitzy ne collecte pas */}
            <div className="bg-white border rounded-2xl p-8" style={{ borderColor: '#E4E4E7' }}>
              <h3 className="text-[18px] font-bold mb-6" style={{ color: '#0A0A0A' }}>Ce que nous ne collectons pas</h3>
              <ul className="space-y-3.5">
                {NOT_COLLECTS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px]" style={{ color: '#52525B' }}>
                    <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: '#FEF2F2' }}>
                      <X size={11} style={{ color: '#EF4444' }} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── DROITS RGPD (#FAFAFA suite) ──────────────────────────────────── */}
      <section className="pb-24 md:pb-32" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[720px] mx-auto px-6">
          <div className="border-t pt-16 mb-10" style={{ borderColor: '#E4E4E7' }}>
            <h2 className="text-balance mb-3" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(24px, 3.5vw, 36px)', color: '#0A0A0A' }}>
              Vos droits
            </h2>
            <p className="text-[15px]" style={{ color: '#71717A' }}>
              Conformément au RGPD, vous disposez des droits suivants.
            </p>
          </div>
          <div>
            {RGPD_RIGHTS.map((right) => (
              <AccordionItem
                key={right.id}
                id={right.id}
                title={right.title}
                openId={openId}
                onToggle={toggle}
              >
                {right.body}
              </AccordionItem>
            ))}
          </div>
          <p className="mt-8 text-[13px]" style={{ color: '#71717A' }}>
            Pour exercer vos droits&nbsp;: <a href="mailto:privacy@splitzy.fr" className="font-semibold hover:underline" style={{ color: '#E8920A' }}>privacy@splitzy.fr</a>
          </p>
        </div>
      </section>

      {/* ── CONTACT SÉCURITÉ (#18181B) ────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#18181B' }}>
        <div className="max-w-[680px] mx-auto px-6 text-center">
          <m.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <h2 className="text-white text-balance mb-5" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(28px, 4vw, 40px)' }}>
              Une question sur la sécurité ?
            </h2>
            <p className="text-[15px] mb-8" style={{ color: '#71717A' }}>
              Pour tout signalement de vulnérabilité ou question sur la protection des données&nbsp;:
            </p>
            <a href="mailto:security@splitzy.fr" className="text-[20px] font-bold block mb-2 hover:underline" style={{ color: '#E8920A' }}>
              security@splitzy.fr
            </a>
            <p className="text-[13px] mb-10" style={{ color: '#52525B' }}>
              Nous traitons tous les signalements sous 48h.
            </p>
            <MagneticBtn href="/contact?sujet=Securite" dark>
              Contacter l&apos;équipe sécurité <ArrowRight size={15} />
            </MagneticBtn>
          </m.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
