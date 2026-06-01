import { Link } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

// ── Cover background helpers ─────────────────────────────────────────────────
const COVERS: Record<string, React.CSSProperties> = {
  'stripes-warm': { background: 'repeating-linear-gradient(135deg, #FFE7C2 0 10px, #FFF4E5 10px 20px)' },
  'stripes-dark': { background: 'repeating-linear-gradient(135deg, #18181B 0 10px, #0A0A0A 10px 20px)' },
  'stripes-cool': { background: 'repeating-linear-gradient(135deg, #E7E7EA 0 10px, #F3F3F5 10px 20px)' },
  'orange-block': { background: '#E8920A' },
  'cream-block':  { background: '#FFF4E5' },
  'dot-light':    { backgroundColor: '#FAFAFA', backgroundImage: 'radial-gradient(#DCDCE0 1.2px, transparent 1.2px)', backgroundSize: '16px 16px' },
  'dot-dark':     { backgroundColor: '#0A0A0A', backgroundImage: 'radial-gradient(#27272A 1.2px, transparent 1.2px)', backgroundSize: '16px 16px' },
  'grid-cream':   { backgroundColor: '#FAFAFA', backgroundImage: 'linear-gradient(#E4E4E7 1px, transparent 1px), linear-gradient(90deg, #E4E4E7 1px, transparent 1px)', backgroundSize: '28px 28px' },
  'stars-grad':   { background: 'linear-gradient(135deg, #FFF4E5 0%, #E8920A 100%)' },
}

