import { m } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

// ─── Données ───────────────────────────────────────────────────────────────────

const CERTIFICATIONS = [
  { label: 'PCI DSS Level 1', icon: '🛡' },
  { label: '3D Secure (3DS2)', icon: '🔒' },
  { label: 'RGPD conforme', icon: '✔' },
  { label: 'AWS eu-west', icon: '🌍' },
]

const STANDARDS = [
  {
    title: 'PCI DSS Level 1',
    body: 'Tous les paiements sont traités par Viva Wallet, certifié PCI DSS Level 1 — le plus haut niveau de sécurité pour les transactions par carte.',
    icon: '🛡',
  },
  {
    title: '3D Secure',
    body: "Chaque paiement est protégé par l'authentification 3D Secure (3DS2). Les transactions non authentifiées sont automatiquement bloquées.",
    icon: '🔒',
  },
  {
    title: 'Hébergement EU',
    body: "Toutes les données sont stockées en Europe (Convex Cloud, infrastructure AWS eu-west). Jamais de transfert hors UE.",
    icon: '🌍',
  },
  {
    title: 'RGPD conforme',
    body: "Splitzy est conforme au Règlement Général sur la Protection des Données. Vous pouvez demander la suppression de vos données à tout moment.",
    icon: '✅',
  },
  {
    title: 'Chiffrement bout en bout',
    body: "Toutes les communications entre votre téléphone, nos serveurs et Viva Wallet sont chiffrées via TLS 1.3.",
    icon: '🔐',
  },
  {
    title: 'Sauvegardes quotidiennes',
    body: "Vos données (feedbacks, transactions, paramètres) sont sauvegardées automatiquement chaque jour avec rétention 30 jours.",
    icon: '💾',
  },
]

const PAYMENT_STEPS = [
  { n: 1, title: 'Le client scanne le QR code', sub: 'Connexion HTTPS chiffrée' },
  { n: 2, title: 'Il entre ses coordonnées de carte', sub: 'Jamais stockées sur nos serveurs' },
  { n: 3, title: 'Viva Wallet traite la transaction', sub: 'PCI DSS Level 1' },
  { n: 4, title: 'Le paiement est confirmé', sub: 'En moins de 3 secondes' },
  { n: 5, title: "Les fonds arrivent sur votre IBAN", sub: 'Le lendemain ouvré' },
]

const COLLECTED = [
  'Prénom du client (saisi volontairement)',
  "Montant et détail de l'addition",
  'Méthode de paiement (type uniquement, jamais le numéro)',
  "Note et feedback (si l'utilisateur en donne un)",
  'Adresse IP (logs de sécurité, 30 jours max)',
]

const NOT_COLLECTED = [
  'Numéro de carte bancaire',
  'Historique de navigation',
  'Données de localisation',
  'Compte réseaux sociaux',
  'Données revendues à des tiers — jamais',
  'Cookies tiers de tracking',
]

