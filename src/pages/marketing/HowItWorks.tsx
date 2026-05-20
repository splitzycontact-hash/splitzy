import { useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { fadeInUp, useFadeInView } from './shared'
import {
  IconMenuBook, IconQr, IconWallet,
  IconPhoneScan, IconTap, IconBolt,
} from './Icons'

type StepData = {
  Icon: React.ComponentType<{ size?: number; stroke?: number }>
  title: string
  desc: string
  chip: string
}

const STEPS: Record<string, StepData[]> = {
  restaurant: [
    { Icon: IconMenuBook, title: 'Configurez votre menu',    desc: 'Ajoutez vos plats et activez Splitzy en 5 minutes.', chip: 'Onboarding' },
    { Icon: IconQr,       title: 'Générez un QR code',      desc: 'Un QR unique par table, imprimé ou affiché sur écran.', chip: 'Sans contact' },
    { Icon: IconWallet,   title: 'Encaissez automatiquement', desc: 'Chaque convive paie sa part, vous recevez le total.', chip: 'Virement J+1' },
  ],
  client: [
    { Icon: IconPhoneScan, title: 'Scannez le QR code',          desc: "Avec l'appareil photo, aucune app à télécharger.", chip: '2 secondes' },
    { Icon: IconTap,       title: 'Sélectionnez vos plats',       desc: 'Choisissez ce que vous avez commandé.', chip: 'Sans erreur' },
    { Icon: IconBolt,      title: 'Payez en quelques secondes',   desc: 'CB, Apple Pay, Google Pay. C\'est réglé.', chip: '15 sec' },
  ],
}

function TabButton({
  active, onClick, children, id, controls,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; id: string; controls: string
}) {
  return (
    <button
      id={id}
      role="tab"
      type="button"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={
        'relative z-10 px-5 sm:px-6 py-2.5 text-[14px] sm:text-[15px] font-medium rounded-full transition-colors duration-200 ' +
        (active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800')
      }
    >
      {active && (
        <motion.span
          layoutId="hw-tab-pill"
          className="absolute inset-0 bg-white shadow-[0_2px_8px_-2px_rgba(24,24,27,0.12)] rounded-full"
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  )
}

function StepCard({ step, idx }: { step: StepData; idx: number }) {
  const { Icon: StepIcon, title, desc, chip } = step
  return (
    <motion.div variants={fadeInUp} className="relative group">
      <div className="relative h-full">
        <div className="relative bg-white border border-ink-100 rounded-2xl p-6 md:p-7 transition-all duration-200 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-600/5 hover:-translate-y-0.5 h-full flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-orange-600"
              style={{ background: 'linear-gradient(135deg, #FFF4E5 0%, #FFE4BF 100%)' }}
            >
              <StepIcon size={22} stroke={1.7} />
            </div>
            <span className="font-mono text-[12px] tracking-wider text-ink-200 font-medium">0{idx + 1}</span>
          </div>
          <h3 className="text-[19px] md:text-[20px] font-semibold text-ink-900 leading-snug">{title}</h3>
          <p className="mt-2 text-[15px] leading-[1.6] text-ink-500">{desc}</p>
          <div className="mt-5 pt-5 border-t border-dashed border-ink-200">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[11px] font-medium whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              {chip}
            </span>
          </div>
        </div>
        {idx < 2 && (
          <div aria-hidden="true" className="hidden md:flex absolute top-12 -right-4 z-10 w-8 h-8 items-center justify-center text-ink-200">
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <path d="M1 7h17m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function HowItWorks() {
  const [tab, setTab] = useState<'restaurant' | 'client'>('restaurant')
  const { ref, inView } = useFadeInView()
  const steps = STEPS[tab]

  return (
    <section
      id="comment-ca-marche"
      className="relative py-16 md:py-24 bg-ink-50"
      aria-labelledby="hw-heading"
    >
      <div ref={ref} className="max-w-6xl mx-auto px-4 md:px-6">
        <motion.div
          className="text-center"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.span
            variants={fadeInUp}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[11px] font-semibold uppercase tracking-[0.08em]"
          >
            Simple comme bonjour
          </motion.span>
          <motion.h2
            id="hw-heading"
            variants={fadeInUp}
            className="mt-5 text-[28px] md:text-[40px] font-bold text-ink-900 leading-[1.15] text-balance"
          >
            En 3 étapes, c'est réglé.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-4 text-[16px] md:text-[18px] text-ink-500 max-w-xl mx-auto leading-[1.6]"
          >
            Pour le restaurant comme pour le client. Aucune formation, aucune installation, aucun matériel.
          </motion.p>

          <LayoutGroup>
            <motion.div variants={fadeInUp} className="mt-8 inline-block">
              <div
                role="tablist"
                aria-label="Choisir le parcours"
                className="inline-flex items-center p-1 rounded-full bg-white border border-ink-100 shadow-sm"
              >
                <TabButton
                  id="hw-tab-restaurant"
                  controls="hw-panel-restaurant"
                  active={tab === 'restaurant'}
                  onClick={() => setTab('restaurant')}
                >
                  Pour le restaurant
                </TabButton>
                <TabButton
                  id="hw-tab-client"
                  controls="hw-panel-client"
                  active={tab === 'client'}
                  onClick={() => setTab('client')}
                >
                  Pour le client
                </TabButton>
              </div>
            </motion.div>
          </LayoutGroup>
        </motion.div>

        <div
          role="tabpanel"
          id={tab === 'restaurant' ? 'hw-panel-restaurant' : 'hw-panel-client'}
          aria-labelledby={tab === 'restaurant' ? 'hw-tab-restaurant' : 'hw-tab-client'}
          className="mt-10 md:mt-14"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
            >
              {steps.map((s, i) => (
                <StepCard key={`${tab}-${i}`} step={s} idx={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-10 md:mt-12 text-center text-[14px] text-ink-500">
          Vous êtes prêt en{' '}
          <span className="text-ink-900 font-semibold">5 minutes chrono</span>.{' '}
          <a href="/demo" className="text-orange-600 font-medium hover:text-orange-700">
            Voir une démo →
          </a>
        </p>
      </div>
    </section>
  )
}
