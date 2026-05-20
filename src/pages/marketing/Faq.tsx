import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, useFadeInView } from './shared'
import { IconPlus, IconMinus } from './Icons'

const FAQ_ITEMS = [
  {
    q: "Est-ce que mes clients doivent télécharger une app ?",
    a: "Non. Splitzy fonctionne directement dans le navigateur du téléphone. Vos convives scannent le QR code et accèdent à leur addition en 2 secondes — aucune installation, aucune inscription.",
  },
  {
    q: "Comment intégrer Splitzy à ma caisse ?",
    a: "Splitzy est compatible avec Lightspeed, Tiller, Sumup et la plupart des caisses françaises. Pour les autres, l'addition peut être saisie manuellement en 30 secondes ou importée via QR de votre TPE.",
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "Apple Pay, Google Pay, carte bancaire (Visa, Mastercard, CB) et virement instantané. Les paiements sont traités par notre partenaire Stripe, certifié PCI DSS niveau 1.",
  },
  {
    q: "Et si un client ne veut pas payer avec son téléphone ?",
    a: "Aucun problème. Splitzy coexiste avec votre encaissement habituel — espèces, chèque, TPE. Vous voyez en temps réel ce qui a été payé via l'app et ce qui reste à encaisser autrement.",
  },
  {
    q: "Comment sont sécurisés les paiements ?",
    a: "Toutes les transactions sont chiffrées en TLS 1.3 et passent par Stripe. Splitzy ne stocke aucune donnée bancaire. Conformité PCI DSS niveau 1 et RGPD.",
  },
  {
    q: "Puis-je tester gratuitement ?",
    a: "Oui. Le plan Gratuit inclut jusqu'à 50 règlements par mois, sans carte requise. L'essai Pro de 14 jours débloque les règlements illimités et le support prioritaire.",
  },
  {
    q: "Est-ce que ça fonctionne pour les grandes tables ?",
    a: "Splitzy gère sans souci des tables jusqu'à 30 convives. Chaque personne sélectionne ses plats indépendamment, ou choisit le mode parts égales / montant libre.",
  },
  {
    q: "Quel support proposez-vous ?",
    a: "Support par email pour tous, sous 24h. Plan Pro : chat live 7j/7 et hotline téléphonique de 9h à minuit. Plan Entreprise : ligne directe avec un account manager dédié.",
  },
]

function FaqItem({ item, isOpen, onToggle, id }: {
  item: typeof FAQ_ITEMS[number]; isOpen: boolean; onToggle: () => void; id: number
}) {
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`faq-panel-${id}`}
          id={`faq-trigger-${id}`}
          className="w-full flex items-center justify-between gap-6 text-left py-5 md:py-6 group"
        >
          <span className={
            'text-[16px] md:text-[18px] font-medium leading-snug transition-colors ' +
            (isOpen ? 'text-white' : 'text-white/85 group-hover:text-white')
          }>
            {item.q}
          </span>
          <span
            aria-hidden="true"
            className={
              'shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 ' +
              (isOpen
                ? 'bg-orange-600 text-white rotate-180'
                : 'bg-white/[0.06] text-white/70 group-hover:bg-white/10')
            }
          >
            {isOpen ? <IconMinus size={16} stroke={2.4} /> : <IconPlus size={16} stroke={2.4} />}
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-panel-${id}`}
            role="region"
            aria-labelledby={`faq-trigger-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
            className="overflow-hidden"
          >
            <p className="pb-5 md:pb-6 pr-12 text-[15px] leading-[1.65] text-white/60">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Faq() {
  const { ref, inView } = useFadeInView()
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <section
      id="faq"
      className="relative py-16 md:py-24 bg-ink-900 overflow-hidden"
      aria-labelledby="faq-heading"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-0 w-[400px] h-[400px] opacity-30"
        style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.18), transparent 70%)' }}
      />

      <div ref={ref} className="relative max-w-3xl mx-auto px-4 md:px-6">
        <motion.div
          className="text-center"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }}
        >
          <motion.span
            variants={fadeInUp}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/70 text-[11px] font-semibold uppercase tracking-[0.08em]"
          >
            Questions fréquentes
          </motion.span>
          <motion.h2
            id="faq-heading"
            variants={fadeInUp}
            className="mt-5 text-[28px] md:text-[40px] font-bold text-white leading-[1.15] text-balance"
          >
            On a déjà répondu.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-4 text-[16px] md:text-[17px] text-white/55 max-w-xl mx-auto leading-[1.6]"
          >
            Une question qui n'est pas dans la liste ? Écrivez-nous,{' '}
            <a
              href="mailto:contact@splitzy.fr"
              className="text-orange-400 hover:text-orange-300 underline-offset-4 hover:underline"
            >
              on répond sous 24h
            </a>
            .
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-10 md:mt-12 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm px-5 md:px-7"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } } : {}}
        >
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem
              key={i}
              id={i}
              item={item}
              isOpen={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
