import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { m, AnimatePresence } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

// ─── Données ───────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { icon: '💳', title: 'Paiement',          sub: 'Méthodes, sécurité, reçus' },
  { icon: '👤', title: 'Mon compte',         sub: 'Connexion, abonnement, facturation' },
  { icon: '⬛', title: 'QR codes & Tables', sub: 'Configuration, impression, problèmes' },
]

const POPULAR = ['Frais clients', 'Changer de plan', 'Générer mes QR codes', 'Annuler']

const FAQ: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: 'Paiement',
    items: [
      {
        q: 'Est-ce que mes clients paient des frais en plus ?',
        a: "Non. Splitzy ne facture aucun frais supplémentaire à vos clients. Ils paient exactement le montant affiché sur l'addition, sans surcoût.",
      },
      {
        q: 'Quels moyens de paiement sont acceptés ?',
        a: 'Apple Pay, Google Pay, et toutes les cartes bancaires (Visa, Mastercard, American Express). Le paiement est traité par Square — sécurisé et certifié PCI DSS.',
      },
      {
        q: 'Quand est-ce que je reçois mes virements ?',
        a: 'Les virements sont effectués sous 1 à 2 jours ouvrés directement sur votre compte bancaire. Vous recevez un récapitulatif par email à chaque virement.',
      },
      {
        q: "Que se passe-t-il si un paiement échoue ?",
        a: "Le client est invité à réessayer avec un autre moyen de paiement. Aucun montant n'est débité en cas d'échec. Vous êtes notifié en temps réel sur votre dashboard.",
      },
    ],
  },
  {
    category: 'Mon compte',
    items: [
      {
        q: 'Comment créer mon compte restaurant ?',
        a: "Rendez-vous sur splitzy.fr et cliquez sur « Commencer gratuitement ». Renseignez le nom de votre établissement, votre email et créez un mot de passe. L'installation prend moins de 15 minutes.",
      },
      {
        q: 'Puis-je changer de plan à tout moment ?',
        a: 'Oui. Vous pouvez passer du plan Gratuit au plan Essentiel (59€/mois) ou Pro (99€/mois) depuis votre dashboard, à tout moment et sans frais de changement.',
      },
      {
        q: 'Comment annuler mon abonnement ?',
        a: "Rendez-vous dans Paramètres → Abonnement → Annuler. Vous conservez l'accès jusqu'à la fin de la période en cours. Aucune question posée.",
      },
      {
        q: 'Je ne reçois pas mes emails de notification, que faire ?',
        a: 'Vérifiez votre dossier spam. Si le problème persiste, contactez-nous à contact@splitzy.fr — nous résolvons ça en moins de 2h ouvrées.',
      },
    ],
  },
  {
    category: 'QR codes & Tables',
    items: [
      {
        q: 'Comment générer mes QR codes ?',
        a: "Dans votre dashboard, allez dans « Tables & QR codes », ajoutez vos tables et cliquez sur « Générer les QR codes ». Vous pouvez les télécharger en PDF prêts à imprimer.",
      },
      {
        q: "Quelle taille d'impression recommandez-vous ?",
        a: 'Minimum 5×5 cm pour une lecture confortable. Nos templates PDF sont optimisés en 8×8 cm (format carte de visite étendue). Plastification recommandée.',
      },
      {
        q: 'Un client a scanné le mauvais QR code. Que faire ?',
        a: 'Le paiement reste lié à la table scannée. Depuis votre dashboard, vous pouvez voir en temps réel quelle table est en cours de paiement et corriger manuellement si besoin.',
      },
      {
        q: "Peut-on utiliser Splitzy sans caisse logicielle ?",
        a: "Oui. Splitzy fonctionne de façon autonome — vous saisissez l'addition directement dans le dashboard. L'intégration avec un POS (Square, Lightspeed) est optionnelle.",
      },
    ],
  },
]

