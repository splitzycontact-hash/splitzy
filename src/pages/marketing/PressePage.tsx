import { useState } from 'react'
import { m } from 'framer-motion'
import { toast } from 'sonner'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

// ─── Données ───────────────────────────────────────────────────────────────────

const PITCH_TEXT =
  "Splitzy est une solution française de paiement à table par QR code pour restaurants, bars et cafés. Sa différence : avant qu'un client mécontent ne poste un avis 1 étoile sur Google, Splitzy intercepte son insatisfaction via un feedback privé envoyé directement au gérant."

const STATS = [
  { number: '179', unit: '000', label: 'Restaurants en France', source: 'INSEE 2025' },
  { number: '15',  unit: 'Md€', label: 'Marché QR à table EU',  source: 'MRFR 2025' },
  { number: '+15', unit: '%',   label: 'Croissance annuelle (CAGR)', source: 'Marché EU' },
  { number: '3',   unit: 'avis', label: 'Suffisent à dissuader 59% des clients', source: 'Trustt, 2025' },
]

const RESOURCES = [
  {
    icon: '▣',
    title: 'Logo Splitzy',
    format: 'SVG',
    size: '420 KO',
    description: 'SVG vectoriel et PNG haute définition — variantes fond clair, fond sombre, monochrome.',
  },
  {
    icon: '📄',
    title: 'One-pager produit',
    format: 'PDF',
    size: '1.2 MO',
    description: 'Présentation PDF — fonctionnement, chiffres clés, équipe, captures écran du produit.',
  },
  {
    icon: '👥',
    title: 'Photos équipe',
    format: 'JPG',
    size: '8.4 MO',
    description: 'Portraits haute résolution de Yann Grigoriev et Théo Jamous — formats portrait et paysage.',
  },
  {
    icon: '🎨',
    title: 'Charte graphique',
    format: 'PDF',
    size: '780 KO',
    description: "Couleurs, typographie, espacements et règles d'usage du logo pour les médias.",
  },
]

// ─── Hero Section ──────────────────────────────────────────────────────────────

function HeroSection() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PITCH_TEXT)
      toast.success('Pitch copié !')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  return (
    <section style={{ background: '#18181B' }} className="relative overflow-hidden pt-28 pb-20">
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, #3F3F46 1px, transparent 1px)',
          backgroundSize: '28px 28px', opacity: 0.35, pointerEvents: 'none',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-start">

          {/* ── Colonne gauche ── */}
          <div>
            <m.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}
            >
              <div style={{ width: 20, height: 1.5, background: '#E8920A', flexShrink: 0 }} />
              <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                Presse
              </span>
            </m.div>

            <m.h1
              initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 900,
                fontSize: 'clamp(38px, 5vw, 66px)', lineHeight: 1.04,
                letterSpacing: '-0.04em', color: '#FAFAFA', marginBottom: 20,
              }}
            >
              Splitzy<br />
              dans les{' '}
              <span style={{ color: '#E8920A' }}>médias.</span>
            </m.h1>

            <m.p
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: 'easeOut' }}
              style={{ color: '#71717A', fontSize: 16, lineHeight: 1.65, maxWidth: 400, marginBottom: 32 }}
            >
              Ressources, contacts et chiffres clés pour parler de Splitzy —
              la solution française de paiement à table par QR code.
            </m.p>

            <m.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24, ease: 'easeOut' }}
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, marginBottom: 40 }}
            >
              <a
                href="mailto:presse@splitzy.fr"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#E8920A', color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                  padding: '12px 22px', borderRadius: 10, textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#B8730A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#E8920A')}
              >
                presse@splitzy.fr →
              </a>
              <button
                onClick={() => toast.info('Disponible bientôt')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'transparent', color: '#D4D4D8', fontSize: 14, fontWeight: 600,
                  padding: '12px 22px', borderRadius: 10, border: '1px solid #3F3F46',
                  cursor: 'pointer', transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8920A')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#3F3F46')}
              >
                ↓ Kit presse
              </button>
            </m.div>

            {/* Métadonnées */}
            <m.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.32, ease: 'easeOut' }}
              style={{ display: 'flex', gap: 32, flexWrap: 'wrap' as const }}
            >
              {[
                { label: 'FONDÉE', value: '2025 · Paris' },
                { label: 'STADE', value: 'Pre-seed · NEOMA Incubator' },
                { label: 'ÉQUIPE', value: '2 co-fondateurs' },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ color: '#52525B', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
                    {item.label}
                  </div>
                  <div style={{ color: '#A1A1AA', fontSize: 13 }}>{item.value}</div>
                </div>
              ))}
            </m.div>
          </div>

          {/* ── Pitch card ── */}
          <m.div
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: '#1C1C1F', border: '1px solid #2D2D30',
              borderRadius: 20, padding: '28px', position: 'relative', overflow: 'hidden',
            }}
          >
            <div aria-hidden style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent 0%, #E8920A55 50%, transparent 100%)',
            }} />

            {/* Card header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{
                background: '#FFF4E5', color: '#B8730A',
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              }}>
                PITCH
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
                <span style={{ color: '#71717A', fontSize: 12 }}>Prêt à copier</span>
              </div>
            </div>

            <p style={{ color: '#D4D4D8', fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              En deux phrases
            </p>

            {/* Pitch text */}
            <div style={{
              background: '#27272A', borderRadius: 10, padding: '14px 16px', marginBottom: 16,
              fontSize: 13, lineHeight: 1.7, color: '#A1A1AA',
            }}>
              Splitzy est une solution française de{' '}
              <strong style={{ color: '#D4D4D8', fontWeight: 600 }}>paiement à table par QR code</strong>{' '}
              pour restaurants, bars et cafés. Sa différence : avant qu'un client mécontent ne poste un avis
              1 étoile sur Google, Splitzy{' '}
              <span style={{
                background: '#E8920A22', color: '#E8920A',
                borderRadius: 4, padding: '1px 4px',
              }}>
                intercepte son insatisfaction via un feedback privé
              </span>{' '}
              envoyé directement au gérant.
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 16 }}>
              {['Fondée en 2025', 'Paris, France', 'NEOMA Incubator'].map((tag) => (
                <span key={tag} style={{
                  background: '#27272A', border: '1px solid #3F3F46',
                  color: '#71717A', fontSize: 12, padding: '4px 12px', borderRadius: 99,
                }}>
                  ● {tag}
                </span>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              paddingTop: 14, borderTop: '1px dashed #3F3F46',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ color: '#52525B', fontSize: 12 }}>~280 car. · FR</span>
              <button
                onClick={handleCopy}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: copied ? '#22C55E22' : 'transparent',
                  color: copied ? '#22C55E' : '#A1A1AA',
                  border: `1px solid ${copied ? '#22C55E55' : '#3F3F46'}`,
                  fontSize: 13, fontWeight: 600, padding: '8px 16px',
                  borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s ease',
                }}
              >
                {copied ? '✓ Copié !' : '⎘ Copier le pitch →'}
              </button>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  )
}

