import { useParams, Link } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { getArticleBySlug, BLOG_ARTICLES, type Block } from './blogData'

// ── Content block renderer ────────────────────────────────────────────────────
function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose-splitzy">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p':
            return (
              <p key={i} style={{ fontSize: 17, lineHeight: 1.75, color: '#3F3F46', marginBottom: 20 }}>
                {b.v}
              </p>
            )
          case 'h2':
            return (
              <h2
                key={i}
                style={{
                  fontWeight: 800,
                  fontSize: 'clamp(20px, 3vw, 26px)',
                  color: '#0A0A0A',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  marginTop: 40,
                  marginBottom: 14,
                }}
              >
                {b.v}
              </h2>
            )
          case 'h3':
            return (
              <h3
                key={i}
                style={{
                  fontWeight: 700,
                  fontSize: 19,
                  color: '#0A0A0A',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.3,
                  marginTop: 28,
                  marginBottom: 10,
                }}
              >
                {b.v}
              </h3>
            )
          case 'quote':
            return (
              <blockquote
                key={i}
                style={{
                  borderLeft: '3px solid #E8920A',
                  paddingLeft: 20,
                  marginLeft: 0,
                  marginTop: 28,
                  marginBottom: 28,
                }}
              >
                <p style={{ fontSize: 17, fontStyle: 'italic', color: '#0A0A0A', lineHeight: 1.7, marginBottom: b.author ? 8 : 0 }}>
                  "{b.v}"
                </p>
                {b.author && (
                  <span style={{ fontSize: 13, color: '#71717A', fontStyle: 'normal' }}>— {b.author}</span>
                )}
              </blockquote>
            )
          case 'ul':
            return (
              <ul key={i} style={{ marginBottom: 20, paddingLeft: 0, listStyle: 'none' }}>
                {b.v.map((item, j) => (
                  <li key={j} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 16, color: '#3F3F46', lineHeight: 1.65 }}>
                    <span style={{ color: '#E8920A', flexShrink: 0, marginTop: 2 }}>—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} style={{ marginBottom: 20, paddingLeft: 0, listStyle: 'none', counterReset: 'step' }}>
                {b.v.map((item, j) => (
                  <li key={j} style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 16, color: '#3F3F46', lineHeight: 1.65 }}>
                    <span
                      style={{
                        flexShrink: 0,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#FFF4E5',
                        color: '#E8920A',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}
                    >
                      {j + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            )
          case 'highlight':
            return (
              <div
                key={i}
                style={{
                  background: '#FFF4E5',
                  border: '1px solid rgba(232,146,10,0.25)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  marginTop: 24,
                  marginBottom: 24,
                  fontSize: 15,
                  color: '#7A4D05',
                  lineHeight: 1.65,
                  fontWeight: 500,
                }}
              >
                {b.v}
              </div>
            )
          case 'hr':
            return (
              <div key={i} style={{ borderTop: '1px solid #E4E4E7', marginTop: 32, marginBottom: 32 }} />
            )
          default:
            return null
        }
      })}
    </div>
  )
}

// ── Related articles ──────────────────────────────────────────────────────────
function RelatedArticles({ currentSlug }: { currentSlug: string }) {
  const others = BLOG_ARTICLES.filter(a => a.slug !== currentSlug).slice(0, 3)
  return (
    <div className="mt-16 pt-12" style={{ borderTop: '1px solid #E4E4E7' }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-8" style={{ color: '#E8920A' }}>
        À lire aussi
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {others.map(a => (
          <Link
            key={a.slug}
            to={`/blog/${a.slug}`}
            onClick={() => window.scrollTo(0, 0)}
            className="group block"
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: '#E8920A' }}
            >
              {a.category}
            </span>
            <p
              className="mt-2 text-[16px] font-bold leading-snug group-hover:underline"
              style={{ color: '#0A0A0A', textUnderlineOffset: 3 }}
            >
              {a.title}
            </p>
            <p className="mt-1.5 text-[13px]" style={{ color: '#71717A' }}>
              {a.date} · {a.readTime}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function ArticleCta() {
  return (
    <div
      className="mt-16 rounded-2xl p-8 md:p-10 text-center"
      style={{ background: '#18181B' }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-4" style={{ color: '#E8920A' }}>
        Passez à l'action
      </p>
      <h3
        className="text-white text-balance"
        style={{ fontWeight: 800, fontSize: 'clamp(22px, 3.5vw, 30px)', letterSpacing: '-0.02em', lineHeight: 1.15 }}
      >
        Protégez votre note Google dès ce soir.
      </h3>
      <p className="mt-3 text-[15px] max-w-[400px] mx-auto leading-relaxed" style={{ color: '#A1A1AA' }}>
        Installation en 15 minutes. Sans engagement.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href="/contact"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-semibold text-white"
          style={{ background: '#E8920A' }}
        >
          Demander une démo →
        </a>
        <a
          href="/demo"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-medium text-white"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        >
          Voir une démo
        </a>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getArticleBySlug(slug) : undefined

  if (!article) {
    return (
      <div className="w-full min-h-screen" style={{ background: '#FAFAFA' }}>
        <Navbar />
        <div className="max-w-[680px] mx-auto px-6 py-40 text-center">
          <p className="text-[48px] mb-4">404</p>
          <h1 className="text-[24px] font-bold mb-4" style={{ color: '#0A0A0A' }}>
            Article introuvable.
          </h1>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-[15px] font-medium underline underline-offset-4"
            style={{ color: '#E8920A' }}
          >
            ← Retour au blog
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen" style={{ background: '#FAFAFA' }}>
      <Navbar />

      {/* ── Article header ── */}
      <header className="pt-[120px] pb-0" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[720px] mx-auto px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[13px] mb-8" style={{ color: '#71717A' }}>
            <Link to="/blog" className="hover:underline underline-offset-4" style={{ color: '#71717A' }}>Blog</Link>
            <span>/</span>
            <span style={{ color: '#E8920A' }}>{article.category}</span>
          </div>

          {/* Category + date */}
          <div className="flex items-center gap-3 mb-5">
            <span
              className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ background: '#FFF4E5', color: '#E8920A' }}
            >
              {article.category}
            </span>
            <span className="text-[13px]" style={{ color: '#71717A' }}>
              {article.date} · {article.readTime} de lecture
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-balance"
            style={{
              fontWeight: 900,
              fontSize: 'clamp(28px, 5vw, 44px)',
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              color: '#0A0A0A',
              marginBottom: 20,
            }}
          >
            {article.title}
          </h1>

          {/* Excerpt */}
          <p
            className="text-balance"
            style={{ fontSize: 18, lineHeight: 1.6, color: '#52525B', marginBottom: 32 }}
          >
            {article.excerpt}
          </p>

          {/* Author */}
          <div
            className="flex items-center gap-3 pb-10"
            style={{ borderBottom: '1px solid #E4E4E7' }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
              style={{ background: article.author.bg }}
            >
              {article.author.initials}
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: '#0A0A0A' }}>
                {article.author.name}
              </p>
              <p className="text-[12px]" style={{ color: '#71717A' }}>
                {article.author.role}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Article body ── */}
      <article className="py-12" style={{ background: '#FAFAFA' }}>
        <div className="max-w-[720px] mx-auto px-6">
          <Blocks blocks={article.blocks} />
          <ArticleCta />
          <RelatedArticles currentSlug={article.slug} />
        </div>
      </article>

      <Footer />
    </div>
  )
}
