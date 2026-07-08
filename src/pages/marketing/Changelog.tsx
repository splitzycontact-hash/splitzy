import { Helmet } from 'react-helmet-async'
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
  IA:          { color: '#A855F7', bg: '#FAF5FF', textColor: '#7E22CE' },
  Interface:   { color: '#E8920A', bg: '#FFF4E5', textColor: '#B8730A' },
  Performance: { color: '#64748B', bg: '#F8FAFC', textColor: '#475569' },
  Dashboard:   { color: '#3B82F6', bg: '#EFF6FF', textColor: '#1D4ED8' },
  Équipe:      { color: '#EC4899', bg: '#FDF2F8', textColor: '#BE185D' },
  Mobile:      { color: '#8B5CF6', bg: '#F5F3FF', textColor: '#6D28D9' },
  Paiements:   { color: '#22C55E', bg: '#F0FDF4', textColor: '#15803D' },
  Lancement:   { color: '#FAFAFA', bg: '#27272A', textColor: '#FAFAFA' },
}

// Dates vérifiées sur l'historique git (GOAL_WEB_00) :
//   v1.4 — c527629 (06/07/2026) paiement fractionné v2, 86d603f (07/07/2026) verrou de mode
//   v1.3 — 5eecb80 (23/06/2026) plan de salle, M5/M11 (24/06/2026) VIP/force + clôture
//   v1.2 — 0723f36 (14/06/2026) planning, 745d561 (23/06/2026) chat, 96799c1 (24/06/2026) extras
const ENTRIES: ChangelogEntry[] = [
  {
    version: 'v1.4',
    category: 'Paiements',
    date: 'Juillet 2026',
    title: 'Paiement fractionné v2 + verrou de mode',
    description: "Le partage d'addition repensé de fond en comble — et un verrou qui empêche les convives de mélanger les modes de paiement sur une même table.",
    items: [
      { icon: '🔒', text: 'Verrou de mode : le premier paiement fixe le mode de partage pour toute la table' },
      { icon: '🧾', text: 'Partage d\'un article à 2, 3 ou 4 (÷2 ÷3 ÷4) en mode « par article »' },
      { icon: '📒', text: 'Grand livre des paiements : les montants restants sont toujours exacts, même à plusieurs' },
      { icon: '🔧', text: 'Libellés d\'état fiabilisés : « reste à payer » reflète les paiements réellement encaissés' },
    ],
    isLatest: true,
  },
  {
    version: 'v1.3',
    category: 'Dashboard',
    date: 'Juin 2026',
    title: 'Plan de salle interactif & clôture de service',
    description: 'Votre salle en temps réel, pilotable à distance — et un service qui se clôture tout seul.',
    items: [
      { icon: '🗺', text: 'Plan de salle en drag & drop, par zones, avec statuts de table en direct' },
      { icon: '⭐', text: 'Tables VIP, timer d\'inactivité, forcer le paiement QR ou clôturer une table à distance' },
      { icon: '🌙', text: 'Clôture de service : récap automatique (CA, couverts, pourboires) + export CSV' },
      { icon: '💶', text: 'Répartition des pourboires par serveur, rapport envoyé par email' },
    ],
  },
  {
    version: 'v1.2',
    category: 'Équipe',
    date: 'Juin 2026',
    title: 'Équipe : planning, extras & chat interne',
    description: "Toute la gestion d'équipe arrive dans Splitzy : shifts, renforts de dernière minute et communication avec la salle.",
    items: [
      { icon: '📅', text: 'Planning & shifts : vue calendrier, création en quelques clics, suivi de présence' },
      { icon: '🤝', text: 'Extras : répertoire, convocation par email en 1 clic, confirmation depuis le lien reçu' },
      { icon: '🏅', text: 'Pool de confiance : notez vos extras après chaque service' },
      { icon: '💬', text: 'Chat interne gérant ↔ salle : broadcast, messages directs, widget flottant' },
    ],
  },
  {
    version: 'v1.1',
    category: 'IA',
    date: 'Juin 2026',
    title: 'Insights IA sur vos feedbacks',
    description: "L'IA analyse vos feedbacks privés et détecte automatiquement les problèmes récurrents — avant qu'ils ne deviennent des avis Google.",
    items: [
      { icon: '🤖', text: "Détection automatique des thèmes récurrents (service, attente, cuisine…)" },
      { icon: '📊', text: 'Score de satisfaction calculé par service et par heure' },
      { icon: '💡', text: 'Suggestions d\'action concrètes basées sur les feedbacks' },
      { icon: '📬', text: 'Résumé IA hebdomadaire envoyé par email chaque lundi matin' },
    ],
  },
  {
    version: 'v1.0',
    category: 'Interface',
    date: 'Juin 2026',
    title: 'Interface gérant V2',
    description: 'Refonte complète du dashboard : CRM clients, page Réputation, Analytics avancés, gestion du menu et intégrations POS.',
    items: [
      { icon: '👥', text: 'CRM Clients — historique des visites, email, statut VIP/Régulier/Insatisfait' },
      { icon: '⭐', text: 'Page Réputation — suivi de note Google, feedbacks privés, interceptions' },
      { icon: '📈', text: 'Analytics — heatmap horaire, rotation des tables, satisfaction par service' },
      { icon: '🍽', text: 'Gestion du menu — ajout, modification, sync Square en un clic' },
      { icon: '🔌', text: 'Intégrations POS — sync du menu depuis Square, Lightspeed ou Tiller' },
    ],
  },
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
    category: 'Paiements',
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
  const latest = ENTRIES[0]
  const latestCat = CATEGORY_CONFIG[latest.category] ?? CATEGORY_CONFIG['Performance']
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
                Dernière mise à jour : {ENTRIES[0].date}
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
                <span style={{ background: latestCat.bg, color: latestCat.textColor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                  {latest.version}
                </span>
                <span style={{ color: '#71717A', fontSize: 13 }}>· {latest.category}</span>
              </div>
              <span style={{ color: '#52525B', fontSize: 12 }}>{latest.date}</span>
            </div>

            <p style={{ color: '#F4F4F5', fontSize: 18, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: 8 }}>
              {latest.title}
            </p>

            <p style={{ color: '#71717A', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              {latest.description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {latest.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <span style={{ color: '#71717A', fontSize: 13, lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #27272A', display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ color: '#52525B', fontSize: 12 }}>En production depuis {latest.date}</span>
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
              Demandez une démo — sans engagement, installation en 15 min.
            </p>
          </div>
          <a
            href="/contact"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#E8920A', color: '#FFFFFF', fontSize: 14, fontWeight: 700,
              padding: '12px 24px', borderRadius: 10, textDecoration: 'none',
              whiteSpace: 'nowrap' as const, flexShrink: 0, transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#B8730A')}
            onMouseLeave={e => (e.currentTarget.style.background = '#E8920A')}
          >
            Demander une démo <span aria-hidden>→</span>
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
      <Helmet>
        <title>Changelog — Splitzy</title>
        <meta name="description" content="Toutes les mises à jour de Splitzy : nouvelles fonctionnalités, améliorations et corrections. On itère vite, pour vous." />
      </Helmet>
      <Navbar />
      <HeroSection />
      <TimelineSection />
      <CtaSection />
      <Footer />
    </div>
  )
}