// ─── Chiffres clés ─────────────────────────────────────────────────────────────

function ChiffresSection() {
  return (
    <section style={{ background: '#18181B', borderTop: '1px solid #27272A' }} className="py-16">
      <div className="max-w-7xl mx-auto px-6">
        <m.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ marginBottom: 40 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
            <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
              Chiffres clés
            </span>
          </div>
          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(24px, 3.5vw, 42px)', lineHeight: 1.1,
            letterSpacing: '-0.03em', color: '#FAFAFA', marginBottom: 12, maxWidth: 560,
          }}>
            Un marché de 15 Md€, structuré par la peur de l'avis négatif.
          </h2>
          <p style={{ color: '#52525B', fontSize: 12, letterSpacing: '0.06em' }}>
            SOURCES · INSEE · MRFR · SPLITZY
          </p>
        </m.div>

        <div className="grid grid-cols-2 lg:grid-cols-4" style={{ border: '1px solid #27272A', borderRadius: 16, overflow: 'hidden' }}>
          {STATS.map((stat, index) => (
            <m.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
              style={{
                padding: '32px 28px',
                borderRight: index < STATS.length - 1 ? '1px solid #27272A' : 'none',
                borderBottom: index < 2 ? '1px solid #27272A' : 'none',
              }}
              className="lg:border-b-0"
            >
              <div style={{ marginBottom: 10 }}>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontWeight: 900,
                  fontSize: 'clamp(32px, 3.5vw, 48px)', lineHeight: 1,
                  color: '#E8920A', letterSpacing: '-0.03em',
                }}>
                  {stat.number}
                </span>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontWeight: 700,
                  fontSize: 'clamp(18px, 2vw, 26px)',
                  color: '#B8730A', letterSpacing: '-0.02em',
                }}>
                  {stat.unit}
                </span>
              </div>
              <div style={{ color: '#52525B', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 6 }}>
                {stat.label}
              </div>
              <div style={{ color: '#3F3F46', fontSize: 12 }}>{stat.source}</div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Ressources ────────────────────────────────────────────────────────────────

