import { m } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

// ─── Types & Data ──────────────────────────────────────────────────────────────

interface ChangelogEntry {
  version: string
  category: string
  date: string
  title: string
  description?: string
  items: { icon: string; text: string }[]
  isLatest?: boolean
}

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; textColor: string }> = {
  Performance: { color: '#E8920A', bg: '#FFF4E5', textColor: '#B8730A' },
  Dashboard:   { color: '#3B82F6', bg: '#EFF6FF', textColor: '#1D4ED8' },
  Mobile:      { color: '#8B5CF6', bg: '#F5F3FF', textColor: '#6D28D9' },
  Payments:    { color: '#22C55E', bg: '#F0FDF4', textColor: '#15803D' },
  Lancement:   { color: '#FAFAFA', bg: '#27272A', textColor: '#FAFAFA' },
}

const ENTRIES: ChangelogEntry[] = [
  {
    version: 'v0.9',
    category: 'Performance',
    date: 'Mai 2026',
    title: 'Chargement mobile 3× plus rapide',
    description: 'Le flow client QR se charge maintenant en moins de 2 secondes sur mobile, même sur 4G faible.',
    items: [
      { icon: '⚡', text: 'Bundle initial réduit de 400 kB à 134 kB (–66%)' },
      { icon: '⚡', text: 'Lazy loading de toutes les routes' },
      { icon: '⚡', text: 'Framer Motion optimisé via LazyMotion' },
      { icon: '⚡', text: 'Clerk isolé du flow client (ne se charge plus pour les clients QR)' },
    ],
    isLatest: true,
  },
  {
    version: 'v0.8',
    category: 'Dashboard',
    date: 'Mai 2026',
    title: "Fix dashboard gérant — plus de flash d'erreur",
    items: [
      { icon: '🔧', text: 'Fix : plus de flash "Aucune table configurée" pendant le chargement' },
      { icon: '🔧', text: 'Fix : spinner pendant le chargement des QR codes' },
      { icon: '✨', text: 'Amélioration : navigation dashboard plus fluide' },
    ],
  },
  {
    version: 'v0.7',
    category: 'Mobile',
    date: 'Avril 2026',
    title: 'Flow client entièrement revu pour mobile',
    items: [
      { icon: '📱', text: '100dvh partout (plus de débordement Safari iOS)' },
      { icon: '📱', text: 'Inputs 16px (plus de zoom automatique iOS)' },
      { icon: '📱', text: 'Safe area iPhone corrigée' },
      { icon: '📱', text: 'Touch targets 44px minimum' },
      { icon: '📱', text: 'PhoneWrapper désactivé sur mobile' },
    ],
  },
  {
    version: 'v0.6',
    category: 'Payments',
    date: 'Mars 2026',
    title: 'Intégration Square en production',
    items: [
      { icon: '💳', text: 'Intégration Square live (paiements réels)' },
      { icon: '💳', text: 'Reçus par email automatiques' },
      { icon: '💳', text: '3D Secure activé' },
    ],
  },
  {
    version: 'v0.5',
    category: 'Lancement',
    date: 'Février 2026',
    title: 'Premier déploiement public',
    items: [
      { icon: '🚀', text: 'splitzy.fr en ligne' },
      { icon: '🚀', text: 'Flow client QR complet (8 écrans)' },
      { icon: '🚀', text: 'Dashboard gérant V1' },
      { icon: '🚀', text: 'Onboarding restaurant' },
    ],
  },
]