const RGPD_RIGHTS = [
  {
    title: "Droit d'accès",
    body: "Vous pouvez à tout moment demander une copie de l'ensemble des données que Splitzy détient sur vous. Contactez-nous à privacy@splitzy.fr — nous répondons sous 30 jours.",
  },
  {
    title: 'Droit de rectification',
    body: "Si des données vous concernant sont inexactes ou incomplètes, vous pouvez demander leur correction. Envoyez votre demande à privacy@splitzy.fr avec les éléments à corriger.",
  },
  {
    title: "Droit à l'effacement",
    body: "Vous pouvez demander la suppression de vos données personnelles. Nous traitons la demande sous 7 jours ouvrés. Certaines données peuvent être conservées pour des obligations légales.",
  },
  {
    title: 'Droit à la portabilité',
    body: "Vous pouvez recevoir vos données dans un format structuré et lisible par machine (JSON ou CSV). Ce droit s'applique aux données que vous nous avez fourni activement.",
  },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

function Overline({ label, centered = false }: { label: string; centered?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: centered ? 'center' : 'flex-start',
      gap: 12, marginBottom: 20,
    }}>
      <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
      <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
        {label}
      </span>
      {centered && <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />}
    </div>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section style={{ background: '#18181B' }} className="relative overflow-hidden pt-24 pb-20">
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, #3F3F46 1px, transparent 1px)',
          backgroundSize: '28px 28px', opacity: 0.3, pointerEvents: 'none',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — texte */}
          <div>
            <m.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Overline label="Sécurité" />
            </m.div>

            <m.h1
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 900,
                fontSize: 'clamp(38px, 5vw, 62px)', lineHeight: 1.05,
                letterSpacing: '-0.04em', color: '#FAFAFA', marginBottom: 20,
              }}
            >
              Vos données et<br />
              vos paiements<br />
              <span style={{ color: '#E8920A' }}>sont protégés.</span>
            </m.h1>

            <m.p
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: 'easeOut' }}
              style={{ color: '#71717A', fontSize: 16, lineHeight: 1.7, marginBottom: 32, maxWidth: 440 }}
            >
              Splitzy est construit sur des infrastructures certifiées et des pratiques de sécurité rigoureuses.
            </m.p>

            <m.div
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.28, ease: 'easeOut' }}
              style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 10 }}
            >
              {['PCI DSS Level 1', '3D Secure', 'RGPD conforme', 'Hébergement EU'].map(badge => (
                <div
                  key={badge}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: '#27272A', border: '1px solid #3F3F46',
                    borderRadius: 8, padding: '8px 14px',
                  }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                  <span style={{ color: '#D4D4D8', fontSize: 13, fontWeight: 600 }}>{badge}</span>
                </div>
              ))}
            </m.div>
          </div>

          {/* Right — carte certifications */}
          <m.div
            initial={{ opacity: 0, x: 24, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{
              background: '#1C1C1F', border: '1px solid #2D2D30', borderRadius: 20,
              padding: '28px', maxWidth: 420,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: '#FFF4E5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  🛡
                </div>
                <span style={{ color: '#A1A1AA', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
                  Certifications actives
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' as const }}>
                {CERTIFICATIONS.map((cert, i) => (
                  <div
                    key={cert.label}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: i < CERTIFICATIONS.length - 1 ? '1px solid #27272A' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span style={{ color: '#E4E4E7', fontSize: 14, fontWeight: 500 }}>{cert.label}</span>
                    </div>
                    <span style={{
                      background: 'rgba(34,197,94,0.12)', color: '#22C55E',
                      fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                      padding: '3px 10px', borderRadius: 99,
                    }}>
                      ACTIF
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 20, paddingTop: 16, borderTop: '1px solid #27272A',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                <span style={{ color: '#52525B', fontSize: 12 }}>Dernière vérification : Mai 2026</span>
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  )
}

// ─── Standards ────────────────────────────────────────────────────────────────

function StandardsSection() {
  return (
    <section style={{ background: '#FAFAFA' }} className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <m.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ marginBottom: 52 }}
        >
          <Overline label="Standards" />
          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.1,
            letterSpacing: '-0.035em', color: '#0A0A0A',
          }}>
            Standards de sécurité.
          </h2>
          <p style={{ color: '#52525B', fontSize: 16, lineHeight: 1.65, marginTop: 12, maxWidth: 520 }}>
            Les certifications sur lesquelles repose chaque transaction Splitzy.
          </p>
        </m.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 16 }}>
          {STANDARDS.map((s, i) => (
            <m.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07, ease: 'easeOut' }}
              style={{
                background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 16,
                padding: '24px 22px',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: '#FFF4E5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, marginBottom: 16,
              }}>
                {s.icon}
              </div>
              <h3 style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 16,
                color: '#0A0A0A', marginBottom: 8, letterSpacing: '-0.02em',
              }}>
                {s.title}
              </h3>
              <p style={{ color: '#52525B', fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
                {s.body}
              </p>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Flux de paiement ─────────────────────────────────────────────────────────

function PaymentFlowSection() {
  return (
    <section style={{ background: '#18181B' }} className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Gauche — étapes */}
          <div>
            <m.div
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.45, ease: 'easeOut' }}
              style={{ marginBottom: 40 }}
            >
              <Overline label="Flux de paiement" />
              <h2 style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 900,
                fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.1,
                letterSpacing: '-0.035em', color: '#FAFAFA',
              }}>
                Comment fonctionne un paiement Splitzy ?
              </h2>
            </m.div>

            <div style={{ display: 'flex', flexDirection: 'column' as const }}>
              {PAYMENT_STEPS.map((step, i) => (
                <m.div
                  key={step.n}
                  initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
                  style={{ display: 'flex', gap: 16, paddingBottom: i < PAYMENT_STEPS.length - 1 ? 24 : 0 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: '#E8920A',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#FFFFFF', fontSize: 14, fontWeight: 800,
                    }}>
                      {step.n}
                    </div>
                    {i < PAYMENT_STEPS.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: '#2D2D30', marginTop: 6 }} />
                    )}
                  </div>
                  <div style={{ paddingTop: 6 }}>
                    <div style={{ color: '#F4F4F5', fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{step.title}</div>
                    <div style={{ color: '#71717A', fontSize: 13 }}>{step.sub}</div>
                  </div>
                </m.div>
              ))}
            </div>

            <m.div
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.45, ease: 'easeOut' }}
              style={{
                marginTop: 32, background: 'rgba(232,146,10,0.1)', border: '1px solid rgba(232,146,10,0.25)',
                borderRadius: 12, padding: '16px 18px',
              }}
            >
              <p style={{ color: '#E4E4E7', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                <strong style={{ color: '#FAFAFA' }}>Splitzy ne stocke jamais les numéros de carte de vos clients.</strong>{' '}
                Zéro donnée bancaire sur nos serveurs.
              </p>
            </m.div>
          </div>

          {/* Droite — diagramme flux */}
          <m.div
            initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'stretch', maxWidth: 300, margin: '0 auto' }}
          >
            {[
              { label: 'Client', accent: false },
              { label: 'Splitzy', accent: true },
              { label: 'Viva Wallet', accent: false },
              { label: 'IBAN restaurant', accent: false },
            ].map((node, i, arr) => (
              <div key={node.label} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                <div style={{
                  width: '100%', padding: '16px 20px', borderRadius: 12,
                  background: node.accent ? '#E8920A' : '#27272A',
                  border: node.accent ? 'none' : '1px solid #3F3F46',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: node.accent ? '#FFFFFF' : '#D4D4D8', fontSize: 14, fontWeight: 700 }}>
                    {node.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '6px 0' }}>
                    <div style={{ width: 1, height: 12, background: '#3F3F46' }} />
                    <svg width="12" height="6" viewBox="0 0 12 6" fill="#3F3F46"><path d="M0 0l6 6 6-6z" /></svg>
                  </div>
                )}
              </div>
            ))}
            <div style={{
              marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 8, padding: '8px 14px',
            }}>
              <span style={{ color: '#22C55E', fontSize: 12, fontWeight: 600 }}>🔒 Chiffré TLS 1.3</span>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  )
}