function RessourcesSection() {
  return (
    <section style={{ background: '#FAFAFA' }} className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <m.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.45, ease: 'easeOut' }}
          style={{ marginBottom: 48 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
            <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
              Ressources
            </span>
          </div>
          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05,
            letterSpacing: '-0.035em', color: '#0A0A0A', marginBottom: 12,
          }}>
            Le kit presse Splitzy.
          </h2>
          <p style={{ color: '#71717A', fontSize: 16, lineHeight: 1.6 }}>
            Tous les visuels et documents nécessaires pour couvrir Splitzy.<br />
            Téléchargement direct, sans inscription, sans condition d'usage.
          </p>
        </m.div>

        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 16 }}>
          {RESOURCES.map((res, index) => (
            <m.div
              key={res.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.07, ease: 'easeOut' }}
              style={{
                background: '#FFFFFF', border: '1px solid #E4E4E7',
                borderRadius: 14, padding: '24px',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              whileHover={{ scale: 1.01 }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#E8920A'
                el.style.boxShadow = '0 4px 20px rgba(232,146,10,0.08)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#E4E4E7'
                el.style.boxShadow = 'none'
              }}
            >
              {/* Icône */}
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: '#FFF4E5', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 20, marginBottom: 16,
              }}>
                {res.icon}
              </div>

              {/* Titre + format */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A' }}>{res.title}</h3>
              </div>
              <div style={{ color: '#A1A1AA', fontSize: 11, letterSpacing: '0.06em', marginBottom: 12 }}>
                {res.format} · {res.size}
              </div>

              <p style={{ color: '#71717A', fontSize: 13, lineHeight: 1.55, marginBottom: 20 }}>
                {res.description}
              </p>

              {/* Footer card */}
              <div style={{
                paddingTop: 16, borderTop: '1px solid #F4F4F5',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <a
                  href="mailto:presse@splitzy.fr"
                  style={{
                    color: '#52525B', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                    textDecoration: 'none', transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#E8920A')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#52525B')}
                >
                  Demander par email →
                </a>
                <span style={{
                  background: '#F4F4F5', color: '#A1A1AA',
                  fontSize: 10, fontWeight: 700, padding: '3px 8px',
                  borderRadius: 4, letterSpacing: '0.06em',
                }}>
                  {res.format}
                </span>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Contact ───────────────────────────────────────────────────────────────────

function ContactSection() {
  return (
    <section style={{ background: '#18181B' }} className="py-20">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <m.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
            <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
              Contact
            </span>
            <div style={{ width: 20, height: 1.5, background: '#E8920A' }} />
          </div>

          <h2 style={{
            fontFamily: 'Inter, sans-serif', fontWeight: 900,
            fontSize: 'clamp(32px, 4vw, 52px)', lineHeight: 1.05,
            letterSpacing: '-0.04em', color: '#FAFAFA', marginBottom: 16,
          }}>
            Parlons-en.
          </h2>

          <p style={{ color: '#71717A', fontSize: 16, lineHeight: 1.6, marginBottom: 40 }}>
            Pour toute demande d'interview, de visuels ou d'informations,<br />
            notre équipe répond <strong style={{ color: '#D4D4D8' }}>sous 24h</strong>.
          </p>

          {/* Contact card */}
          <div style={{
            background: '#1C1C1F', border: '1px solid #2D2D30',
            borderRadius: 16, padding: '24px 28px', marginBottom: 28,
            display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' as const,
          }}>
            {/* Avatar */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: '#E8920A', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0,
              fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 16, color: '#FFFFFF',
            }}>
              YG
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ color: '#F4F4F5', fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
                Yann Grigoriev
              </div>
              <div style={{ color: '#71717A', fontSize: 13, marginBottom: 4 }}>
                CEO & Co-fondateur · Splitzy
              </div>
              <a
                href="mailto:presse@splitzy.fr"
                style={{ color: '#E8920A', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}
              >
                presse@splitzy.fr →
              </a>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#27272A', borderRadius: 99, padding: '6px 12px', flexShrink: 0,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
              <span style={{ color: '#71717A', fontSize: 12 }}>Répond sous 24h</span>
            </div>
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <a
              href="mailto:presse@splitzy.fr"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#E8920A', color: '#FFFFFF', fontSize: 14, fontWeight: 700,
                padding: '13px 24px', borderRadius: 10, textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#B8730A')}
              onMouseLeave={e => (e.currentTarget.style.background = '#E8920A')}
            >
              ✉ Écrire à presse@splitzy.fr
            </a>
            <a
              href="#"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: '#D4D4D8', fontSize: 14, fontWeight: 600,
                padding: '13px 24px', borderRadius: 10, border: '1px solid #3F3F46',
                textDecoration: 'none', transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8920A')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#3F3F46')}
            >
              ⎋ LinkedIn — Yann Grigoriev
            </a>
          </div>
        </m.div>
      </div>
    </section>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function PressePage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#18181B' }}>
      <Navbar />
      <HeroSection />
      <ChiffresSection />
      <RessourcesSection />
      <ContactSection />
      <Footer />
    </div>
  )
}
