import { Navbar } from './Navbar'
import { Footer } from './Footer'

const PERKS = [
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    title: 'Salaire haut de fourchette',
    desc: 'Public et indexé sur Welcome to the Jungle. Réévalué chaque année.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    title: 'BSPCE généreux',
    desc: '0,5 à 2% du capital selon le poste. Vesting 4 ans, cliff 1 an.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    title: 'Petite équipe, vrai impact',
    desc: 'Vous parlez aux fondateurs chaque jour. Vos décisions vont en prod la semaine.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>,
    title: 'Resto-Tickets… littéralement',
    desc: 'Carte Swile à 10€/jour + un dîner gratuit par mois chez nos restos clients.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    title: 'MacBook Pro',
    desc: 'Setup complet, écran 4K, et le matériel que vous voulez. Pas de bon de commande.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    title: 'Vendredis courts',
    desc: "On part à 16h. Une fois par mois, c'est un déjeuner d'équipe + après-midi off.",
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><circle cx="12" cy="12" r="10"/></svg>,
    title: 'Mutuelle Alan',
    desc: 'Prise en charge à 100%. Conjoint et enfants couverts gratuitement.',
  },
  {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    title: '5 jours de formation',
    desc: '2 000€/an. Conf, livre, cours en ligne, mentor — votre choix.',
  },
]

const JOBS = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2A10 10 0 0 0 2 12c0 5.523 4.477 10 10 10 1.105 0 2-.895 2-2 0-.552-.224-1.052-.586-1.414-.362-.362-.586-.862-.586-1.414 0-1.105.895-2 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10z"/></svg>,
    title: 'Product Designer',
    badge: 'Urgent',
    badgeStyle: { background: 'rgba(16,185,129,0.12)', color: '#10b981' },
    desc: "Vous dessinerez l'expérience client de bout en bout. Du Figma au shipping, avec accès direct aux fondateurs.",
    type: 'Stage · 6 mois',
    location: 'Paris · sur site',
    salary: '1 300 € / mois',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    title: 'Full-stack Engineer',
    badge: 'CDI',
    badgeStyle: { background: '#ECECEE', color: '#52525B' },
    desc: 'React, TypeScript, Convex. Vous shippez du code chaque jour, vous parlez aux clients chaque semaine. On cherche du craft, pas du volume.',
    type: 'CDI',
    location: 'Paris · 4j sur site',
    salary: '55–75 k€ + BSPCE',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8920A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
    title: 'Account Executive · Restaurants',
    badge: 'CDI',
    badgeStyle: { background: '#ECECEE', color: '#52525B' },
    desc: 'Vous démarchez les bistrots parisiens en chair et en os. Pas de cold emails à 200/jour — on signe par poignée de mains, en salle.',
    type: 'CDI',
    location: 'Paris · terrain',
    salary: '45 k€ + 30% var.',
  },
]

const PROCESS = [
  { step: '01', duration: '30 min', title: 'Discovery call', desc: "On apprend à se connaître. On vous explique vraiment ce qu'on fait, sans pitch deck.", note: '→ avec Yann, en visio.', featured: false },
  { step: '02', duration: '1 h',    title: 'Cas pratique',   desc: "Un problème réel qu'on a eu cette année. Vous le traitez chez vous. Pas de piège.",    note: '→ async, 5 jours max.', featured: false },
  { step: '03', duration: '2 h',    title: 'Journée sur place', desc: "On débrief le cas ensemble. On visite un resto client. On déjeune. C'est gratuit, et payé.", note: '→ 11e arrondissement.', featured: false },
  { step: '04', duration: '48 h',   title: 'Offre écrite',   desc: 'Salaire, BSPCE, date de démarrage, et 2 références à appeler de notre côté. À vous de décider.', note: '→ Bienvenue chez Splitzy.', featured: true },
]

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