// ─── Transparence ─────────────────────────────────────────────────────────────

function TransparenceSection() {
  return (
    <section style={{ background: '#F4F4F5' }} className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <m.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ marginBottom: 48 }}
        >
          <Overline label="Transparence" />
          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.1,
            letterSpacing: '-0.035em', color: '#0A0A0A',
          }}>
            Données personnelles.
          </h2>
          <p style={{ color: '#52525B', fontSize: 16, lineHeight: 1.65, marginTop: 12, maxWidth: 480 }}>
            Ce que Splitzy collecte — et ce qu'il ne collecte jamais.
          </p>
        </m.div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 20 }}>
          <m.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 16, padding: '28px 26px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 16, color: '#0A0A0A', letterSpacing: '-0.02em' }}>
                Ce que nous collectons
              </h3>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {COLLECTED.map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', marginTop: 6, flexShrink: 0 }} />
                  <span style={{ color: '#52525B', fontSize: 14, lineHeight: 1.55 }}>{item}</span>
                </li>
              ))}
            </ul>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
            style={{ background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 16, padding: '28px 26px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 16, color: '#0A0A0A', letterSpacing: '-0.02em' }}>
                Ce que nous ne collectons pas
              </h3>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {NOT_COLLECTED.map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', marginTop: 6, flexShrink: 0 }} />
                  <span style={{ color: '#52525B', fontSize: 14, lineHeight: 1.55 }}>{item}</span>
                </li>
              ))}
            </ul>
          </m.div>
        </div>
      </div>
    </section>
  )
}

