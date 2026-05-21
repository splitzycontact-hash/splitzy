import { useRef, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { CreditCard, User, QrCode, ChevronDown, Search, Mail, MessageCircle, ArrowRight } from 'lucide-react'
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
function AccordionItem({ id, question, answer, openId, onToggle }: {
  id: string; question: string; answer: string; openId: string | null; onToggle: (id: string) => void
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
          {question}
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
            <p className="pb-5 text-[14px] leading-relaxed" style={{ color: '#52525B' }}>{answer}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── FAQ data ──────────────────────────────────────────────────────────────
const FAQ_CATEGORIES = [
  {
    id: 'faq-paiement',
    title: 'Paiement',
    items: [
      {
        id: 'p1',
        question: 'Est-ce que mes clients paient des frais en plus ?',
        answer: "Non. Aucune commission, aucun frais de service n'est prélevé côté client. Ils paient exactement le prix de leur addition, ni plus ni moins. C'est une promesse que nous ne cassons pas.",
      },
      {
        id: 'p2',
        question: 'Quels moyens de paiement sont acceptés ?',
        answer: "Carte bancaire (Visa, Mastercard), Apple Pay et Google Pay. Le paiement est traité par Viva Wallet, agréé ACPR, avec 3D Secure activé sur chaque transaction.",
      },
      {
        id: 'p3',
        question: 'Quand est-ce que je reçois mes virements ?',
        answer: "Viva Wallet effectue des virements quotidiens sur votre IBAN. Les fonds encaissés le jour J sont virés le lendemain ouvré.",
      },
      {
        id: 'p4',
        question: "Que se passe-t-il si un paiement échoue ?",
        answer: "Le client est notifié en temps réel et peut réessayer avec un autre moyen de paiement. Vous recevez également une notification dans votre dashboard.",
      },
    ],
  },
  {
    id: 'faq-compte',
    title: 'Mon compte',
    items: [
      {
        id: 'c1',
        question: 'Comment créer mon compte restaurant ?',
        answer: "Rendez-vous sur splitzy.fr, cliquez sur \"Commencer gratuitement\", puis suivez l'onboarding en 4 étapes (5-10 minutes). Vous aurez besoin d'un IBAN pour recevoir vos paiements.",
      },
      {
        id: 'c2',
        question: "Puis-je changer de plan à tout moment ?",
        answer: "Oui. Pas d'engagement, pas de pénalité. Upgrade ou downgrade depuis votre dashboard → Paramètres → Abonnement.",
      },
      {
        id: 'c3',
        question: 'Comment annuler mon abonnement ?',
        answer: "Depuis votre dashboard → Paramètres → Abonnement → Résilier. L'accès reste actif jusqu'à la fin de la période payée.",
      },
      {
        id: 'c4',
        question: "Je ne reçois pas mes emails de notification, que faire ?",
        answer: "Vérifiez vos spams et ajoutez notifications@splitzy.fr à vos contacts. Si le problème persiste, contactez contact@splitzy.fr.",
      },
    ],
  },
  {
    id: 'faq-qr',
    title: 'QR codes & Tables',
    items: [
      {
        id: 'q1',
        question: 'Comment générer mes QR codes ?',
        answer: "Dans votre dashboard → Paramètres → QR codes. Cliquez sur \"Générer\" pour chaque table. Vous pouvez les télécharger en PDF et les imprimer directement.",
      },
      {
        id: 'q2',
        question: "Quelle taille d'impression recommandez-vous ?",
        answer: "Minimum 5×5 cm pour être facilement scannable. Idéalement 8×8 cm sur un chevalet de table ou un support plastifié.",
      },
      {
        id: 'q3',
        question: 'Un client a scanné le mauvais QR code. Que faire ?',
        answer: "Le client verra l'addition de la mauvaise table. Il peut revenir en arrière et scanner le bon QR code. Aucun paiement n'est débité tant qu'il n'a pas confirmé.",
      },
      {
        id: 'q4',
        question: "Peut-on utiliser Splitzy sans caisse logicielle ?",
        answer: "Oui. En mode manuel, vous saisissez le montant de l'addition directement dans le dashboard avant que le client scanne. Les intégrations POS (Lightspeed, Zelty, L'Addition) automatisent cette étape sur le plan Pro.",
      },
    ],
  },
]

// ── Main ─────────────────────────────────────────────────────────────────
export function AidePage() {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const toggle = (id: string) => setOpenId(openId === id ? null : id)

  const q = query.toLowerCase().trim()

  const CATEGORIES = [
    { Icon: CreditCard, title: 'Paiement',         sub: 'Méthodes, sécurité, reçus',                href: '#faq-paiement' },
    { Icon: User,       title: 'Mon compte',        sub: 'Connexion, abonnement, facturation',       href: '#faq-compte' },
    { Icon: QrCode,     title: 'QR codes & Tables', sub: 'Configuration, impression, problèmes',     href: '#faq-qr' },
  ]

  return (
    <div className="w-full min-h-screen" style={{ background: '#FAFAFA' }}>
      <Navbar />

      {/* ── HERO + SEARCH ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-44 pb-20" style={{ background: '#FAFAFA' }}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 100%)' }} />
        <div className="relative max-w-[1100px] mx-auto px-6 text-center">
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-[0.1em]"
              style={{ background: '#FFF4E5', color: '#E8920A' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E8920A' }} />
              Centre d&apos;aide
            </span>
          </div>
          <h1 className="text-balance" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.0, fontSize: 'clamp(38px, 6vw, 64px)', color: '#0A0A0A' }}>
            <TextReveal>Comment pouvons-nous vous aider ?</TextReveal>
          </h1>
          <p className="mt-6 max-w-[480px] mx-auto text-[16px] leading-relaxed" style={{ color: '#52525B' }}>
            Trouvez rapidement une réponse, ou contactez notre équipe en moins de 2 minutes.
          </p>
          {/* Search bar */}
          <m.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="mt-10 max-w-[560px] mx-auto relative"
          >
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A1A1AA' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une question..."
              className="w-full pl-11 pr-5 py-4 rounded-2xl text-[15px] outline-none transition-all"
              style={{
                background: 'white',
                border: query ? '2px solid #E8920A' : '1.5px solid #E4E4E7',
                color: '#0A0A0A',
                boxShadow: '0 4px 24px -8px rgba(0,0,0,0.08)',
              }}
            />
          </m.div>
        </div>
      </section>

      {/* ── CATÉGORIES (#FAFAFA) ──────────────────────────────────────────── */}
      {!q && (
        <section className="pb-16" style={{ background: '#FAFAFA' }}>
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {CATEGORIES.map(({ Icon, title, sub, href }, i) => (
                <m.a
                  key={title}
                  href={href}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="bg-white border rounded-2xl p-6 flex items-start gap-4 cursor-pointer transition-colors hover:border-orange-300 group"
                  style={{ borderColor: '#E4E4E7' }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FFF4E5' }}>
                    <Icon size={20} style={{ color: '#E8920A' }} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold group-hover:text-orange-600 transition-colors" style={{ color: '#0A0A0A' }}>{title}</h3>
                    <p className="text-[13px] mt-1" style={{ color: '#71717A' }}>{sub}</p>
                  </div>
                </m.a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ COMPLÈTE (#FAFAFA) ────────────────────────────────────────── */}
      <section className="pb-24 md:pb-32" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[720px] mx-auto px-6">
          {FAQ_CATEGORIES.map((cat) => {
            const filtered = q
              ? cat.items.filter((item) => item.question.toLowerCase().includes(q))
              : cat.items
            if (filtered.length === 0) return null
            return (
              <div key={cat.id} id={cat.id} className="mb-14">
                <h2 className="text-[22px] font-bold mb-6 pb-4 border-b" style={{ color: '#0A0A0A', borderColor: '#E4E4E7' }}>
                  {cat.title}
                </h2>
                {filtered.map((item) => (
                  <AccordionItem
                    key={item.id}
                    id={item.id}
                    question={item.question}
                    answer={item.answer}
                    openId={openId}
                    onToggle={toggle}
                  />
                ))}
              </div>
            )
          })}
          {/* No results */}
          {q && FAQ_CATEGORIES.every((cat) => cat.items.every((item) => !item.question.toLowerCase().includes(q))) && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-[16px] mb-3" style={{ color: '#71717A' }}>Aucune question ne correspond à &laquo;{query}&raquo;.</p>
              <button onClick={() => setQuery('')} className="text-[14px] font-semibold underline" style={{ color: '#E8920A' }}>
                Effacer la recherche
              </button>
            </m.div>
          )}
        </div>
      </section>

      {/* ── TOUJOURS BLOQUÉ (#18181B) ─────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: '#18181B' }}>
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <m.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <h2 className="text-white text-balance mb-4" style={{ fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, fontSize: 'clamp(28px, 4vw, 40px)' }}>
              Toujours bloqué ?
            </h2>
            <p className="text-[15px] mb-10" style={{ color: '#71717A' }}>
              Notre équipe répond en moins de 24h ouvrées.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticBtn href="mailto:contact@splitzy.fr" dark>
                <Mail size={16} /> Envoyer un email
              </MagneticBtn>
              <MagneticBtn href="/contact" dark>
                <MessageCircle size={16} /> Nous contacter
              </MagneticBtn>
            </div>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-8 text-[13px]" style={{ color: '#52525B' }}>
              <span className="flex items-center gap-2">
                <Mail size={13} style={{ color: '#E8920A' }} /> contact@splitzy.fr
              </span>
              <span>Réponse en temps réel · chat disponible 9h–19h</span>
            </div>
          </m.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
