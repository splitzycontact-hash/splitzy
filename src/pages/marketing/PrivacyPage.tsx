import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { m } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

/* --- Petites icônes stroke (cohérentes avec le reste du site marketing) --- */
const ICONS: Record<string, ReactNode> = {
  shield: (
    <path d="M11 2L4 5v6c0 4.4 7 7 7 7s7-2.6 7-7V5l-7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  ),
  database: (
    <>
      <ellipse cx="11" cy="5" rx="7" ry="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 5v11c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 10.5c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  scale: (
    <>
      <path d="M11 3v15M5 18h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 6l-4 7h8l-4-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 6.5V11l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  user: (
    <>
      <circle cx="11" cy="7.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 18a6.5 6.5 0 0113 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  link: (
    <>
      <path d="M8 11a3 3 0 003 3l2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 9.5l2-2a3 3 0 014 4l-1.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 12.5l-2 2a3 3 0 01-4-4L8.5 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  flag: (
    <path d="M5 18V4m0 1.5h9l-2 3 2 3H5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
}

function SectionIcon({ name }: { name: string }) {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">{ICONS[name]}</svg>
    </div>
  )
}

/* Données collectées — donnée → finalité */
const DATA_ROWS = [
  {
    label: 'Prénom',
    purpose: 'Personnaliser votre expérience à table et identifier votre part de l’addition.',
  },
  {
    label: 'E-mail / Téléphone',
    purpose: 'Vous envoyer votre reçu et, uniquement avec votre consentement, les offres du restaurant.',
  },
  {
    label: 'Données de paiement',
    purpose: 'Traitées directement par notre prestataire de paiement (PSP) certifié. Jamais stockées par Splitzy.',
  },
]

/* Base légale — finalité → fondement */
const LEGAL_ROWS = [
  { use: 'Traitement du paiement', basis: 'Exécution du contrat' },
  { use: 'Offres & communications marketing', basis: 'Consentement explicite' },
]

const SUBPROCESSORS = [
  { name: 'Convex', role: 'Hébergement de la base de données' },
  { name: 'Vercel', role: 'Hébergement du site et de l’application' },
  { name: 'Prestataire de paiement (PSP)', role: 'Traitement sécurisé des paiements' },
]

/* Carte de section générique */
function Card({ icon, title, children, index }: { icon: string; title: string; children: ReactNode; index: number }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: Math.min(index, 3) * 0.04 }}
      className="rounded-2xl p-6 md:p-7"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-start gap-4">
        <SectionIcon name={icon} />
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-[18px] tracking-[-0.01em] mb-3">{title}</h2>
          {children}
        </div>
      </div>
    </m.div>
  )
}

const para = 'text-[14px] leading-[1.7]'

