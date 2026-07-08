import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { m } from 'framer-motion'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

/* --- Petites icônes stroke (cohérentes avec le reste du site marketing) --- */
const ICONS: Record<string, ReactNode> = {
  doc: (
    <>
      <path d="M6 2.5h6l4 4v13H6v-16.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 2.5V6.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  check: (
    <>
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 11l2.3 2.3L15 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h16" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  building: (
    <>
      <path d="M5 19V4h9v15" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 9h4v10M3 19h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 7.5h3M7.5 10.5h3M7.5 13.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="12" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 7h.01M6.5 15h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  scale: (
    <>
      <path d="M11 3v15M5 18h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 6l-4 7h8l-4-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
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

/* Identité de l'éditeur — clé → valeur */
const EDITOR_ROWS = [
  { label: 'Raison sociale', value: 'Splitzy SAS' },
  { label: 'Forme juridique', value: 'Société par actions simplifiée (SAS)' },
  { label: 'Siège social', value: 'Adresse en cours de finalisation' },
  { label: 'SIRET', value: 'En cours d’immatriculation' },
  { label: 'Directeur de la publication', value: 'Le représentant légal de Splitzy SAS' },
  { label: 'Contact', value: 'contact@splitzy.fr' },
]

/* Hébergeurs */
const HOSTS = [
  { name: 'Vercel Inc.', role: 'Hébergement du site et de l’application front-end.' },
  { name: 'Convex', role: 'Hébergement de la base de données et des fonctions back-end.' },
]

export default function LegalPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#18181B' }}>
      <Helmet>
        <title>Mentions légales & CGU — Splitzy</title>
        <meta
          name="description"
          content="Mentions légales et Conditions Générales d’Utilisation de Splitzy : éditeur, hébergeur, objet du service de paiement en table et règles d’utilisation."
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
              Informations légales
            </span>
            <h1 className="text-white font-extrabold tracking-[-0.03em]" style={{ fontSize: 'clamp(32px, 6vw, 48px)', lineHeight: 1.05 }}>
              Mentions légales & CGU
            </h1>
            <p className="text-[15px] mt-5 leading-[1.65]" style={{ color: '#A1A1AA' }}>
              Les informations légales relatives à Splitzy et les conditions générales d’utilisation de notre service de paiement et de partage d’addition en restaurant.
            </p>
            <p className="text-[13px] mt-3" style={{ color: '#71717A' }}>
              Dernière mise à jour — juillet 2026
            </p>
          </m.div>
        </div>
      </section>

      {/* Sections */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-6 space-y-4">

          {/* Titre — CGU */}
          <m.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="text-white font-extrabold text-[20px] tracking-[-0.02em] pt-4 pb-1"
          >
            Conditions Générales d’Utilisation
          </m.h2>

          {/* 1 — Objet */}
          <Card icon="doc" title="Objet" index={0}>
            <p className={para} style={{ color: '#A1A1AA' }}>
              Splitzy propose un service permettant aux clients d’un restaurant de{' '}
              <span className="text-white font-semibold">consulter leur addition, la partager entre convives et régler leur part</span>{' '}
              directement depuis leur téléphone, après avoir scanné un QR code à table. Les présentes conditions régissent
              l’utilisation de ce service par les convives comme par les restaurants partenaires.
            </p>
          </Card>

          {/* 2 — Acceptation & utilisation conforme */}
          <Card icon="check" title="Acceptation & utilisation conforme" index={1}>
            <p className={para + ' mb-3'} style={{ color: '#A1A1AA' }}>
              L’accès au service vaut acceptation pleine et entière des présentes conditions. L’utilisateur s’engage à un usage{' '}
              <span className="text-white/90">loyal, personnel et conforme à la loi française</span>.
            </p>
            <p className={para} style={{ color: '#A1A1AA' }}>
              Sont notamment interdits : toute tentative d’accès frauduleux, de perturbation du service, de contournement des
              mécanismes de paiement ou d’usurpation d’identité. Splitzy se réserve le droit de suspendre tout accès en cas de
              manquement.
            </p>
          </Card>

          {/* 3 — Paiement */}
          <Card icon="card" title="Paiement" index={2}>
            <p className={para} style={{ color: '#A1A1AA' }}>
              Les paiements sont traités par un{' '}
              <span className="text-white font-semibold">prestataire de services de paiement (PSP) agréé</span>. Splitzy ne stocke
              jamais les données de carte bancaire. Le montant réglé correspond à la part choisie par le convive, augmentée le cas
              échéant du pourboire librement fixé. Un justificatif de paiement est mis à disposition à l’issue de la transaction.
            </p>
          </Card>

          {/* 4 — Responsabilité */}
          <Card icon="scale" title="Responsabilité & droit applicable" index={3}>
            <p className={para + ' mb-3'} style={{ color: '#A1A1AA' }}>
              Splitzy met en œuvre les moyens raisonnables pour assurer la disponibilité et la sécurité du service, sans garantie
              d’absence totale d’interruption. La relation commerciale liée au repas relève du restaurant ; Splitzy agit comme
              intermédiaire technique de paiement.
            </p>
            <p className={para} style={{ color: '#A1A1AA' }}>
              Les présentes conditions sont régies par le{' '}
              <span className="text-white/90">droit français</span>. À défaut de résolution amiable, tout litige relève de la
              compétence des tribunaux français.
            </p>
          </Card>

          {/* Titre — Mentions légales */}
          <m.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="text-white font-extrabold text-[20px] tracking-[-0.02em] pt-8 pb-1"
          >
            Mentions légales
          </m.h2>

          {/* 5 — Éditeur */}
          <Card icon="building" title="Éditeur du site" index={0}>
            <p className={para + ' mb-4'} style={{ color: '#A1A1AA' }}>
              Le présent site et l’application Splitzy sont édités par :
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {EDITOR_ROWS.map((r, i) => (
                <div
                  key={r.label}
                  className="grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-1 sm:gap-4 p-4"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <div className="text-white font-semibold text-[14px]">{r.label}</div>
                  <div className="text-[13.5px] leading-[1.6]" style={{ color: '#A1A1AA' }}>{r.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* 6 — Hébergement */}
          <Card icon="server" title="Hébergement" index={1}>
            <p className={para + ' mb-4'} style={{ color: '#A1A1AA' }}>
              Le site et ses données sont hébergés par des prestataires de confiance :
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {HOSTS.map((h) => (
                <div
                  key={h.name}
                  className="rounded-xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="text-white font-semibold text-[13.5px] mb-1">{h.name}</div>
                  <div className="text-[12.5px] leading-[1.5]" style={{ color: '#A1A1AA' }}>{h.role}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* 7 — Propriété intellectuelle */}
          <Card icon="doc" title="Propriété intellectuelle" index={2}>
            <p className={para} style={{ color: '#A1A1AA' }}>
              L’ensemble des éléments du site (marque, logo, textes, interfaces, code) est la propriété exclusive de Splitzy SAS ou
              de ses partenaires. Toute reproduction ou exploitation non autorisée est interdite.
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
              <div className="text-white font-bold text-[15px]">Une question d’ordre juridique ?</div>
              <p className="text-[13.5px] mt-1 leading-[1.6]" style={{ color: '#A1A1AA' }}>
                Écrivez-nous à{' '}
                <a href="mailto:contact@splitzy.fr" style={{ color: '#E8920A', fontWeight: 600 }}>contact@splitzy.fr</a>
                . Pour les demandes relatives à vos données personnelles, consultez notre{' '}
                <a href="/privacy" style={{ color: '#E8920A', fontWeight: 600 }}>politique de confidentialité</a>.
              </p>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  )
}
