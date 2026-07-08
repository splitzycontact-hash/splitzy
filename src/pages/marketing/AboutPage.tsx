import { Helmet } from 'react-helmet-async'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

const TIMELINE = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6"/><path d="M10 22h4"/>
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
      </svg>
    ),
    date: 'Mars 2025',
    step: '01',
    label: 'Identification du problème',
    title: "L'idée",
    desc: "Discussion sur une terrasse parisienne. Un ami restaurateur raconte sa note Google qui dégringole. La conversation devient un Notion, puis un cahier des charges.",
    featured: false,
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    ),
    date: 'Juin 2025',
    step: '02',
    label: 'Validation marché',
    title: 'NEOMA Incubator',
    desc: "Splitzy est sélectionné par NEOMA Incubator. Trois mois de mentorat et de tests terrain avec des restaurants pilotes à Paris.",
    featured: true,
  },
  // HIDDEN — carte "240+ restaurants" fictive
  // { date: "Aujourd'hui", step: '03', label: 'En production', title: '240+ restaurants',
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
      </svg>
    ),
    date: 'Juin 2026',
    step: '03',
    label: 'Extension produit',
    title: 'Du paiement au pilotage',
    desc: "Plan de salle en direct, planning équipe, chat interne, insights IA, clôture de service : Splitzy devient le poste de pilotage à distance du restaurant — le paiement fractionné n'est plus qu'un module parmi d'autres.",
    featured: false,
  },
]