export function PrivacyPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#18181B' }}>
      <Helmet>
        <title>Politique de confidentialité — Splitzy</title>
        <meta
          name="description"
          content="Comment Splitzy collecte, utilise et protège vos données personnelles. Responsable du traitement, finalités, durée de conservation, vos droits RGPD et réclamation CNIL."
        />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-14">
        <div
          className="absolute pointer-events-none"
          style={{ top: -80, right: -80, width: 340, height: 340, background: 'radial-gradient(circle, rgba(232,146,10,0.18) 0%, transparent 60%)' }}
        />
        <div className="relative max-w-3xl mx-auto px-6">
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block text-[12px] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: '#E8920A' }}>
              Confidentialité
            </span>
            <h1 className="text-white font-extrabold tracking-[-0.03em]" style={{ fontSize: 'clamp(32px, 6vw, 48px)', lineHeight: 1.05 }}>
              Politique de confidentialité
            </h1>
            <p className="text-[15px] mt-5 leading-[1.65]" style={{ color: '#A1A1AA' }}>
              Votre vie privée compte. Voici, en clair, quelles données Splitzy traite, pourquoi, combien de temps, et quels droits vous gardez à tout moment.
            </p>
            <p className="text-[13px] mt-3" style={{ color: '#71717A' }}>
              Dernière mise à jour — juin 2026
            </p>
          </m.div>
        </div>
      </section>

      {/* Sections */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-6 space-y-4">

          {/* 1 — Responsable du traitement */}
          <Card icon="shield" title="Responsable du traitement" index={0}>
            <p className={para} style={{ color: '#A1A1AA' }}>
              Le responsable du traitement de vos données personnelles est{' '}
              <span className="text-white font-semibold">Splitzy</span>. Pour toute question relative à la protection de vos
              données, écrivez-nous à{' '}
              <a href="mailto:privacy@splitzy.fr" style={{ color: '#E8920A', fontWeight: 600 }}>privacy@splitzy.fr</a>.
            </p>
          </Card>

          {/* 2 — Données collectées & finalités */}
          <Card icon="database" title="Données collectées & finalités" index={1}>
            <p className={para + ' mb-4'} style={{ color: '#A1A1AA' }}>
              Nous ne collectons que le strict nécessaire, et toujours pour une finalité précise.
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {DATA_ROWS.map((r, i) => (
                <div
                  key={r.label}
                  className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4 p-4"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="text-white font-semibold text-[14px]">{r.label}</div>
                  <div className="text-[13.5px] leading-[1.6]" style={{ color: '#A1A1AA' }}>{r.purpose}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* 3 — Base légale */}
          <Card icon="scale" title="Base légale" index={2}>
            <p className={para + ' mb-4'} style={{ color: '#A1A1AA' }}>
              Chaque traitement repose sur un fondement juridique clair.
            </p>
            <div className="space-y-2.5">
              {LEGAL_ROWS.map((r) => (
                <div
                  key={r.use}
                  className="flex items-center justify-between gap-4 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="text-[13.5px] text-white/90">{r.use}</span>
                  <span
                    className="text-[12px] font-semibold whitespace-nowrap px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}
                  >
                    {r.basis}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* 4 — Durée de conservation */}
          <Card icon="clock" title="Durée de conservation" index={3}>
            <p className={para} style={{ color: '#A1A1AA' }}>
              Vos données personnelles sont conservées{' '}
              <span className="text-white font-semibold">3 ans à compter de votre dernière visite</span>, puis supprimées ou
              anonymisées. Vous pouvez en demander la suppression à tout moment, sans attendre ce délai.
            </p>
          </Card>

          {/* 5 — Vos droits */}
          <Card icon="user" title="Vos droits" index={4}>
            <p className={para + ' mb-3'} style={{ color: '#A1A1AA' }}>
              Conformément au RGPD, vous disposez à tout moment d’un droit d’<span className="text-white/90">accès</span>, de{' '}
              <span className="text-white/90">rectification</span>, de <span className="text-white/90">suppression</span> de vos
              données et de <span className="text-white/90">retrait de votre consentement</span>.
            </p>
            <p className={para} style={{ color: '#A1A1AA' }}>
              Pour exercer ces droits, écrivez à{' '}
              <a href="mailto:privacy@splitzy.fr" style={{ color: '#E8920A', fontWeight: 600 }}>privacy@splitzy.fr</a>. Le retrait
              du consentement met immédiatement fin à toute communication marketing.
            </p>
          </Card>

          {/* 6 — Sous-traitants */}
          <Card icon="link" title="Sous-traitants" index={5}>
            <p className={para + ' mb-4'} style={{ color: '#A1A1AA' }}>
              Pour fonctionner, Splitzy s’appuie sur des prestataires de confiance, chacun encadré par un contrat de
              sous-traitance conforme au RGPD.
            </p>
            <div className="grid sm:grid-cols-3 gap-2.5">
              {SUBPROCESSORS.map((s) => (
                <div
                  key={s.name}
                  className="rounded-xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="text-white font-semibold text-[13.5px] mb-1">{s.name}</div>
                  <div className="text-[12.5px] leading-[1.5]" style={{ color: '#A1A1AA' }}>{s.role}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* 7 — Réclamation CNIL */}
          <Card icon="flag" title="Réclamation auprès de la CNIL" index={6}>
            <p className={para} style={{ color: '#A1A1AA' }}>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission
              nationale de l’informatique et des libertés (CNIL) :{' '}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#E8920A', fontWeight: 600 }}
              >
                www.cnil.fr
              </a>
              .
            </p>
          </Card>

          {/* Contact — callout */}
          <div
            className="rounded-2xl p-6 flex items-start gap-4"
            style={{ background: 'rgba(232,146,10,0.08)', border: '1px solid rgba(232,146,10,0.25)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E8920A' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 6l7 4.5L17 6M3 5h14v10H3V5z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-[15px]">Une question sur vos données ?</div>
              <p className="text-[13.5px] mt-1 leading-[1.6]" style={{ color: '#A1A1AA' }}>
                Écrivez-nous à{' '}
                <a href="mailto:privacy@splitzy.fr" style={{ color: '#E8920A', fontWeight: 600 }}>privacy@splitzy.fr</a>
                . Nous répondons à toute demande RGPD sous 30 jours.
              </p>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  )
}
