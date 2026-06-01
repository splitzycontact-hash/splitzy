import { m } from 'framer-motion'
import { fadeInUp } from './shared'
import {
  IconArrowRight, IconPlay, IconCheck, IconSparkles, IconQr,
} from './Icons'

function PhoneItemRow({
  emoji, name, desc, price, selected = false, dimmed = false,
}: {
  emoji: string; name: string; desc: string; price: string
  selected?: boolean; dimmed?: boolean
}) {
  return (
    <div className={'flex items-center gap-2.5 px-2.5 py-2 mx-1 mb-1 rounded-xl ' + (selected ? 'bg-orange-50' : '')}>
      <div className={'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[16px] ' + (selected ? 'bg-white' : 'bg-ink-50')}>
        {emoji}
      </div>
      <div className={'flex-1 min-w-0 ' + (dimmed ? 'opacity-50' : '')}>
        <p className="text-[12px] font-semibold text-ink-900 truncate">{name}</p>
        <p className="text-[10px] text-ink-500 truncate">{desc}</p>
      </div>
      <p className="shrink-0 text-[12px] font-bold text-ink-900 tabular-nums whitespace-nowrap">{price}</p>
      <div className={
        'shrink-0 w-5 h-5 rounded-md border flex items-center justify-center ' +
        (selected ? 'bg-orange-600 border-orange-600 text-white' : 'border-ink-200')
      }>
        {selected && <IconCheck size={13} stroke={2.4} />}
      </div>
    </div>
  )
}