const VALUES = [
  {
    num: '01',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    title: 'Côté restaurant, toujours.',
    desc: "Pas de commission cachée prélevée à vos clients. Pas de pub Sunday-style. Vous êtes notre seul client, vous êtes celui qu'on protège.",
  },
  {
    num: '02',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
    title: 'Vite. Mais bien.',
    desc: "Un client paie en 30 secondes. Un gérant configure en 5 minutes. Si une feature prend plus de temps, c'est qu'on l'a mal pensée.",
  },
  {
    num: '03',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    title: 'Discret par défaut.',
    desc: "Vos données restent en France. Vos clients ne voient pas notre logo en grand. Splitzy disparaît derrière votre marque — c'est le but.",
  },
]

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export function AboutPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#0A0A0A', color: 'white' }}>
      <Helmet>
        <title>À propos — Splitzy</title>
        <meta name="description" content="Splitzy est né d'un constat simple : l'addition reste le pire moment du repas. On a construit l'outil que les restaurateurs méritaient — devenu depuis un poste de pilotage complet du restaurant." />
      </Helmet>
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-40 pb-32 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.18), transparent 70%)' }}
        />
        <div className="relative max-w-[1100px] mx-auto px-6 text-center">
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              À propos
            </span>
          </div>

          <h1 className="text-white text-balance" style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 'clamp(52px, 8vw, 88px)' }}>
            On a résolu un problème
            <span className="block" style={{ color: '#E8920A' }}>qu'on a vécu.</span>
          </h1>

          <p className="mt-8 max-w-[640px] mx-auto text-[17px] leading-relaxed text-zinc-400">
            En 2025, un ami restaurateur a perdu{' '}
            <span className="text-white">0,4 points</span> sur sa note Google à cause de trois avis mal gérés.{' '}
            <span className="text-white">Yann</span> et <span className="text-white">Théo</span>{' '}
            ont décidé de construire la solution qui aurait tout évité.
          </p>

          <div className="mt-10 flex items-center justify-center gap-6 text-[13px] text-zinc-500 flex-wrap">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Fondé en 2025
            </span>
            <span className="text-zinc-700">·</span>
            <span>Paris, France</span>
            <span className="text-zinc-700">·</span>
            <span>Incubé au NEOMA</span>
          </div>
        </div>

        {/* Stats band */}
        <div className="relative mt-24 max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }}>
            {[
              { label: 'Restaurants', value: '179', suffix: '000', sub: 'en France à protéger.' },
              { label: 'Le problème', value: '4,2', after: '→', value2: '3,8', star: '★', sub: '3 mauvais avis suffisent.' },
              { label: "L'impact", prefix: '−', value: '30', pct: '%', sub: 'de réservations perdues.' },
            ].map((s, i) => (
              <div key={i} className="p-8" style={{ background: '#0A0A0A' }}>
                <div className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">{s.label}</div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  {s.prefix && <span className="text-zinc-600 text-[28px]">{s.prefix}</span>}
                  <span className="text-white" style={{ fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, fontSize: s.prefix ? '56px' : '40px' }}>{s.value}</span>
                  {s.suffix && <span className="text-[20px] text-zinc-500">{s.suffix}</span>}
                  {s.pct && <span className="text-[28px]" style={{ color: '#E8920A' }}>{s.pct}</span>}
                  {s.after && <span className="text-zinc-600">{s.after}</span>}
                  {s.value2 && <span className="text-[40px]" style={{ fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: '#E8920A' }}>{s.value2}</span>}
                  {s.star && <span className="text-[20px] text-zinc-500 ml-1">{s.star}</span>}
                </div>
                <p className="text-[13px] text-zinc-500 mt-2">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORY ── */}
      <section className="bg-ink-50 py-28" style={{ color: '#0A0A0A' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-20">
            <div className="flex justify-center mb-5">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 text-orange-700 text-[12px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                L'histoire
              </span>
            </div>
            <h2 className="text-[44px] md:text-[52px] font-extrabold text-balance" style={{ letterSpacing: '-0.05em', lineHeight: 1, color: '#0A0A0A' }}>
              De l'idée au premier{' '}
              <span style={{ color: '#E8920A' }}>QR code</span> sur table.
            </h2>
            <p className="mt-5 max-w-[560px] mx-auto text-[16px] text-zinc-600">
              De la discussion en terrasse aux tests terrain — jusqu'au pilotage complet du restaurant.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
            <div aria-hidden="true" className="hidden md:block absolute left-12 right-12 top-[40px] h-px bg-zinc-200" />
            {TIMELINE.map((item) => (
              <article
                key={item.step}
                className="relative bg-white rounded-2xl p-7 transition-all duration-200"
                style={{
                  border: item.featured ? '2px solid #E8920A' : '1px solid #E4E4E7',
                  boxShadow: item.featured ? '0 10px 30px -12px rgba(232,146,10,.25)' : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: item.featured ? '#E8920A' : '#FFF4E5' }}>
                    {item.icon}
                  </div>
                  <span className="text-[11px] tracking-[0.14em] uppercase font-semibold" style={{ color: item.featured ? '#E8920A' : '#71717A' }}>
                    {item.date}
                  </span>
                </div>
                <h3 className="mt-6 text-[18px] font-bold" style={{ color: '#0A0A0A' }}>{item.title}</h3>
                <p className="mt-2 text-[14px] text-zinc-600 leading-relaxed">{item.desc}</p>
                <div className="mt-6 h-2" style={{
                  backgroundImage: 'radial-gradient(#D4D4D8 1px, transparent 1px)',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 50%',
                  backgroundRepeat: 'repeat-x',
                }} />
                <p className="mt-4 text-[12px] text-zinc-500">
                  <span className="font-semibold" style={{ color: '#0A0A0A' }}>Étape {item.step}</span> · {item.label}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="bg-ink-50 pb-32" style={{ color: '#0A0A0A' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="flex items-end justify-between gap-8 mb-12 flex-wrap">
            <div className="max-w-[640px]">
              <div className="mb-5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 text-orange-700 text-[12px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  L'équipe
                </span>
              </div>
              <h2 className="text-[44px] md:text-[52px] font-extrabold text-balance" style={{ letterSpacing: '-0.05em', lineHeight: 1, color: '#0A0A0A' }}>
                Deux co-fondateurs.
                <span className="block text-zinc-400">Une obsession.</span>
              </h2>
            </div>
            <p className="text-[15px] text-zinc-600 max-w-[360px]">
              On se réveille tous les matins en se demandant : qu'est-ce qui empêche encore un restaurateur de dormir tranquille ?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Yann */}
            <article className="bg-white border border-zinc-200 rounded-3xl overflow-hidden" style={{ transition: 'transform .25s ease, border-color .25s ease, box-shadow .25s ease' }}>
              <div className="relative h-[320px] overflow-hidden">
                <img
                  src="/photo-yann.jpg"
                  alt="Yann Grigoriev"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: '50% 42%', transform: 'scale(1.05)', transformOrigin: '50% 42%' }}
                />
              </div>
              <div className="p-7">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[22px] font-bold tracking-tight" style={{ color: '#0A0A0A' }}>Yann Grigoriev</h3>
                  <span className="text-[12px] text-zinc-500">NEOMA BS</span>
                </div>
                <p className="mt-1 text-[14px] font-semibold" style={{ color: '#E8920A' }}>CEO &amp; Co-fondateur</p>
                <p className="mt-5 text-[15px] text-zinc-700 leading-relaxed" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}>
                  <span className="block" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 64, lineHeight: 1, color: '#E8920A', marginBottom: -16 }}>"</span>
                  Je voulais que les restaurateurs puissent se concentrer sur leur cuisine, pas sur leur réputation en ligne.
                </p>
                <div className="mt-6 flex items-center gap-4 pt-5 border-t border-zinc-150">
                  <a href="https://www.linkedin.com/in/yann-grigoriev" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold hover:text-orange-600 transition-colors" style={{ color: '#0A0A0A' }}>
                    LinkedIn <ArrowIcon />
                  </a>
                  <span className="text-zinc-300">·</span>
                  <a href="mailto:ygrigoriev@splitzy.fr" className="inline-flex items-center gap-1 text-[13px] font-semibold hover:text-orange-600 transition-colors" style={{ color: '#0A0A0A' }}>
                    Email <ArrowIcon />
                  </a>
                </div>
              </div>
            </article>

            {/* Théo */}
            <article className="bg-white border border-zinc-200 rounded-3xl overflow-hidden">
              <div className="relative h-[320px] overflow-hidden">
                <img
                  src="/photo-theo.jpg"
                  alt="Théo Jamous"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: '50% 32%', transform: 'scale(1.25)', transformOrigin: '50% 32%' }}
                />
              </div>
              <div className="p-7">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[22px] font-bold tracking-tight" style={{ color: '#0A0A0A' }}>Théo Jamous</h3>
                  <span className="text-[12px] text-zinc-500">EM Lyon</span>
                </div>
                <p className="mt-1 text-[14px] font-semibold" style={{ color: '#E8920A' }}>CTO &amp; Co-fondateur</p>
                <p className="mt-5 text-[15px] text-zinc-700 leading-relaxed" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}>
                  <span className="block" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 64, lineHeight: 1, color: '#E8920A', marginBottom: -16 }}>"</span>
                  On a construit quelque chose de simple à installer mais difficile à copier. C'est ça qui compte.
                </p>
                <div className="mt-6 flex items-center gap-4 pt-5 border-t border-zinc-150">
                  <a href="https://www.linkedin.com/in/theo-jamous/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold hover:text-orange-600 transition-colors" style={{ color: '#0A0A0A' }}>
                    LinkedIn <ArrowIcon />
                  </a>
                  <span className="text-zinc-300">·</span>
                  <a href="mailto:tjamous@splitzy.fr" className="inline-flex items-center gap-1 text-[13px] font-semibold hover:text-orange-600 transition-colors" style={{ color: '#0A0A0A' }}>
                    Email <ArrowIcon />
                  </a>
                </div>
              </div>
            </article>
          </div>

          {/* HIDDEN hiring strip — 0 postes ouverts */}
          {false && <div className="mt-8 bg-white border border-dashed border-zinc-300 rounded-2xl p-6 flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: '#0A0A0A' }}>
                  On cherche notre 3<sup>e</sup> personne.
                </p>
                <p className="text-[13px] text-zinc-500">Profil produit · Paris · stage ou alternance.</p>
              </div>
            </div>
            <a href="/careers" className="inline-flex items-center gap-1 text-[13px] font-semibold hover:text-orange-600 transition-colors" style={{ color: '#0A0A0A' }}>
              Voir l'offre <ArrowIcon />
            </a>
          </div>}
        </div>
      </section>

      {/* ── MISSION (dark) ── */}
      <section className="relative py-28 overflow-hidden" style={{ background: '#0A0A0A' }}>
        <div
          aria-hidden="true"
          className="absolute -bottom-32 right-1/4 w-[700px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.12), transparent 70%)' }}
        />
        <div className="relative max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-5">
              <div className="mb-5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Notre mission
                </span>
              </div>
              <h2 className="text-white text-balance" style={{ fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, fontSize: 'clamp(40px, 5vw, 56px)' }}>
                Que plus aucun
                <span className="block" style={{ color: '#E8920A' }}>soir ne soit gâché</span>
                <span className="block text-zinc-500">par 3 mauvais avis.</span>
              </h2>
            </div>

            <div className="md:col-span-7 md:pt-4">
              <p className="text-[17px] text-zinc-300 leading-relaxed">
                En France, 179 000 restaurants sont à la merci de quelques avis négatifs. Un client de mauvaise humeur, un service un peu lent, et des mois de travail peuvent s'effondrer en quelques clics.
              </p>
              <p className="mt-5 text-[17px] text-zinc-300 leading-relaxed">
                On construit <span className="text-white font-semibold">Splitzy</span> pour intercepter l'insatisfaction{' '}
                <em style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: '#E8920A', fontStyle: 'italic' }}>avant</em>{' '}
                qu'elle n'atteigne Google. Pour qu'un client mécontent puisse être entendu — et qu'un service raté ne devienne pas une cicatrice publique.
              </p>
              <p className="mt-5 text-[17px] text-zinc-300 leading-relaxed">
                Et depuis, le produit a grandi avec les gérants qui l'utilisent : au paiement fractionné se sont
                ajoutés le plan de salle en temps réel, le planning d'équipe, le chat interne, les insights IA et la
                clôture de service. Splitzy est devenu ce qu'on aurait voulu offrir à cet ami restaurateur dès le
                premier jour : <span className="text-white font-semibold">un poste de pilotage complet</span>, qui
                tient dans la poche.{' '}
                <a href="/fonctionnalites" className="underline underline-offset-4 hover:opacity-80 transition-opacity" style={{ color: '#E8920A' }}>
                  Voir toutes les fonctionnalités →
                </a>
              </p>

              {/* HIDDEN — stats fictives (0 clients réels) — remettre quand on a de vrais chiffres
              <div className="mt-10 grid grid-cols-3 gap-px rounded-xl overflow-hidden border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }}>
                {[
                  { num: '240+', label: 'restaurants\néquipés' },
                  { num: '1,2 M€', label: 'encaissés\nen 2025' },
                  { num: '96%', label: 'satisfaction\nclient' },
                ].map((s) => (
                  <div key={s.num} className="p-6" style={{ background: '#0A0A0A' }}>
                    <div className="text-white font-extrabold" style={{ fontSize: 40, letterSpacing: '-0.05em', lineHeight: 1 }}>{s.num}</div>
                    <p className="text-[12px] text-zinc-500 mt-1 leading-snug whitespace-pre-line">{s.label}</p>
                  </div>
                ))}
              </div>
              */ }
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="bg-ink-50 py-28" style={{ color: '#0A0A0A' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-5">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 text-orange-700 text-[12px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Nos valeurs
              </span>
            </div>
            <h2 className="text-[44px] md:text-[52px] font-extrabold text-balance" style={{ letterSpacing: '-0.05em', lineHeight: 1, color: '#0A0A0A' }}>
              Comment on construit Splitzy.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <article key={v.num} className="bg-white border border-zinc-200 rounded-2xl p-8 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg" style={{ boxShadow: undefined }}>
                <div className="flex items-center justify-between">
                  <span className="text-[44px] font-extrabold text-zinc-200" style={{ letterSpacing: '-0.05em', lineHeight: 1 }}>{v.num}</span>
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">{v.icon}</div>
                </div>
                <h3 className="mt-4 text-[20px] font-bold tracking-tight" style={{ color: '#0A0A0A' }}>{v.title}</h3>
                <p className="mt-3 text-[14px] text-zinc-600 leading-relaxed">{v.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEOMA ── */}
      <section className="bg-ink-50 pb-28">
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="bg-white border border-zinc-200 rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-10 justify-between">
            <div className="flex items-center gap-7">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-[22px] font-bold tracking-tight" style={{ background: '#0A0A0A' }}>N</div>
              <div>
                <p className="text-[11px] tracking-[0.16em] uppercase text-zinc-500 font-semibold">Incubé chez</p>
                <p className="mt-1 text-[24px] font-bold tracking-tight" style={{ color: '#0A0A0A' }}>NEOMA Incubator · Paris</p>
                <p className="text-[14px] text-zinc-500">Promotion 2025</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-stretch gap-3">
              <a href="https://startuplab.neoma-bs.fr/en/neoma-bs-incubators/" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 text-white text-[14px] font-semibold px-5 py-3 rounded-xl transition-colors hover:bg-ink-800" style={{ background: '#0A0A0A' }}>
                Voir l'incubateur <ArrowIcon />
              </a>
              <a href="mailto:contact@splitzy.fr" className="inline-flex items-center justify-center gap-2 bg-white border border-zinc-200 text-[14px] font-semibold px-5 py-3 rounded-xl hover:border-zinc-400 transition-colors" style={{ color: '#0A0A0A' }}>
                Notre presse-kit
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA orange ── */}
      <section className="relative overflow-hidden text-white" style={{ background: '#E8920A' }}>
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(135deg, white 0 24px, transparent 24px 48px)', backgroundSize: '48px 48px' }}
        />
        <div className="relative max-w-[1100px] mx-auto px-6 py-28 text-center">
          <h2 className="text-white text-balance" style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 'clamp(48px, 7vw, 72px)' }}>
            On serait ravis de vous
            <span className="block">rencontrer.</span>
          </h2>
          <p className="mt-6 max-w-[560px] mx-auto text-[16px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Que vous soyez restaurateur, journaliste, candidat, ou simplement curieux — écrivez-nous. On répond en moins de 24h ouvrées.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/contact"
              className="inline-flex items-center gap-2 bg-white text-[14px] font-semibold px-5 py-3 rounded-xl hover:bg-zinc-100 transition-colors"
              style={{ color: '#0A0A0A' }}
            >
              Demander une démo
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </a>
            <a
              href="mailto:contact@splitzy.fr"
              className="inline-flex items-center gap-2 text-white text-[14px] font-semibold px-5 py-3 rounded-xl transition-colors"
              style={{ background: 'rgba(122,77,5,0.4)', boxShadow: '0 0 0 1px rgba(255,255,255,0.3)' }}
            >
              contact@splitzy.fr
            </a>
          </div>
          <div className="mt-10 flex items-center justify-center gap-5 text-[12px] flex-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {['Sans engagement', 'Réponse en moins de 24h', 'Support en français'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckIcon /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