// ─── Hero Section ──────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      style={{ background: '#18181B' }}
      className="relative overflow-hidden pt-28 pb-20"
    >
      {/* Dot grid background */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, #3F3F46 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-12 lg:gap-16 items-center">

          {/* Left column */}
          <div>
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}
            >
              <div style={{ width: 20, height: 1.5, background: '#E8920A', flexShrink: 0 }} />
              <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                Changelog
              </span>
            </m.div>

            <m.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: 'Inter, sans-serif', fontWeight: 900,
                fontSize: 'clamp(40px, 5.5vw, 70px)', lineHeight: 1.04,
                letterSpacing: '-0.04em', color: '#FAFAFA', marginBottom: 20,
              }}
            >
              Ce qu'on a<br />construit.
            </m.h1>

            <m.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: 'easeOut' }}
              style={{ color: '#71717A', fontSize: 17, lineHeight: 1.65, maxWidth: 420, marginBottom: 32 }}
            >
              Toutes les nouveautés Splitzy, dans l'ordre.{' '}
              <span style={{ color: '#A1A1AA' }}>On publie dès qu'on ship.</span>
            </m.p>

            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.26, ease: 'easeOut' }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                background: '#27272A', border: '1px solid #3F3F46',
                borderRadius: 99, padding: '7px 16px',
              }}
            >
              <m.span
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'block', width: 7, height: 7, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }}
              />
              <span style={{ color: '#D4D4D8', fontSize: 13, fontWeight: 500 }}>
                Dernière mise à jour : Mai 2026
              </span>
            </m.div>
          </div>

          {/* Right column — Latest release card */}
          <m.div
            initial={{ opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: '#1C1C1F', border: '1px solid #2D2D30',
              borderRadius: 20, padding: '28px 28px 24px',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div aria-hidden style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent 0%, #E8920A55 50%, transparent 100%)',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ background: '#FFF4E5', color: '#B8730A', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                  v0.9
                </span>
                <span style={{ color: '#71717A', fontSize: 13 }}>· Performance</span>
              </div>
              <span style={{ color: '#52525B', fontSize: 12 }}>Mai 2026</span>
            </div>

            <p style={{ color: '#F4F4F5', fontSize: 18, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: 22 }}>
              Chargement mobile<br />3× plus rapide
            </p>

            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: '#71717A', fontSize: 12 }}>Bundle size (gzip)</span>
                <span style={{ color: '#22C55E', fontSize: 12, fontWeight: 700 }}>–66%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                <span style={{ color: '#52525B', fontSize: 11, width: 34, flexShrink: 0 }}>Avant</span>
                <div style={{ flex: 1, height: 6, background: '#3F3F46', borderRadius: 3 }}>
                  <div style={{ width: '100%', height: '100%', background: '#52525B', borderRadius: 3 }} />
                </div>
                <span style={{ color: '#71717A', fontSize: 11, width: 38, textAlign: 'right' as const, flexShrink: 0 }}>400 kB</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#52525B', fontSize: 11, width: 34, flexShrink: 0 }}>Après</span>
                <div style={{ flex: 1, height: 6, background: '#3F3F46', borderRadius: 3, overflow: 'hidden' }}>
                  <m.div
                    initial={{ width: '100%' }}
                    animate={{ width: '33.5%' }}
                    transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: '100%', background: '#E8920A', borderRadius: 3 }}
                  />
                </div>
                <span style={{ color: '#E8920A', fontSize: 11, fontWeight: 700, width: 38, textAlign: 'right' as const, flexShrink: 0 }}>134 kB</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {['Lazy loading de toutes les routes', 'Framer Motion via LazyMotion', 'Clerk isolé du flow QR'].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ color: '#E8920A', fontSize: 12, flexShrink: 0, marginTop: 1 }}>⚡</span>
                  <span style={{ color: '#71717A', fontSize: 13, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #27272A', display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ color: '#52525B', fontSize: 12 }}>En production depuis Mai 2026</span>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  )
}

// ─── Timeline Section ──────────────────────────────────────────────────────────

function TimelineSection() {
  return (
    <section style={{ background: '#FAFAFA' }} className="py-20">
      <div className="max-w-4xl mx-auto px-6">
        <m.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ marginBottom: 48, display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <div style={{ width: 20, height: 1.5, background: '#E4E4E7' }} />
          <span style={{ color: '#A1A1AA', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
            Historique des versions
          </span>
        </m.div>

        <div style={{ position: 'relative' }}>
          <div aria-hidden className="hidden lg:block" style={{
            position: 'absolute', left: 128, top: 12, bottom: 40, width: 1,
            background: 'linear-gradient(to bottom, #E4E4E7 0%, #E4E4E7 80%, transparent 100%)',
          }} />

          {ENTRIES.map((entry, index) => {
            const cat = CATEGORY_CONFIG[entry.category] ?? CATEGORY_CONFIG['Performance']
            return (
              <m.div
                key={entry.version}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }}
                style={{ display: 'flex', alignItems: 'flex-start' }}
              >
                {/* Sidebar desktop */}
                <div className="hidden lg:flex" style={{
                  width: 128, flexShrink: 0, flexDirection: 'column' as const,
                  alignItems: 'flex-end', paddingRight: 28, paddingTop: 22, paddingBottom: 32,
                  gap: 5, position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', right: -5, top: 26, width: 10, height: 10,
                    borderRadius: '50%',
                    background: entry.isLatest ? '#E8920A' : '#D4D4D8',
                    border: `2.5px solid ${entry.isLatest ? '#FFF4E5' : '#FAFAFA'}`,
                    zIndex: 1,
                  }} />
                  <span style={{ color: entry.isLatest ? '#0A0A0A' : '#3F3F46', fontSize: 13, fontWeight: 700 }}>
                    {entry.version}
                  </span>
                  <span style={{ color: '#A1A1AA', fontSize: 12 }}>{entry.date}</span>
                </div>

                {/* Content */}
                <div
                  style={{ flex: 1, paddingLeft: 36, paddingBottom: index < ENTRIES.length - 1 ? 40 : 0 }}
                  className="lg:pl-10"
                >
                  <div className="flex items-center gap-2 mb-3 lg:hidden" style={{ color: '#A1A1AA', fontSize: 13 }}>
                    <span style={{ color: '#3F3F46', fontWeight: 700 }}>{entry.version}</span>
                    <span>·</span>
                    <span>{entry.date}</span>
                  </div>

                  <div style={{
                    background: '#FFFFFF', border: '1px solid #E4E4E7',
                    borderLeft: `3px solid ${cat.color}`,
                    borderRadius: '0 12px 12px 0', padding: '20px 22px 22px',
                  }}>
                    <div style={{ marginBottom: 10 }}>
                      <span style={{
                        background: cat.bg, color: cat.textColor,
                        fontSize: 10, fontWeight: 700, padding: '2px 9px',
                        borderRadius: 99, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
                      }}>
                        {entry.category}
                      </span>
                    </div>
                    <h3 style={{
                      fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 18,
                      lineHeight: 1.25, letterSpacing: '-0.025em', color: '#0A0A0A',
                      marginBottom: entry.description ? 8 : 14,
                    }}>
                      {entry.title}
                    </h3>
                    {entry.description && (
                      <p style={{ color: '#71717A', fontSize: 14, lineHeight: 1.6, marginBottom: 14, maxWidth: 500 }}>
                        {entry.description}
                      </p>
                    )}
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                      {entry.items.map((item, i) => (
                        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                          <span style={{ color: '#52525B', fontSize: 14, lineHeight: 1.5 }}>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </m.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── CTA Section ───────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section style={{ background: '#FAFAFA', paddingBottom: 96 }}>
      <div className="max-w-4xl mx-auto px-6">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            background: '#18181B', border: '1px solid #27272A',
            borderRadius: 20, padding: '40px',
            display: 'flex', flexDirection: 'column' as const,
            alignItems: 'flex-start', gap: 24,
          }}
          className="sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p style={{ color: '#FAFAFA', fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 6 }}>
              Splitzy évolue vite.
            </p>
            <p style={{ color: '#71717A', fontSize: 14, lineHeight: 1.55 }}>
              Commencez gratuitement — sans engagement, installation en 15 min.
            </p>
          </div>
          <a
            href="/pricing"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#E8920A', color: '#FFFFFF', fontSize: 14, fontWeight: 700,
              padding: '12px 24px', borderRadius: 10, textDecoration: 'none',
              whiteSpace: 'nowrap' as const, flexShrink: 0, transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#B8730A')}
            onMouseLeave={e => (e.currentTarget.style.background = '#E8920A')}
          >
            Commencer gratuitement <span aria-hidden>→</span>
          </a>
        </m.div>
      </div>
    </section>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ChangelogPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#18181B' }}>
      <Navbar />
      <HeroSection />
      <TimelineSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