// ─── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  const [query, setQuery] = useState('')

  return (
    <section style={{ background: '#18181B' }} className="relative overflow-hidden pt-24 pb-16">
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, #3F3F46 1px, transparent 1px)',
          backgroundSize: '28px 28px', opacity: 0.3, pointerEvents: 'none',
        }}
      />
      <div className="relative max-w-2xl mx-auto px-6 text-center">

        {/* Overline */}
        <m.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}
        >
          <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
          <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
            Centre d'aide
          </span>
          <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
        </m.div>

        {/* H1 */}
        <m.h1
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(36px, 6vw, 60px)', lineHeight: 1.05,
            letterSpacing: '-0.04em', color: '#FAFAFA', marginBottom: 16,
          }}
        >
          Comment pouvons-nous<br />vous aider ?
        </m.h1>

        {/* Subtitle */}
        <m.p
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16, ease: 'easeOut' }}
          style={{ color: '#71717A', fontSize: 16, lineHeight: 1.65, marginBottom: 32 }}
        >
          Trouvez rapidement une réponse, ou contactez notre équipe en moins de 2 minutes.
        </m.p>

        {/* Search bar */}
        <m.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 16 }}
        >
          <div
            style={{
              background: '#27272A', border: '1px solid #3F3F46', borderRadius: 12,
              padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
              transition: 'border-color 0.2s ease',
            }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = '#E8920A')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = '#3F3F46')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une question..."
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#FAFAFA', fontSize: 16, flex: 1,
              }}
            />
          </div>
        </m.div>

        {/* Popular tags */}
        <m.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.36 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const }}
        >
          <span style={{ color: '#52525B', fontSize: 12, marginRight: 4 }}>Questions populaires :</span>
          {POPULAR.map(tag => (
            <button
              key={tag}
              style={{
                background: '#27272A', border: '1px solid #3F3F46', borderRadius: 99,
                color: '#A1A1AA', fontSize: 12, padding: '5px 14px', cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.background = '#FFF4E5'
                el.style.borderColor = '#E8920A'
                el.style.color = '#B8730A'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.background = '#27272A'
                el.style.borderColor = '#3F3F46'
                el.style.color = '#A1A1AA'
              }}
            >
              {tag}
            </button>
          ))}
        </m.div>
      </div>

      {/* Categories */}
      <div className="relative max-w-4xl mx-auto px-6 mt-12">
        <m.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.44 }}
          style={{ color: '#52525B', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, textAlign: 'center', marginBottom: 16 }}
        >
          Parcourir par catégorie
        </m.p>
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 12 }}>
          {CATEGORIES.map((cat, i) => (
            <m.div
              key={cat.title}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.48 + i * 0.07, ease: 'easeOut' }}
              style={{
                background: '#1C1C1F', border: '1px solid #2D2D30', borderRadius: 14,
                padding: '20px 20px', display: 'flex', alignItems: 'flex-start', gap: 14,
                cursor: 'pointer', transition: 'border-color 0.2s ease',
              }}
              whileHover={{ scale: 1.02 }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8920A')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2D2D30')}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: '#FFF4E5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {cat.icon}
              </div>
              <div>
                <div style={{ color: '#F4F4F5', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{cat.title}</div>
                <div style={{ color: '#71717A', fontSize: 12, lineHeight: 1.5 }}>{cat.sub}</div>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────

function FAQSection() {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id))

  return (
    <section style={{ background: '#FAFAFA' }} className="py-20">
      <div className="max-w-2xl mx-auto px-6">

        {/* Section header */}
        <m.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ marginBottom: 52 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
            <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
              Foire aux questions
            </span>
          </div>
          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.1,
            letterSpacing: '-0.035em', color: '#0A0A0A',
          }}>
            Réponses rapides aux questions courantes.
          </h2>
        </m.div>

        {/* FAQ blocks */}
        {FAQ.map((block, blockIdx) => (
          <m.div
            key={block.category}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: blockIdx * 0.08, ease: 'easeOut' }}
            style={{ marginBottom: 48 }}
          >
            {/* Category title */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              paddingBottom: 12, borderBottom: '1px solid #E4E4E7', marginBottom: 8,
            }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 22, letterSpacing: '-0.025em', color: '#0A0A0A' }}>
                {block.category}
              </h3>
              <span style={{ color: '#A1A1AA', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
                {block.items.length} QUESTIONS
              </span>
            </div>

            {/* Items */}
            {block.items.map((item, itemIdx) => {
              const id = `${blockIdx}-${itemIdx}`
              const isOpen = openId === id
              return (
                <div key={id} style={{ borderBottom: '1px solid #F4F4F5' }}>
                  <button
                    onClick={() => toggle(id)}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '16px 0', background: 'none',
                      border: 'none', cursor: 'pointer', textAlign: 'left' as const, gap: 16,
                    }}
                  >
                    <span style={{
                      fontSize: 15, fontWeight: isOpen ? 600 : 500,
                      color: '#1A1A1A', lineHeight: 1.4,
                    }}>
                      {item.q}
                    </span>
                    <m.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{ display: 'block', flexShrink: 0, color: '#A1A1AA', fontSize: 18 }}
                    >
                      ↓
                    </m.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <m.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          paddingLeft: 16, paddingBottom: 16,
                          borderLeft: '3px solid #E8920A',
                        }}>
                          <p style={{ color: '#52525B', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                            {item.a}
                          </p>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </m.div>
        ))}
      </div>
    </section>
  )
}

// ─── Contact ───────────────────────────────────────────────────────────────────

function ContactSection() {
  return (
    <section style={{ background: '#18181B' }} className="py-20">
      <div className="max-w-lg mx-auto px-6 text-center">
        <m.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
            <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
              Support
            </span>
            <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
          </div>

          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(34px, 5vw, 52px)', lineHeight: 1.05,
            letterSpacing: '-0.04em', color: '#FAFAFA', marginBottom: 14,
          }}>
            Toujours bloqué ?
          </h2>

          <p style={{ color: '#71717A', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
            Notre équipe répond en moins de 24h ouvrées.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 24 }}>
            <a
              href="mailto:contact@splitzy.fr"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#E8920A', color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                padding: '13px 24px', borderRadius: 10, textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#B8730A')}
              onMouseLeave={e => (e.currentTarget.style.background = '#E8920A')}
            >
              ✉ Envoyer un email
            </a>
            <a
              href="/contact"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: '#D4D4D8', fontSize: 14, fontWeight: 600,
                padding: '13px 24px', borderRadius: 10, border: '1px solid #3F3F46',
                textDecoration: 'none', transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8920A')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#3F3F46')}
            >
              💬 Nous contacter
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <span style={{ color: '#52525B', fontSize: 12 }}>✉ contact@splitzy.fr</span>
            <span style={{ color: '#3F3F46' }}>·</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#52525B', fontSize: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
              Réponse par email sous 24h ouvrées
            </span>
          </div>
        </m.div>
      </div>
    </section>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function AidePage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#18181B' }}>
      <Helmet>
        <title>Centre d'aide — Splitzy</title>
        <meta name="description" content="Guides, tutoriels et réponses pour bien démarrer avec Splitzy. Installation, QR codes, paiements : on vous accompagne pas à pas." />
      </Helmet>
      <Navbar />
      <HeroSection />
      <FAQSection />
      <ContactSection />
      <Footer />
    </div>
  )
}
