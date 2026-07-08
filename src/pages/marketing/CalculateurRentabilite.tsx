import { useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { IconArrowRight } from './Icons'
import { httpMutation } from '../../utils/convexHttp'

// GOAL_WEB_07 — Diagnostic de rentabilité (lead magnet).
//
// RÈGLE ABSOLUE : le résultat est toujours présenté comme une ESTIMATION basée
// sur une hypothèse sectorielle générique — jamais comme une analyse des vraies
// données du restaurant, jamais adossé à une étude inventée.
//
// Les constantes ci-dessous sont le MIROIR de convex/leads.ts (le serveur
// recalcule l'écart dans submitLead — la valeur du teaser n'est jamais
// persistée telle quelle).

const REFERENCE_FOOD_COST_PERCENT = 29

const REVENUE_RANGES = [
  { id: 'lt15k',   label: 'Moins de 15 000 €',  midpointEuros: 10_000 },
  { id: '15k-30k', label: '15 000 – 30 000 €',  midpointEuros: 22_500 },
  { id: '30k-50k', label: '30 000 – 50 000 €',  midpointEuros: 40_000 },
  { id: '50k-80k', label: '50 000 – 80 000 €',  midpointEuros: 65_000 },
  { id: 'gt80k',   label: 'Plus de 80 000 €',   midpointEuros: 100_000 },
] as const

const RESTAURANT_TYPES = [
  { id: 'traditionnel',  label: 'Traditionnel',    emoji: '🍽️' },
  { id: 'brasserie',     label: 'Brasserie / Bistrot', emoji: '🍺' },
  { id: 'fast_food',     label: 'Fast-food / Snack',   emoji: '🥪' },
  { id: 'gastronomique', label: 'Gastronomique',   emoji: '⭐' },
  { id: 'bar_cafe',      label: 'Bar / Café',      emoji: '☕' },
  { id: 'autre',         label: 'Autre',           emoji: '🏪' },
] as const

const FOOD_COST_OPTIONS = [
  { value: 22, label: '≈ 22 %' },
  { value: 25, label: '≈ 25 %' },
  { value: 28, label: '≈ 28 %' },
  { value: 31, label: '≈ 31 %' },
  { value: 34, label: '≈ 34 %' },
  { value: 37, label: '37 % ou plus' },
] as const

const LEVERS = [
  {
    n: '01',
    title: 'La marge par plat, pas la marge moyenne',
    body: "La moyenne cache tout : une carte peut afficher un coût matière global correct alors que quelques plats très vendus se vendent presque à perte. Calculez la marge brute (prix de vente − coût matière) de vos 5 plats les plus commandés — c'est souvent là que se joue l'essentiel de l'écart.",
  },
  {
    n: '02',
    title: 'Les seuils de prix psychologiques',
    body: "Entre 12,50 € et 12,90 €, la plupart des clients ne voient pas de différence — votre marge, si. Sur les plats à forte rotation, remonter le prix juste sous le seuil psychologique suivant se répercute presque intégralement en marge. À tester sur 2 ou 3 plats, pas sur toute la carte d'un coup.",
  },
  {
    n: '03',
    title: 'Le mix de vente',
    body: "Le plat le plus vendu n'est pas forcément le plus rentable. Mettre en avant les plats à forte marge — position sur la carte, suggestion du serveur, plat du jour — déplace le mix de vente sans toucher ni aux prix ni aux portions. C'est le levier le plus rapide à activer.",
  },
]

const fmtEur = (n: number) => `${Math.abs(n).toLocaleString('fr-FR')} €`

function IcLock({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}
function IcCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
function IcInfo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}

function Spinner() {
  return (
    <m.span
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
      className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
    />
  )
}

function QuestionLabel({ step, children }: { step: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-[15px] font-bold text-ink-900 tracking-tight">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[11px] font-extrabold shrink-0">
        {step}
      </span>
      {children}
    </p>
  )
}

function chipCls(selected: boolean) {
  return `min-h-[44px] px-3.5 py-2.5 rounded-xl border-[1.5px] text-[13.5px] font-semibold cursor-pointer transition-all text-left ${
    selected
      ? 'border-orange-600 bg-orange-50 text-ink-900 shadow-[0_0_0_3px_rgba(232,146,10,0.12)]'
      : 'border-[#E4E4E7] bg-white text-ink-500 hover:border-ink-300 hover:text-ink-900'
  }`
}

export function CalculateurRentabilite() {
  const [step, setStep] = useState<1 | 2>(1)
  const [type, setType] = useState<string | null>(null)
  const [rangeId, setRangeId] = useState<string | null>(null)
  const [foodCost, setFoodCost] = useState<number | null>(null)

  const [email, setEmail] = useState('')
  const [unlock, setUnlock] = useState<'locked' | 'sending' | 'unlocked'>('locked')
  const [unlockError, setUnlockError] = useState<string | null>(null)

  const range = REVENUE_RANGES.find((r) => r.id === rangeId) ?? null
  const canCompute = type !== null && range !== null && foodCost !== null
  // Miroir du calcul serveur (convex/leads.ts) — le teaser s'affiche sans email.
  const gapEuros = canCompute
    ? Math.round((range!.midpointEuros * (foodCost! - REFERENCE_FOOD_COST_PERCENT)) / 100)
    : 0
  const deltaPoints = canCompute ? foodCost! - REFERENCE_FOOD_COST_PERCENT : 0

  async function submitEmail(ev: React.FormEvent) {
    ev.preventDefault()
    if (unlock !== 'locked') return
    if (!email.match(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i)) {
      setUnlockError('Email invalide')
      return
    }
    setUnlockError(null)
    setUnlock('sending')
    try {
      await httpMutation('leads:submitLead', {
        email: email.trim(),
        restaurantType: type,
        monthlyRevenueRange: rangeId,
        foodCostPercent: foodCost,
      })
      setUnlock('unlocked')
    } catch (err) {
      setUnlock('locked')
      setUnlockError(err instanceof Error && err.message.includes('déjà')
        ? "Une estimation a déjà été envoyée pour cet email aujourd'hui."
        : "L'envoi a échoué. Vérifiez votre connexion et réessayez.")
    }
  }

  function restart() {
    setStep(1)
    setUnlock('locked')
    setUnlockError(null)
    setEmail('')
  }

  return (
    <div className="marketing-site w-full min-h-screen bg-white">
      <Helmet>
        <title>Diagnostic de rentabilité — estimation gratuite pour votre restaurant | Splitzy</title>
        <meta
          name="description"
          content="Estimez en 30 secondes l'écart entre votre coût matière et une référence sectorielle, en euros par mois. Outil gratuit, sans inscription — une estimation générique, pas un audit."
        />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <section className="relative bg-ink-900 text-white overflow-hidden pt-24 pb-14 md:pt-28 md:pb-16 px-4 md:px-6">
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 16px)' }} />
        <div className="absolute -top-[100px] -right-[80px] w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,146,10,0.22) 0%, transparent 60%)' }} />
        <div className="max-w-3xl mx-auto relative text-center">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-600/10 text-orange-400 text-[11.5px] font-bold tracking-widest uppercase mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgba(232,146,10,0.22)]" />
            Outil gratuit
          </span>
          <h1 className="text-[34px] md:text-[52px] font-extrabold tracking-[-0.03em] leading-[1.05] mb-4 font-display">
            Diagnostic de <span className="text-orange-500">rentabilité</span>
          </h1>
          <p className="text-[15px] md:text-[17px] text-white/60 max-w-[540px] mx-auto leading-relaxed">
            Trois questions, trente secondes : estimez l'écart entre votre coût matière
            et une référence sectorielle, en euros par mois. Sans inscription.
          </p>
          <p className="mt-4 text-[12.5px] text-white/40 max-w-[480px] mx-auto leading-relaxed">
            Estimation générique basée sur des moyennes de secteur — pas une analyse
            de vos données réelles.
          </p>
        </div>
      </section>

      {/* Calculateur */}
      <section className="bg-[#FAFAFA] py-12 md:py-16 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <m.div
                key="step1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
                className="bg-white border border-[#E4E4E7] rounded-3xl p-6 md:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.02),0_12px_32px_-16px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-col gap-7">
                  <div className="flex flex-col gap-3">
                    <QuestionLabel step="1">Votre type d'établissement</QuestionLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {RESTAURANT_TYPES.map((t) => (
                        <button key={t.id} type="button" onClick={() => setType(t.id)} className={chipCls(type === t.id)}>
                          <span className="mr-1.5">{t.emoji}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <QuestionLabel step="2">Votre chiffre d'affaires mensuel (TTC)</QuestionLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {REVENUE_RANGES.map((r) => (
                        <button key={r.id} type="button" onClick={() => setRangeId(r.id)} className={chipCls(rangeId === r.id)}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <QuestionLabel step="3">Votre coût matière estimé</QuestionLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {FOOD_COST_OPTIONS.map((o) => (
                        <button key={o.value} type="button" onClick={() => setFoodCost(o.value)} className={chipCls(foodCost === o.value)}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[12px] text-ink-400 leading-relaxed">
                      Part de vos achats alimentaires et boissons dans le chiffre d'affaires.
                      Une valeur approximative suffit.
                    </p>
                  </div>

                  <div>
                    <m.button
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      disabled={!canCompute}
                      onClick={() => setStep(2)}
                      className={`w-full h-[52px] rounded-xl border-0 text-white text-[15px] font-bold tracking-tight flex items-center justify-center gap-2 transition-colors shadow-[0_10px_24px_-8px_rgba(232,146,10,0.45),inset_0_0_0_1px_rgba(255,255,255,0.12)] ${
                        canCompute ? 'bg-orange-600 hover:bg-orange-700 cursor-pointer' : 'bg-ink-300 cursor-default shadow-none'
                      }`}
                    >
                      Voir mon estimation
                      <IconArrowRight size={16} />
                    </m.button>
                    <p className="mt-2.5 text-[11.5px] text-ink-400 text-center">
                      Aucun email requis pour voir le résultat.
                    </p>
                  </div>
                </div>
              </m.div>
            ) : (
              <m.div
                key="step2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-5"
              >
                {/* Teaser — visible sans email */}
                <div className="bg-ink-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute -top-[80px] -right-[60px] w-[280px] h-[280px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,146,10,0.2) 0%, transparent 60%)' }} />
                  <div className="relative">
                    <p className="text-[11.5px] font-bold tracking-widest uppercase text-orange-400 mb-3">
                      Votre estimation
                    </p>
                    {gapEuros > 0 ? (
                      <>
                        <p className="text-[38px] md:text-[52px] font-extrabold tracking-[-0.03em] leading-none tabular-nums">
                          ≈ {fmtEur(gapEuros)}
                          <span className="text-[17px] md:text-[20px] font-bold text-white/50"> / mois</span>
                        </p>
                        <p className="mt-4 text-[14px] md:text-[15px] text-white/70 leading-relaxed max-w-[460px]">
                          C'est l'écart estimé entre votre coût matière déclaré ({foodCost}&nbsp;%)
                          et une référence sectorielle de {REFERENCE_FOOD_COST_PERCENT}&nbsp;%, soit{' '}
                          {deltaPoints}&nbsp;point{deltaPoints > 1 ? 's' : ''} d'écart appliqué
                          au milieu de votre tranche de chiffre d'affaires.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[28px] md:text-[36px] font-extrabold tracking-[-0.02em] leading-tight">
                          Sous la référence sectorielle&nbsp;✓
                        </p>
                        <p className="mt-4 text-[14px] md:text-[15px] text-white/70 leading-relaxed max-w-[460px]">
                          Votre coût matière déclaré ({foodCost}&nbsp;%) est au niveau ou en dessous
                          de la référence sectorielle de {REFERENCE_FOOD_COST_PERCENT}&nbsp;%
                          {gapEuros < 0 && (
                            <> — soit environ {fmtEur(gapEuros)}/mois d'avance sur cette base</>
                          )}.
                          Les leviers ci-dessous restent utiles pour protéger cette marge.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Disclaimer honnêteté — toujours visible */}
                <div className="flex items-start gap-3 bg-white border border-[#E4E4E7] rounded-2xl p-4">
                  <IcInfo className="w-[18px] h-[18px] text-ink-400 shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-ink-500 leading-relaxed">
                    <strong className="text-ink-900 font-semibold">Ceci est une estimation, pas un audit.</strong>{' '}
                    Le calcul repose sur une hypothèse de coût matière de référence de{' '}
                    {REFERENCE_FOOD_COST_PERCENT}&nbsp;% — un ordre de grandeur courant en
                    restauration, pas une statistique officielle — appliquée au milieu de votre
                    tranche de CA. Il n'analyse aucune donnée réelle de votre établissement.
                  </p>
                </div>

                {/* Bloc leviers — gaté par email */}
                {unlock !== 'unlocked' ? (
                  <div className="bg-white border border-[#E4E4E7] rounded-3xl overflow-hidden">
                    {/* Aperçu flouté */}
                    <div className="relative px-6 md:px-8 pt-6">
                      <div aria-hidden="true" className="select-none pointer-events-none blur-[7px] opacity-60">
                        {LEVERS.slice(0, 2).map((l) => (
                          <div key={l.n} className="py-3">
                            <p className="text-[15px] font-bold text-ink-900">{l.n} — {l.title}</p>
                            <p className="mt-1 text-[13px] text-ink-500 leading-relaxed">{l.body.slice(0, 110)}…</p>
                          </div>
                        ))}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white" />
                    </div>
                    <div className="relative px-6 md:px-8 pb-6 md:pb-8 -mt-6">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 text-orange-600">
                          <IcLock className="w-4 h-4" />
                        </span>
                        <h2 className="text-[18px] md:text-[20px] font-extrabold text-ink-900 tracking-tight">
                          Les 3 leviers concrets pour agir sur cet écart
                        </h2>
                      </div>
                      <p className="text-[13px] text-ink-500 leading-relaxed mb-4">
                        Marge par plat, seuils de prix, mix de vente : trois pratiques concrètes,
                        applicables dès cette semaine. Laissez votre email pour les débloquer.
                      </p>
                      <form onSubmit={submitEmail} className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="vous@votre-restaurant.fr"
                          className={`flex-1 h-12 px-3.5 rounded-xl border-[1.5px] bg-white text-ink-900 text-[14px] font-medium outline-none transition-all placeholder:text-ink-400 focus:border-orange-600 focus:shadow-[0_0_0_3px_rgba(232,146,10,0.15)] ${unlockError ? 'border-red-500' : 'border-[#E4E4E7]'}`}
                          style={{ fontSize: 16 }}
                        />
                        <m.button
                          type="submit"
                          whileTap={{ scale: 0.985 }}
                          disabled={unlock === 'sending'}
                          className="h-12 px-5 rounded-xl border-0 bg-orange-600 hover:bg-orange-700 text-white text-[14px] font-bold tracking-tight cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:cursor-default shrink-0"
                        >
                          {unlock === 'sending' ? <Spinner /> : <IcLock className="w-3.5 h-3.5" />}
                          Débloquer les 3 leviers
                        </m.button>
                      </form>
                      {unlockError && <p className="mt-2 text-[12px] text-red-500">{unlockError}</p>}
                      <p className="mt-2.5 text-[11.5px] text-ink-400 leading-relaxed">
                        Votre email sert à vous envoyer ce contenu et, éventuellement, à vous
                        proposer une démo. Pas de newsletter automatique.{' '}
                        <Link to="/privacy" className="text-orange-600 underline">Confidentialité</Link>
                      </p>
                    </div>
                  </div>
                ) : (
                  <m.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col gap-5"
                  >
                    <div className="bg-white border border-[#E4E4E7] rounded-3xl p-6 md:p-8">
                      <div className="flex items-center gap-2.5 mb-6">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600">
                          <IcCheck className="w-4 h-4" />
                        </span>
                        <h2 className="text-[18px] md:text-[20px] font-extrabold text-ink-900 tracking-tight">
                          Les 3 leviers concrets
                        </h2>
                      </div>
                      <div className="flex flex-col gap-6">
                        {LEVERS.map((l) => (
                          <div key={l.n} className="flex gap-4">
                            <span className="shrink-0 font-mono text-[13px] font-bold text-orange-600 pt-0.5">{l.n}</span>
                            <div>
                              <h3 className="text-[15.5px] font-bold text-ink-900 tracking-tight">{l.title}</h3>
                              <p className="mt-1.5 text-[13.5px] text-ink-500 leading-relaxed">{l.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA démo — transition honnête */}
                    <div className="bg-ink-900 text-white rounded-3xl p-6 md:p-8 relative overflow-hidden">
                      <div className="absolute -bottom-[80px] -left-[60px] w-[260px] h-[260px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(232,146,10,0.15) 0%, transparent 60%)' }} />
                      <div className="relative">
                        <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight leading-snug font-display">
                          Passer de l'estimation au réel
                        </h2>
                        <p className="mt-2.5 text-[13.5px] md:text-[14px] text-white/60 leading-relaxed max-w-[460px]">
                          Ce calculateur reste une estimation générique. Splitzy, lui, se branche
                          sur votre caisse et analyse vos vraies données en temps réel — CA, marges,
                          mix de vente, plat par plat.
                        </p>
                        <Link
                          to="/contact"
                          onClick={() => window.scrollTo(0, 0)}
                          className="mt-5 inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[14.5px] font-bold tracking-tight transition-colors no-underline"
                        >
                          Réserver une démo
                          <IconArrowRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </m.div>
                )}

                <button
                  type="button"
                  onClick={restart}
                  className="self-center text-[13px] font-medium text-ink-400 hover:text-ink-900 transition-colors bg-transparent border-0 cursor-pointer py-2"
                >
                  ← Modifier mes réponses
                </button>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
    </div>
  )
}