export function CarriersPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#0A0A0A', color: 'white' }}>
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-40 pb-28 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.18), transparent 70%)' }}
        />
        <div className="relative max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <div className="mb-7">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Carrières
                </span>
              </div>
              <h1 className="text-white text-balance" style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 'clamp(52px, 7vw, 84px)' }}>
                Construisez un produit
                <span className="block text-zinc-500">qui protège vraiment</span>
                <span className="block" style={{ color: '#E8920A' }}>des restaurants.</span>
              </h1>
            </div>
            <div className="md:col-span-4">
              <p className="text-[16px] text-zinc-400 leading-relaxed">
                On est <span className="text-white font-semibold">2 fondateurs</span>, on grandit vite, et on cherche notre{' '}
                <span className="text-white font-semibold">3<sup>e</sup> personne</span>. Vous serez là quand on multipliera par 10.
              </p>
              <div className="mt-6 flex items-center gap-4 text-[12px] text-zinc-500">
                {/* HIDDEN "3 postes ouverts" — 0 postes pour l'instant */}
                <span>Paris · 11<sup>e</sup></span>
              </div>
            </div>
          </div>

          {/* Stats bento */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }}>
            {[
              { label: 'Équipe',  value: '2', accent: '→ 5', sub: "d'ici fin 2026." },
              { label: 'BSPCE',   value: '0,5–2', suffix: '%', sub: 'selon le rôle.' },
              { label: 'Bureau',  value: '100',   suffix: '%', sub: 'présentiel · 4 jours.' },
              { label: 'Process', value: '10',    suffix: ' jours', sub: 'screen → offre.' },
            ].map((s) => (
              <div key={s.label} className="p-7" style={{ background: '#0A0A0A' }}>
                <div className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">{s.label}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-white" style={{ fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1, fontSize: 44 }}>{s.value}</span>
                  {s.accent && <span className="text-[20px]" style={{ color: '#E8920A' }}> {s.accent}</span>}
                  {s.suffix && <span className="text-[20px] text-zinc-500">{s.suffix}</span>}
                </div>
                <p className="text-[12px] text-zinc-500 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY (light) ── */}
      <section className="bg-ink-50 py-28" style={{ color: '#0A0A0A' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end mb-16">
            <div className="md:col-span-7">
              <div className="mb-5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 text-orange-700 text-[12px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Ce qu'on offre
                </span>
              </div>
              <h2 className="font-extrabold text-[44px] md:text-[52px] text-balance" style={{ letterSpacing: '-0.05em', lineHeight: 1, color: '#0A0A0A' }}>
                Pas une startup<span className="block">comme les autres.</span>
              </h2>
            </div>
            <p className="md:col-span-5 text-[16px] text-zinc-600">
              On construit en vrai, avec de vrais restaurants. Ici, vous ne construirez pas pour des slides — vous construirez pour des gens qui dépendent de Splitzy chaque soir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PERKS.map((p) => (
              <article
                key={p.title}
                className="bg-white border border-zinc-200 rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300"
              >
                <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center mb-5">
                  {p.icon}
                </div>
                <h3 className="font-bold text-[17px] tracking-tight" style={{ color: '#0A0A0A' }}>{p.title}</h3>
                <p className="mt-2 text-[14px] text-zinc-600 leading-relaxed">{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* HIDDEN — 0 postes ouverts pour l'instant — décommenter quand on recrute */}
      {false && <section className="bg-ink-50 pb-28" style={{ color: '#0A0A0A' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
            <div>
              <div className="mb-5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 text-orange-700 text-[12px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Postes ouverts
                </span>
              </div>
              <h2 className="font-extrabold text-[44px] md:text-[52px] text-balance" style={{ letterSpacing: '-0.05em', lineHeight: 1, color: '#0A0A0A' }}>
                3 postes pour grandir avec nous.
              </h2>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
            {JOBS.map((job) => (
              <a
                key={job.title}
                href={`mailto:jobs@splitzy.fr?subject=${encodeURIComponent(job.title)}`}
                className="group flex items-center gap-6 p-7 transition-colors duration-200 hover:bg-orange-50"
              >
                <div className="hidden md:flex w-14 h-14 rounded-xl bg-orange-50 items-center justify-center shrink-0">
                  {job.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-[20px] tracking-tight" style={{ color: '#0A0A0A' }}>{job.title}</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold" style={job.badgeStyle}>
                      <span className="w-1 h-1 rounded-full" style={{ background: 'currentColor' }} />
                      {job.badge}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px] text-zinc-600 leading-relaxed">{job.desc}</p>
                </div>
                <div className="hidden lg:flex flex-col items-end gap-1.5 text-[12px] shrink-0 min-w-[160px]">
                  <span className="text-zinc-500">{job.type}</span>
                  <span className="text-zinc-500">{job.location}</span>
                  <span className="font-mono font-semibold" style={{ color: '#0A0A0A' }}>{job.salary}</span>
                </div>
                <div className="w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:border-orange-600 group-hover:bg-orange-600 group-hover:text-white" style={{ color: '#0A0A0A' }}>
                  <ArrowRight />
                </div>
              </a>
            ))}
          </div>

          {/* Candidature spontanée */}
          <div className="mt-6 bg-white border border-dashed border-zinc-300 rounded-2xl p-6 flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: '#0A0A0A' }}>Vous ne voyez pas votre poste ?</p>
                <p className="text-[13px] text-zinc-500">Écrivez-nous quand même. On lit toutes les candidatures.</p>
              </div>
            </div>
            <a href="mailto:jobs@splitzy.fr" className="inline-flex items-center gap-1.5 text-[13px] font-semibold hover:text-orange-600 transition-colors" style={{ color: '#0A0A0A' }}>
              jobs@splitzy.fr
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      }

      {/* ── SALARY TRANSPARENCY (dark) ── */}
      <section className="relative py-28 overflow-hidden" style={{ background: '#0A0A0A' }}>
        <div
          aria-hidden="true"
          className="absolute -bottom-32 right-0 w-[700px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.10), transparent 70%)' }}
        />
        <div className="relative max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            <div className="md:col-span-5">
              <div className="mb-5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  Transparence salariale
                </span>
              </div>
              <h2 className="text-white text-balance" style={{ fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, fontSize: 'clamp(40px, 5vw, 52px)' }}>
                Notre grille,
                <span className="block" style={{ color: '#E8920A' }}>publique.</span>
              </h2>
              <p className="mt-6 text-[15px] text-zinc-400 leading-relaxed">
                Aucune négociation au mérite ni à l'audace. Mêmes critères, même grille, pour tout le monde. Vous voyez exactement où vous vous situez avant même l'entretien.
              </p>
              <a href="mailto:jobs@splitzy.fr" className="mt-7 inline-flex items-center gap-2 text-[13px] font-semibold text-white hover:text-orange-400 transition-colors">
                Voir la méthodo complète
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              </a>
            </div>

            <div className="md:col-span-7">
              <div className="rounded-2xl overflow-hidden border text-[13px]" style={{ background: '#1F1F23', borderColor: 'rgba(255,255,255,0.05)', fontFamily: "'JetBrains Mono', 'Geist Mono', ui-monospace, monospace" }}>
                <div className="flex items-center justify-between px-5 py-3 border-b text-zinc-500" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    <span className="ml-3 text-[11px]">grille_salaires.csv · public</span>
                  </div>
                  <span className="text-[11px]">v2026.05</span>
                </div>
                <div className="px-5 py-5 space-y-3">
                  <div className="grid grid-cols-12 gap-3 text-[11px] text-zinc-500 uppercase tracking-wider">
                    <span className="col-span-5">Rôle</span>
                    <span className="col-span-3">Junior</span>
                    <span className="col-span-3">Confirmé</span>
                    <span className="col-span-1 text-right">Senior</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  {[
                    { role: 'Engineer',        j: '42 k€', c: '58 k€', s: '78 k€' },
                    { role: 'Designer',        j: '38 k€', c: '52 k€', s: '70 k€' },
                    { role: 'Account Exec',    j: '40 k€ + var.', c: '55 k€ + var.', s: '75 k€' },
                    { role: 'Customer Success',j: '36 k€', c: '48 k€', s: '62 k€' },
                  ].map((r) => (
                    <div key={r.role} className="grid grid-cols-12 gap-3 items-center">
                      <span className="col-span-5 text-white">{r.role}</span>
                      <span className="col-span-3 text-zinc-400">{r.j}</span>
                      <span className="col-span-3 text-zinc-400">{r.c}</span>
                      <span className="col-span-1 text-right" style={{ color: '#E8920A' }}>{r.s}</span>
                    </div>
                  ))}
                  <div className="h-px bg-white/5" />
                  <p className="text-[11px] text-zinc-500"># BSPCE ajouté en plus, 0,5 → 2% selon ancienneté.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROCESS (light) ── */}
      <section className="bg-ink-50 py-28" style={{ color: '#0A0A0A' }}>
        <div className="max-w-[1100px] mx-auto px-6">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-5">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 text-orange-700 text-[12px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                Le process
              </span>
            </div>
            <h2 className="font-extrabold text-[44px] md:text-[52px] text-balance" style={{ letterSpacing: '-0.05em', lineHeight: 1, color: '#0A0A0A' }}>
              10 jours, 4 étapes,{' '}
              <span style={{ color: '#E8920A' }}>aucune surprise.</span>
            </h2>
            <p className="mt-5 max-w-[560px] mx-auto text-[16px] text-zinc-600">
              On respecte votre temps. Chaque étape a un objectif clair, un délai, un retour écrit — même quand c'est non.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div aria-hidden="true" className="hidden md:block absolute left-10 right-10 top-[44px] h-px bg-zinc-200" />
            {PROCESS.map((p) => (
              <article
                key={p.step}
                className="relative bg-white rounded-2xl p-6"
                style={{
                  border: p.featured ? '2px solid #E8920A' : '1px solid #E4E4E7',
                  boxShadow: p.featured ? '0 10px 30px -12px rgba(232,146,10,.25)' : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[18px] font-extrabold"
                    style={{
                      background: p.featured ? '#E8920A' : '#0A0A0A',
                      color: 'white',
                      letterSpacing: '-0.035em',
                      lineHeight: 1,
                    }}
                  >
                    {p.step}
                  </div>
                  <span
                    className="text-[11px] tracking-[0.14em] uppercase font-semibold"
                    style={{ color: p.featured ? '#E8920A' : '#71717A' }}
                  >
                    {p.duration}
                  </span>
                </div>
                <h3 className="mt-5 text-[17px] font-bold tracking-tight" style={{ color: '#0A0A0A' }}>{p.title}</h3>
                <p className="mt-2 text-[13.5px] text-zinc-600 leading-relaxed">{p.desc}</p>
                <p className="mt-4 text-[11px] font-semibold" style={{ color: p.featured ? '#E8920A' : '#71717A' }}>{p.note}</p>
              </article>
            ))}
          </div>

          <p className="mt-10 text-center text-[13px] text-zinc-500">
            <span className="font-semibold" style={{ color: '#0A0A0A' }}>Refusé ?</span> Vous recevez un feedback écrit dans les 48h. Pas de "merci pour votre intérêt".
          </p>
        </div>
      </section>

      {/* ── CULTURE QUOTE (dark) ── */}
      <section className="py-24 text-white" style={{ background: '#0A0A0A' }}>
        <div className="max-w-[900px] mx-auto px-6 text-center">
          <svg className="mx-auto mb-6" width="44" height="44" viewBox="0 0 24 24" fill="#E8920A">
            <path d="M9.5 4C5.36 4 2 7.36 2 11.5c0 4.14 3.36 7.5 7.5 7.5h.5v-3h-.5C7.02 16 5 13.98 5 11.5S7.02 7 9.5 7h.5V4h-.5zm12 0c-4.14 0-7.5 3.36-7.5 7.5 0 4.14 3.36 7.5 7.5 7.5h.5v-3h-.5c-2.48 0-4.5-2.02-4.5-4.5S19.02 7 21.5 7h.5V4h-.5z" transform="scale(-1,1) translate(-24,0)"/>
          </svg>
          <p
            className="text-[32px] md:text-[40px] leading-[1.2] text-white text-balance"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}
          >
            On ne cherche pas des gens parfaits. On cherche des gens qui rendent{' '}
            <span style={{ color: '#E8920A' }}>l'équipe meilleure</span> que la veille.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ background: '#E8920A' }}>YG</div>
            <div className="text-left">
              <p className="text-[13px] font-semibold">Yann Grigoriev</p>
              <p className="text-[11px] text-zinc-500">CEO &amp; Co-fondateur</p>
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
            Une seule personne sur Terre
            <span className="block">a votre profil.</span>
          </h2>
          <p className="mt-6 max-w-[560px] mx-auto text-[16px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Et c'est probablement vous. Écrivez-nous, même si vous n'êtes pas sûr·e. Les meilleurs membres de l'équipe nous ont dit la même chose au début.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#postes"
              onClick={(e) => { e.preventDefault(); document.querySelector('.bg-white.border.border-zinc-200.rounded-2xl.overflow-hidden')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="inline-flex items-center gap-2 bg-white text-[14px] font-semibold px-5 py-3 rounded-xl hover:bg-zinc-100 transition-colors"
              style={{ color: '#0A0A0A' }}
            >
              Voir les postes ouverts <ArrowRight />
            </a>
            <a
              href="mailto:jobs@splitzy.fr"
              className="inline-flex items-center gap-2 text-white text-[14px] font-semibold px-5 py-3 rounded-xl transition-colors"
              style={{ background: 'rgba(122,77,5,0.4)', boxShadow: '0 0 0 1px rgba(255,255,255,0.3)' }}
            >
              jobs@splitzy.fr
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-[12px] flex-wrap" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {['Réponse sous 5 jours', 'Process 10 jours max', 'Feedback écrit garanti'].map((t) => (
              <span key={t} className="flex items-center gap-1.5"><CheckIcon /> {t}</span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