// ── Data ─────────────────────────────────────────────────────────────────────
const ARTICLES = [
  /* HIDDEN — comparatif Sunday/Pleez/Obypay (données fictives, 6 mois d'usage non réels)
  {
    id: 1, slug: 'comparatif-sunday-pleez-obypay', cover: 'stripes-warm',
    category: 'Comparatif', catStyle: { color: '#7A4D05', background: 'rgba(255,255,255,0.8)' } as React.CSSProperties,
    date: '14 mai', readTime: '8 min',
    title: 'Sunday, Pleez, Obypay : on a comparé honnêtement.',
    excerpt: "Frais cachés, expérience client, qualité du dashboard. Le verdict après 6 mois d'usage des 3 outils en parallèle.",
    author: { initials: 'TJ', name: 'Théo Jamous', bg: '#0A0A0A' },
    dark: false,
    bigLabel: null as string | null,
  },
  */
  /* HIDDEN — 38 000 avis / 21h43 (données fictives non vérifiées)
  {
    id: 2, slug: 'quelle-heure-avis-google-ecrits', cover: 'stripes-dark',
    category: 'Data', catStyle: { color: 'white', background: 'rgba(255,255,255,0.15)' } as React.CSSProperties,
    date: '07 mai', readTime: '4 min',
    title: 'À quelle heure les avis Google sont vraiment écrits ?',
    excerpt: "On a analysé 38 000 avis sur restaurants parisiens. Le pic se situe à 21h43 — et ce n'est pas un hasard.",
    author: { initials: 'YG', name: 'Yann Grigoriev', bg: '#E8920A' },
    dark: false,
    bigLabel: '21:43',
  },
  */
  /* HIDDEN — 3 patrons parisiens / avis 1 étoile (témoignages fictifs)
  {
    id: 3, slug: 'repondre-avis-1-etoile', cover: 'grid-cream',
    category: 'Opinion', catStyle: { color: '#0A0A0A', background: 'white' } as React.CSSProperties,
    date: '29 avril', readTime: '6 min',
    title: "Restaurateurs : comment répondre à un avis 1 étoile sans s'humilier.",
    excerpt: "3 patrons parisiens nous racontent leur méthode. Aucun ne supplie. Aucun n'ignore. Voici le bon milieu.",
    author: { initials: 'TJ', name: 'Théo Jamous', bg: '#0A0A0A' },
    dark: false,
    bigLabel: null,
  },
  */
  {
    id: 4, slug: 'guide-pourboire-france-2026', cover: 'cream-block',
    category: 'Guide', catStyle: { color: '#7A4D05', background: 'rgba(255,255,255,0.8)' } as React.CSSProperties,
    date: '22 avril', readTime: '12 min',
    title: 'Le guide complet du pourboire en France en 2026.',
    excerpt: 'Cash, sans contact, partagé en cuisine. Ce que dit la loi, ce que disent vos clients, et ce que vous devriez faire.',
    author: { initials: 'YG', name: 'Yann Grigoriev', bg: '#E8920A' },
    dark: false,
    bigLabel: null,
  },
  {
    id: 5, slug: 'pourquoi-clients-abandonnent-paiement', cover: 'dot-light',
    category: 'UX', catStyle: { color: '#0A0A0A', background: 'white' } as React.CSSProperties,
    date: '15 avril', readTime: '7 min',
    title: 'Pourquoi vos clients abandonnent au moment de payer.',
    excerpt: '14 frictions identifiées sur les pages de paiement de 60 outils restaurant. Combien votre solution en cumule ?',
    author: { initials: 'TJ', name: 'Théo Jamous', bg: '#0A0A0A' },
    dark: false,
    bigLabel: null,
  },
  /* HIDDEN — installation 100 restos (chiffre fictif, pas encore atteint)
  {
    id: 6, slug: 'installation-100-restaurants', cover: 'dot-dark',
    category: 'Backstage', catStyle: { color: 'white', background: 'rgba(255,255,255,0.15)' } as React.CSSProperties,
    date: '02 avril', readTime: '9 min',
    title: "On a installé Splitzy chez 100 restos. Voici ce qu'on a appris.",
    excerpt: "L'imprimante qui ne marche pas, le wifi en sous-sol, le serveur qui refuse de scanner. Le terrain bat les slides.",
    author: { initials: 'YG', name: 'Yann Grigoriev', bg: '#E8920A' },
    dark: false,
    bigLabel: null,
  },
  */
  {
    id: 7, slug: 'premium-qui-veut-dire-cher', cover: 'dark-editorial',
    category: 'Opinion', catStyle: {} as React.CSSProperties,
    date: '26 mars', readTime: '5 min',
    title: null,
    excerpt: "Pourquoi tant d'outils restaurants vendent 200€/mois ce qu'on peut faire mieux à 59€. Et pourquoi ils continueront — tant qu'on accepte de payer.",
    author: { initials: 'YG', name: 'Yann Grigoriev', bg: '#E8920A' },
    dark: true,
    bigLabel: null,
  },
  {
    id: 8, slug: 'tva-partage-addition-loi', cover: 'stripes-cool',
    category: 'Juridique', catStyle: { color: '#0A0A0A', background: 'white' } as React.CSSProperties,
    date: '19 mars', readTime: '11 min',
    title: "TVA et partage d'addition : ce que dit vraiment la loi.",
    excerpt: "Un comptable, un avocat fiscaliste et nous. On a démêlé les règles. Spoiler : c'est plus simple qu'on pense.",
    author: { initials: 'TJ', name: 'Théo Jamous', bg: '#0A0A0A' },
    dark: false,
    bigLabel: null,
  },
  /* HIDDEN — L'Ardoise +0,3 étoiles (cas client fictif)
  {
    id: 9, slug: 'lardoise-plus-03-etoiles-3-mois', cover: 'stars-grad',
    category: 'Étude de cas', catStyle: { color: '#7A4D05', background: 'rgba(255,255,255,0.85)' } as React.CSSProperties,
    date: '12 mars', readTime: '8 min',
    title: "L'Ardoise : comment ils ont récupéré 0,3 étoiles en 3 mois.",
    excerpt: 'Brasserie lyonnaise, 80 couverts/soir. Le récit de leur stratégie de feedback privé, semaine par semaine.',
    author: { initials: 'YG', name: 'Yann Grigoriev', bg: '#E8920A' },
    dark: false,
    bigLabel: null,
  },
  */
]