// ─── RGPD ─────────────────────────────────────────────────────────────────────

function RGPDSection() {
  return (
    <section style={{ background: '#FAFAFA' }} className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <m.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ marginBottom: 48 }}
        >
          <Overline label="RGPD" />
          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.1,
            letterSpacing: '-0.035em', color: '#0A0A0A',
          }}>
            Vos droits.
          </h2>
          <p style={{ color: '#52525B', fontSize: 16, lineHeight: 1.65, marginTop: 12, maxWidth: 480 }}>
            Conformément au RGPD, vous disposez des droits suivants.
          </p>
        </m.div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
          {RGPD_RIGHTS.map((right, i) => (
            <m.div
              key={right.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07, ease: 'easeOut' }}
              style={{
                background: '#FFFFFF', border: '1px solid #E4E4E7', borderRadius: 14,
                padding: '24px 22px', borderLeft: '3px solid #E8920A',
              }}
            >
              <h3 style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 15,
                color: '#0A0A0A', marginBottom: 10, letterSpacing: '-0.015em',
              }}>
                {right.title}
              </h3>
              <p style={{ color: '#52525B', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>
                {right.body}
              </p>
            </m.div>
          ))}
        </div>

        <m.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 }}
          style={{ color: '#71717A', fontSize: 13, marginTop: 28, textAlign: 'center' as const }}
        >
          Pour exercer vos droits :{' '}
          <a href="mailto:privacy@splitzy.fr" style={{ color: '#E8920A', textDecoration: 'none', fontWeight: 600 }}>
            privacy@splitzy.fr
          </a>
        </m.p>
      </div>
    </section>
  )
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function ContactSection() {
  return (
    <section style={{ background: '#18181B' }} className="py-20">
      <div className="max-w-lg mx-auto px-6 text-center">
        <m.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Overline label="Questions" centered />

          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(34px, 5vw, 52px)', lineHeight: 1.05,
            letterSpacing: '-0.04em', color: '#FAFAFA', marginBottom: 14,
          }}>
            Une question sur notre sécurité ?
          </h2>

          <p style={{ color: '#71717A', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
            Notre équipe répond sous 24h ouvrées.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <a
              href="/contact"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#E8920A', color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                padding: '13px 24px', borderRadius: 10, textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#B8730A')}
              onMouseLeave={e => (e.currentTarget.style.background = '#E8920A')}
            >
              💬 Nous contacter
            </a>
            <a
              href="/aide"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: '#D4D4D8', fontSize: 14, fontWeight: 600,
                padding: '13px 24px', borderRadius: 10, border: '1px solid #3F3F46',
                textDecoration: 'none', transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8920A')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#3F3F46')}
            >
              Centre d'aide →
            </a>
          </div>

          <div style={{ marginTop: 24 }}>
            <a
              href="/politique-confidentialite"
              style={{ color: '#52525B', fontSize: 12, textDecoration: 'underline', textDecorationColor: '#3F3F46' }}
            >
              Politique de confidentialité
            </a>
          </div>
        </m.div>
      </div>
    </section>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SecuritePage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#18181B' }}>
      <Navbar />
      <HeroSection />
      <StandardsSection />
      <PaymentFlowSection />
      <TransparenceSection />
      <RGPDSection />
      <ContactSection />
      <Footer />
    </div>
  )
}