function PhoneMockup() {
  return (
    <div
      className="relative mx-auto"
      style={{ width: 320, height: 660 }}
      aria-label="Aperçu de l'application Splitzy"
    >
      <div
        className="absolute inset-0 rounded-[48px] bg-ink-900"
        style={{
          boxShadow:
            '0 50px 100px -20px rgba(232, 146, 10, 0.35), ' +
            '0 30px 60px -30px rgba(0,0,0,0.6), ' +
            'inset 0 0 0 2px rgba(255,255,255,0.06)',
        }}
      />
      <div className="absolute inset-y-20 -left-[1px] w-[2px] bg-white/10 rounded-full" />
      <div className="absolute inset-y-20 -right-[1px] w-[2px] bg-white/10 rounded-full" />

      <div className="absolute inset-[10px] rounded-[40px] bg-white overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="h-11 px-7 flex items-center justify-between text-[13px] font-semibold text-ink-900">
          <span className="font-mono">9:41</span>
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-[110px] h-[28px] bg-ink-900 rounded-full" />
          <div className="flex items-center gap-1">
            <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden="true">
              <rect x="0" y="7" width="3" height="4" rx="0.5" />
              <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
              <rect x="9" y="3" width="3" height="8" rx="0.5" />
              <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
            </svg>
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none" aria-hidden="true">
              <path d="M1 5.5 A 7 7 0 0 1 13 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M3.5 7.5 A 4 4 0 0 1 10.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="7" cy="9.5" r="1" fill="currentColor" />
            </svg>
            <div className="ml-1 w-6 h-3 rounded-[3px] border border-ink-900/80 relative">
              <div className="absolute inset-[1.5px] right-[3px] bg-ink-900 rounded-[1px]" />
              <div className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-[1.5px] h-[5px] bg-ink-900/80 rounded-full" />
            </div>
          </div>
        </div>

        {/* Restaurant header */}
        <div className="px-5 pb-3 pt-2 bg-ink-900 text-white">
          <div className="flex items-center justify-between mb-2.5">
            <button type="button" className="flex items-center gap-1 text-white/60 text-[12px] font-medium">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Retour
            </button>
            <h1 className="text-white font-bold text-[13px]">Mes articles</h1>
            <div className="w-12" />
          </div>
          <div className="flex gap-1.5 overflow-hidden">
            <span className="shrink-0 px-2.5 py-1.5 rounded-full bg-orange-600 text-white text-[11px] font-semibold">🍽 Par article</span>
            <span className="shrink-0 px-2.5 py-1.5 rounded-full bg-white/10 text-white/70 text-[11px] font-semibold">⚖️ Parts égales</span>
            <span className="shrink-0 px-2.5 py-1.5 rounded-full bg-white/10 text-white/70 text-[11px] font-semibold">💶 Libre</span>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 px-3 pt-3 pb-3 bg-ink-50 overflow-hidden">
          <div className="bg-white rounded-2xl overflow-hidden mb-2">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="font-bold text-ink-900 text-[12px]">🍽 Plats</span>
              <span className="text-ink-300 text-[12px]">▲</span>
            </div>
            <PhoneItemRow emoji="🥩" name="Entrecôte" desc="Sauce béarnaise" price="24,00 €" selected />
            <PhoneItemRow emoji="🐟" name="Saumon mi-cuit" desc="Légumes du jour" price="22,00 €" />
            <PhoneItemRow emoji="🍝" name="Risotto cèpes" desc="Parmesan affiné" price="19,50 €" selected dimmed />
          </div>
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="font-bold text-ink-900 text-[12px]">🥗 Entrées</span>
              <span className="text-ink-300 text-[12px]">▼</span>
            </div>
          </div>
        </div>

        {/* Footer pay bar */}
        <div className="bg-white border-t border-ink-100 px-5 pt-3 pb-5">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">Ma part</p>
              <p className="text-[10px] text-ink-400">2 articles</p>
            </div>
            <span className="text-[20px] font-bold text-orange-600 tabular-nums">43,50&nbsp;€</span>
          </div>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center bg-orange-600 text-white font-semibold text-[14px] py-3 rounded-xl shadow-[0_8px_20px_-6px_rgba(232,146,10,0.55)]"
          >
            Payer ma part
          </button>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section
      id="hero"
      className="relative hero-dark pt-28 md:pt-32 pb-16 md:pb-24 overflow-hidden"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hero-grid" />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-[-160px] left-1/2 -translate-x-1/2 w-[680px] h-[680px] rounded-full opacity-50 animate-glow"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.32), transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-200px] right-[-100px] w-[480px] h-[480px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.18), transparent 70%)' }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 md:px-6">
        {/* Badge */}
        <m.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.05 } }}
        >
          <a
            href="#changelog"
            className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[12.5px] font-medium text-white/80 hover:bg-white/[0.07] hover:border-white/20 transition-colors backdrop-blur-sm whitespace-nowrap"
          >
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-600/20 text-orange-300 text-[11px] font-semibold uppercase tracking-wide">
              <IconSparkles size={11} stroke={2.2} />
              Nouveau
            </span>
            <span>Insights IA sur vos feedbacks — v1.1</span>
            <IconArrowRight size={13} className="text-white/40" />
          </a>
        </m.div>

        {/* H1 */}
        <m.div initial="hidden" animate="visible" custom={0.1} variants={fadeInUp}>
          <h1 className="mt-6 md:mt-8 text-center text-[36px] md:text-[56px] leading-[1.05] font-bold text-white max-w-3xl mx-auto text-balance">
            <span className="block">Fini les additions qui traînent.</span>
            <span className="block text-orange-500">Vos clients paient en 30 secondes.</span>
          </h1>
        </m.div>

        {/* Sous-titre */}
        <m.p
          className="mt-5 md:mt-6 text-center text-[16px] md:text-[18px] leading-[1.6] text-white/60 max-w-xl mx-auto"
          initial="hidden" animate="visible" custom={0.2} variants={fadeInUp}
        >
          Splitzy permet à vos convives de partager l'addition et payer leur part depuis leur téléphone. Sans app, sans friction.
        </m.p>

        {/* CTAs */}
        <m.div
          className="mt-7 md:mt-8"
          initial="hidden" animate="visible" custom={0.3} variants={fadeInUp}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <a
                href="/restaurant/onboarding"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 bg-orange-600 text-white font-medium text-[15px] px-6 py-3.5 rounded-xl shadow-lg shadow-orange-600/40 hover:bg-orange-700 hover:shadow-xl hover:shadow-orange-600/50 transition-colors"
              >
                Commencer gratuitement
                <IconArrowRight size={16} />
              </a>
            </m.div>
            <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <a
                href="/demo"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-white/[0.04] border border-white/15 text-white font-medium text-[15px] px-6 py-3.5 rounded-xl hover:bg-white/[0.08] hover:border-white/25 transition-colors backdrop-blur-sm"
              >
                <IconPlay size={13} />
                Voir la démo
              </a>
            </m.div>
          </div>
        </m.div>

        {/* Social proof */}
        <m.ul
          className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/40"
          initial="hidden" animate="visible" custom={0.4} variants={fadeInUp}
        >
          {['Gratuit pour commencer', 'Aucune carte requise', 'Configuré en 5 min'].map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <IconCheck size={14} stroke={2.4} className="text-orange-500" />
              {t}
            </li>
          ))}
        </m.ul>

        {/* Mockup */}
        <m.div
          className="mt-12 md:mt-16 flex justify-center"
          initial={{ opacity: 0, scale: 0.95, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }}
        >
          <div className="relative">
            {/* Notification card — desktop only */}
            <m.div
              className="hidden md:block absolute -right-24 top-16 z-10"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.5, delay: 1 } }}
            >
              <div className="flex items-center gap-3 bg-ink-800 rounded-2xl border border-white/10 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <IconCheck size={18} stroke={2.4} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Table 7 réglée</p>
                  <p className="text-[11px] text-white/50 tabular-nums">142,80 € · 4 convives</p>
                </div>
              </div>
            </m.div>

            {/* QR card — desktop only */}
            <m.div
              className="hidden md:block absolute -left-28 bottom-24 z-10"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, transition: { duration: 0.5, delay: 1.2 } }}
            >
              <div className="flex items-center gap-3 bg-ink-800 rounded-2xl border border-white/10 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <div className="w-9 h-9 rounded-lg bg-orange-600/20 flex items-center justify-center text-orange-400">
                  <IconQr size={20} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">Scan en cours</p>
                  <p className="text-[11px] text-white/50">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse-dot mr-1" />
                    Table 12 — en train de payer
                  </p>
                </div>
              </div>
            </m.div>

            <div className="md:rotate-[1deg]">
              <PhoneMockup />
            </div>
          </div>
        </m.div>
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink-900" />
    </section>
  )
}