const SERIES = [
  {
    episodes: 4, title: 'Le grand procès de Google Reviews.',
    desc: 'Comment un système anti-fraude a fini par punir les meilleurs restaurants.',
    progress: '1', progressLabel: 'Premier épisode disponible',
  },
  {
    episodes: 6, title: 'Restaurateurs, mode d\'emploi 2026.',
    desc: 'Tout ce qu\'on aimerait avoir su avant d\'ouvrir notre premier restaurant.',
    progress: '3', progressLabel: '3 / 6 publiés',
  },
  {
    episodes: 5, title: 'Anatomie d\'une mauvaise UX.',
    desc: 'On dissèque les outils restauration qui nous énervent, écran par écran.',
    progress: '5', progressLabel: 'Série complète',
  },
]

const TRENDING = [
  '→ Comment 3 avis ont coûté 50 000 €',
  '→ Sunday vs Pleez vs Obypay',
  '→ TVA et partage d\'addition',
  '→ À quelle heure les avis sont écrits ?',
  "→ L'Ardoise : +0,3 étoiles en 3 mois",
  '→ Le pourboire en 2026',
]

// ── Arrow icon ────────────────────────────────────────────────────────────────
const ArrowUpRight = ({ color = 'currentColor' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
  </svg>
)

const ArrowRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ── Cover renderer ────────────────────────────────────────────────────────────
function ArticleCover({ article }: { article: typeof ARTICLES[0] }) {
  const baseClass = 'relative overflow-hidden aspect-[16/10]'

  if (article.cover === 'dark-editorial') return null

  if (article.cover === 'stripes-dark' && article.bigLabel) {
    return (
      <div className={baseClass} style={COVERS['stripes-dark']}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 80, color: 'white', opacity: 0.9, userSelect: 'none' }}>
            {article.bigLabel}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="text-[10.5px] tracking-[0.16em] uppercase font-semibold px-2.5 py-1 rounded-full backdrop-blur" style={article.catStyle}>{article.category}</span>
        </div>
      </div>
    )
  }

  if (article.cover === 'grid-cream') {
    return (
      <div className={baseClass} style={COVERS['grid-cream']}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', color: '#0A0A0A', fontSize: 100, lineHeight: 1 }}>«&nbsp;»</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="text-[10.5px] tracking-[0.16em] uppercase font-semibold px-2.5 py-1 rounded-full" style={article.catStyle}>{article.category}</span>
        </div>
      </div>
    )
  }

  if (article.cover === 'cream-block') {
    return (
      <div className={baseClass} style={COVERS['cream-block']}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 200, color: '#E8920A', opacity: 0.95, userSelect: 'none' }}>€</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="text-[10.5px] tracking-[0.16em] uppercase font-semibold px-2.5 py-1 rounded-full backdrop-blur" style={article.catStyle}>{article.category}</span>
        </div>
      </div>
    )
  }

  if (article.cover === 'dot-light') {
    return (
      <div className={baseClass} style={COVERS['dot-light']}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-3">
            {['#0A0A0A','#D4D4D8','#E8920A','#D4D4D8','#E8920A','#0A0A0A','#E8920A','#0A0A0A','#D4D4D8'].map((c, i) => (
              <div key={i} className="w-7 h-7 rounded-md" style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="text-[10.5px] tracking-[0.16em] uppercase font-semibold px-2.5 py-1 rounded-full" style={article.catStyle}>{article.category}</span>
        </div>
      </div>
    )
  }

  if (article.cover === 'dot-dark') {
    return (
      <div className={baseClass} style={COVERS['dot-dark']}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 140, color: '#E8920A', opacity: 0.95, userSelect: 'none' }}>100</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="text-[10.5px] tracking-[0.16em] uppercase font-semibold px-2.5 py-1 rounded-full backdrop-blur" style={article.catStyle}>{article.category}</span>
        </div>
      </div>
    )
  }

  if (article.cover === 'stripes-cool') {
    return (
      <div className={baseClass} style={COVERS['stripes-cool']}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 110, color: '#0A0A0A', opacity: 0.95, userSelect: 'none' }}>TVA</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="text-[10.5px] tracking-[0.16em] uppercase font-semibold px-2.5 py-1 rounded-full" style={article.catStyle}>{article.category}</span>
        </div>
      </div>
    )
  }

  if (article.cover === 'stars-grad') {
    return (
      <div className={baseClass} style={COVERS['stars-grad']}>
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          {[1,2,3].map(i => (
            <span key={i} style={{ fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1, fontSize: 110, color: 'white', userSelect: 'none' }}>★</span>
          ))}
          {[4,5].map(i => (
            <span key={i} style={{ fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1, fontSize: 110, color: 'rgba(255,255,255,0.3)', userSelect: 'none' }}>★</span>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="text-[10.5px] tracking-[0.16em] uppercase font-semibold px-2.5 py-1 rounded-full backdrop-blur" style={article.catStyle}>{article.category}</span>
        </div>
      </div>
    )
  }

  // default: stripes-warm
  return (
    <div className={baseClass} style={COVERS['stripes-warm']}>
      <div className="h-full flex items-end p-5">
        <span className="text-[10.5px] tracking-[0.16em] uppercase font-semibold px-2.5 py-1 rounded-full backdrop-blur" style={article.catStyle}>{article.category}</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function BlogPage() {
  return (
    <div className="w-full min-h-screen" style={{ background: '#0A0A0A', color: 'white' }}>
      <style>{`
        @keyframes scrollx { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .blog-marquee { display: flex; gap: 2rem; width: max-content; animation: scrollx 40s linear infinite; }
        .blog-post { transition: transform .25s ease; }
        .blog-post:hover { transform: translateY(-3px); }
        .blog-post:hover .blog-post-title { color: #B8730A !important; }
        .blog-post-title { transition: color .25s ease; }
        .blog-post:hover .blog-post-arrow { transform: translate(3px, -3px); }
        .blog-post-arrow { transition: transform .25s ease; }
      `}</style>

      <Navbar />

      {/* ── HERO ── */}
      <section className="relative pt-[150px] pb-20 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.15), transparent 70%)' }}
        />
        <div className="relative max-w-[1100px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E8920A' }} />
                  Le Journal
                </span>
              </div>
              <h1 className="text-white text-balance" style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 'clamp(52px, 7vw, 84px)' }}>
                Ce que la restauration
                <span className="block" style={{ color: '#E8920A' }}>ne sait pas encore.</span>
              </h1>
            </div>
            <div className="md:col-span-4">
              <p className="text-[16px] text-zinc-400 leading-relaxed">
                Études, données et opinions sur le métier de restaurateur en France.{' '}
                <span className="text-white">Écrit par notre équipe</span>.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <a
                  href="#newsletter"
                  className="inline-flex items-center gap-1.5 bg-white text-[13px] font-semibold px-3.5 py-2 rounded-lg hover:bg-zinc-100 transition"
                  style={{ color: '#0A0A0A' }}
                >
                  S'abonner par email
                </a>
                <a href="#" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-white transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 3a1 1 0 0 0-1 1v2.34A12 12 0 0 1 16.66 19H19a1 1 0 0 0 1-1A13 13 0 0 0 5 3zm0 5.33A7.67 7.67 0 0 1 12.67 16H10A5 5 0 0 0 5 11zm0 5.34A2.33 2.33 0 0 1 7.33 16H5z"/>
                  </svg>
                  RSS
                </a>
              </div>
            </div>
          </div>

          {/* Editorial stats — HIDDEN: "47 articles" et "12k lecteurs" fictifs
          <div className="mt-20 flex items-center gap-10 flex-wrap text-[12px] text-zinc-500 border-t pt-7" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {[
              { value: '47',    label: 'articles\npubliés' },
              { value: '12 k',  label: 'lecteurs\npar mois' },
              { value: '6 min', label: 'de lecture\nen moyenne' },
              { value: '100%',  label: 'écrit par\ndes humains' },
            ].map(s => (
              <div key={s.value} className="flex items-center gap-2">
                <span className="text-white" style={{ fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1, fontSize: 26 }}>{s.value}</span>
                <span className="leading-tight whitespace-pre-line">{s.label}</span>
              </div>
            ))}
          </div> */}
        </div>
      </section>

      {/* ── ARTICLES (light bg) ── */}
      <section className="bg-zinc-50 py-20" style={{ color: '#0A0A0A' }}>
        <div className="max-w-[1100px] mx-auto px-6">

          {/* Filters */}
          <div className="flex items-center justify-between gap-6 flex-wrap mb-10">
            <div className="flex items-center gap-2 flex-wrap">
              {/* HIDDEN compteurs fictifs — remettre quand on aura de vrais chiffres
              { label: 'Tous · 47', active: true },
              { label: 'Guides · 12' }, etc. */}
              {[
                { label: 'Tous', active: true },
                { label: 'Guides' },
                { label: 'Études de cas' },
                { label: 'Data & chiffres' },
                { label: 'Opinion' },
                { label: 'Comparatifs' },
              ].map(chip => (
                <button
                  key={chip.label}
                  className="inline-flex items-center px-[0.9rem] py-[0.4rem] rounded-full text-[12.5px] font-medium transition-all cursor-pointer"
                  style={chip.active
                    ? { background: '#0A0A0A', color: 'white', border: '1px solid #0A0A0A' }
                    : { background: 'white', color: '#52525B', border: '1px solid #E4E4E7' }
                  }
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-[13px] text-zinc-500">
              <span>Trier par</span>
              <button className="inline-flex items-center gap-1.5 font-semibold" style={{ color: '#0A0A0A' }}>
                Plus récent
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
          </div>

          {/* HIDDEN — article fictif "50 000€" — décommenter quand on a un vrai cas client
          <Link to="/blog/3-avis-50000-euros" onClick={() => window.scrollTo(0, 0)} className="blog-post group block bg-white border border-zinc-200 rounded-3xl overflow-hidden mb-10">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="relative overflow-hidden aspect-[16/10] lg:aspect-auto" style={{ background: '#E8920A' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 'clamp(140px,18vw,260px)', color: 'white', opacity: 0.9, userSelect: 'none' }}>-0,4</span>
                </div>
                <div className="absolute top-6 left-6 flex items-center gap-2 text-white text-[11px] font-semibold tracking-[0.16em] uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  À la une
                </div>
                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-white/90 text-[11px] font-semibold tracking-[0.12em] uppercase">
                  <span>Étude de cas</span>
                  <span>10 min de lecture</span>
                </div>
              </div>
              <div className="p-10 md:p-12 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] tracking-[0.16em] uppercase text-zinc-500 font-semibold">19 mai 2026</p>
                  <h2 className="blog-post-title font-extrabold text-balance mt-4" style={{ fontSize: 'clamp(26px, 3vw, 40px)', color: '#0A0A0A', letterSpacing: '-0.035em', lineHeight: 1 }}>
                    Comment 3 avis Google ont coûté 50 000 € à un bistrot parisien.
                  </h2>
                  <p className="mt-5 text-[16px] text-zinc-600 leading-relaxed">
                    On a passé 3 semaines à éplucher les comptes d'un restaurant du 11<sup>e</sup> qui est passé de 4,5 à 3,9 étoiles. La baisse de réservations a été plus rapide et plus brutale que tout ce qu'on avait imaginé.
                  </p>
                </div>
                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ background: '#E8920A' }}>YG</div>
                    <div>
                      <p className="text-[13px] font-semibold" style={{ color: '#0A0A0A' }}>Yann Grigoriev</p>
                      <p className="text-[11px] text-zinc-500">CEO, Splitzy</p>
                    </div>
                  </div>
                  <div className="blog-post-arrow w-10 h-10 rounded-xl bg-ink-900 text-white flex items-center justify-center" style={{ background: '#0A0A0A' }}>
                    <ArrowUpRight />
                  </div>
                </div>
              </div>
            </div>
          </Link>

          */ }

          {/* Article grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARTICLES.map(article => {
              if (article.dark) {
                return (
                  <Link key={article.id} to={`/blog/${article.slug}`} onClick={() => window.scrollTo(0, 0)} className="blog-post group rounded-2xl overflow-hidden flex flex-col p-7 border" style={{ background: '#0A0A0A', borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10.5px] font-semibold" style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E8920A' }} />
                        Opinion
                      </span>
                      <span className="text-[11px] text-zinc-500">{article.date}</span>
                    </div>
                    <h3 className="blog-post-title font-extrabold mt-8 text-balance leading-tight" style={{ fontSize: 26, color: 'white', letterSpacing: '-0.035em', lineHeight: 1 }}>
                      On en a marre du <span style={{ color: '#E8920A' }}>"premium"</span> qui veut dire <span className="line-through text-zinc-500">cher</span>.
                    </h3>
                    <p className="mt-4 text-[14px] text-zinc-400 leading-relaxed flex-1">{article.excerpt}</p>
                    <div className="mt-6 pt-6 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: article.author.bg }}>
                          {article.author.initials}
                        </div>
                        <span className="text-[12px] text-zinc-400">{article.author.name} · {article.readTime}</span>
                      </div>
                      <div className="blog-post-arrow" style={{ color: '#E8920A' }}>
                        <ArrowUpRight color="#E8920A" />
                      </div>
                    </div>
                  </Link>
                )
              }

              return (
                <Link key={article.id} to={`/blog/${article.slug}`} onClick={() => window.scrollTo(0, 0)} className="blog-post group bg-white border border-zinc-200 rounded-2xl overflow-hidden flex flex-col">
                  <ArticleCover article={article} />
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-[11px] tracking-[0.14em] uppercase text-zinc-500 font-semibold">{article.date} · {article.readTime}</p>
                    <h3 className="blog-post-title font-bold text-[19px] mt-3 leading-snug text-balance" style={{ color: '#0A0A0A' }}>
                      {article.title}
                    </h3>
                    <p className="mt-3 text-[13.5px] text-zinc-600 leading-relaxed flex-1">{article.excerpt}</p>
                    <div className="mt-5 pt-5 flex items-center justify-between" style={{ borderTop: '1px solid #ECECEE' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: article.author.bg }}>
                          {article.author.initials}
                        </div>
                        <span className="text-[12px] text-zinc-600">{article.author.name}</span>
                      </div>
                      <div className="blog-post-arrow text-zinc-400">
                        <ArrowUpRight />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* HIDDEN — "38 restants" fictif
          <div className="mt-12 flex justify-center">
            <button className="inline-flex items-center gap-2 bg-white border border-zinc-200 hover:border-zinc-800 text-[14px] font-semibold px-5 py-3 rounded-xl transition" style={{ color: '#0A0A0A' }}>
              Charger plus d'articles
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-500 font-mono text-[12px]">38 restants</span>
            </button>
          </div> */}
        </div>
      </section>

      {/* HIDDEN — Séries fictives + marquee "Lus en ce moment" (0 abonnés réels) — passer false à true pour remettre */}
      {false && <section className="relative py-24 overflow-hidden" style={{ background: '#0A0A0A' }}>
        <div
          aria-hidden="true"
          className="absolute -bottom-32 right-0 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(232,146,10,0.10), transparent 70%)' }}
        />
        <div className="relative max-w-[1100px] mx-auto px-6">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
            <div>
              <div className="mb-5">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold" style={{ background: 'rgba(232,146,10,0.12)', color: '#E8920A' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E8920A' }} />
                  Les séries
                </span>
              </div>
              <h2 className="text-white text-balance" style={{ fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1, fontSize: 'clamp(36px, 5vw, 48px)' }}>
                Des dossiers qui prennent
                <span className="block" style={{ color: '#E8920A' }}>leur temps.</span>
              </h2>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-[13px] font-semibold text-white hover:text-orange-400 transition-colors">
              Toutes les séries <ArrowRight />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SERIES.map(s => (
              <a
                key={s.title}
                href="#"
                className="group block rounded-2xl p-7 border transition"
                style={{ background: '#18181B', borderColor: 'rgba(255,255,255,0.05)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,146,10,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}
              >
                <div className="flex items-center justify-between text-[11px] tracking-[0.16em] uppercase text-zinc-500 font-semibold">
                  <span>Série · {s.episodes} épisodes</span>
                  <span style={{ color: '#E8920A' }}>▶</span>
                </div>
                <h3 className="font-extrabold mt-6 text-balance" style={{ fontSize: 24, color: 'white', letterSpacing: '-0.035em', lineHeight: 1 }}>{s.title}</h3>
                <p className="mt-3 text-[13px] text-zinc-400 leading-relaxed">{s.desc}</p>
                <div className="mt-6 flex items-center gap-3 text-[11px] text-zinc-500">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[11px]" style={{ background: 'rgba(232,146,10,0.2)', color: '#E8920A', letterSpacing: '-0.035em', lineHeight: 1 }}>
                    {s.progress}
                  </span>
                  <span>{s.progressLabel}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>}

      {/* HIDDEN — marquee "Lus en ce moment chez nos abonnés" (0 abonnés réels) — passer false à true pour remettre */}
      {false && (
      <section className="py-14 border-t" style={{ background: '#0A0A0A', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-[1100px] mx-auto px-6 mb-6 flex items-center gap-3 text-[11px] tracking-[0.16em] uppercase text-zinc-500 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
          Lus en ce moment chez nos abonnés
        </div>
        <div className="relative overflow-hidden">
          <div className="blog-marquee">
            {[...TRENDING, ...TRENDING].map((t, i) => (
              i % 2 === 0
                ? <span key={i} className="text-[15px] text-zinc-400">{t}</span>
                : <span key={i} className="text-zinc-700">·</span>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── NEWSLETTER (orange) ── */}
      <section id="newsletter" className="relative overflow-hidden text-white" style={{ background: '#E8920A' }}>
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(135deg, white 0 24px, transparent 24px 48px)', backgroundSize: '48px 48px' }}
        />
        <div className="relative max-w-[900px] mx-auto px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 backdrop-blur text-white text-[11px] font-semibold tracking-[0.16em] uppercase px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            Newsletter · chaque mardi · 7h
          </div>
          <h2 className="text-white text-balance mt-7" style={{ fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.95, fontSize: 'clamp(44px, 6vw, 68px)' }}>
            L'essentiel de la
            <span className="block">restauration moderne.</span>
          </h2>
          <p className="mt-6 max-w-[520px] mx-auto text-[16px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Un article, une donnée, une opinion. Lu en 4 minutes au comptoir, avant le service. Pas de spam, jamais de pub.
          </p>

          <form
            className="mt-10 max-w-[480px] mx-auto flex items-stretch bg-white rounded-xl p-1.5"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}
            onSubmit={e => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="votre@email.fr"
              className="flex-1 px-4 py-3 bg-transparent text-[14px] outline-none placeholder:text-zinc-400"
              style={{ color: '#0A0A0A' }}
            />
            <button
              type="submit"
              className="text-white text-[14px] font-semibold px-5 py-3 rounded-lg transition hover:bg-zinc-900"
              style={{ background: '#0A0A0A' }}
            >
              S'abonner
            </button>
          </form>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {/* HIDDEN '12 000 abonnés' fictif */}
            {['Désabonnement en 1 clic', '100% écrit à la main'].map(t => (
              <span key={t} className="flex items-center gap-1.5"><CheckIcon /> {t}</span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
