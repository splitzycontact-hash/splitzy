import { Link } from 'react-router-dom'
import { SplitzyLogo } from './Navbar'
import { IconLinkedin, IconTwitter, IconInstagram } from './Icons'

const FOOTER_COLS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', to: '/fonctionnalites' },
      { label: 'Tarifs',          to: '/pricing' },
      { label: 'Démo',            to: '/demo' },
      { label: 'Changelog',       to: '/changelog' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'À propos',  to: '/about' },
      { label: 'Blog',      to: '/blog' },
      { label: 'Presse',    to: '/presse' },
      { label: 'Carrières', to: '/careers' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact',       to: '/contact' },
      { label: "Centre d'aide", to: '/aide' },
      { label: 'Sécurité',      to: '/securite' },
    ],
  },
]

const SOCIAL_LINKS = [
  { label: 'LinkedIn',    href: 'https://linkedin.com/company/splitzy', Icon: IconLinkedin  },
  { label: 'Twitter / X', href: 'https://x.com/splitzy',               Icon: IconTwitter   },
  { label: 'Instagram',   href: 'https://instagram.com/splitzy',        Icon: IconInstagram },
]

export function Footer() {
  return (
    <footer className="relative bg-ink-900 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-14 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-y-10 gap-x-8">
          {/* Brand col */}
          <div className="col-span-2 md:col-span-4 max-w-sm">
            <SplitzyLogo />
            <p className="mt-4 text-[14px] leading-[1.6] text-white/55">
              Le partage d'addition sans friction, pensé pour les restaurants français modernes.
            </p>
            <ul className="mt-6 flex items-center gap-2">
              {SOCIAL_LINKS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    aria-label={s.label}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.05] border border-white/10 text-white/70 hover:bg-white/[0.1] hover:text-white hover:border-white/20 transition-colors"
                  >
                    <s.Icon size={16} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link cols — <Link to> pour navigation client-side sans rechargement */}
          {FOOTER_COLS.map((col) => (
            <div key={col.title} className="md:col-span-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/40 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      onClick={() => window.scrollTo(0, 0)}
                      className="text-[14px] text-white/75 hover:text-orange-400 transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact col */}
          <div className="col-span-2 md:col-span-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/40 mb-4">
              On parle ?
            </h4>
            <a
              href="mailto:contact@splitzy.fr"
              className="block text-[14px] text-white/85 hover:text-orange-400 transition-colors mb-2"
            >
              contact@splitzy.fr
            </a>
            <p className="text-[12px] text-white/45 leading-[1.5]">
              Paris, France<br />
              Réponse sous 24h ouvrées
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-7 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-[13px] text-white/45">
            © {new Date().getFullYear()} Splitzy SAS · Tous droits réservés.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/55">
            <li><Link to="/legal"   onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">CGU</Link></li>
            <li><Link to="/privacy" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Confidentialité</Link></li>
            <li><Link to="/legal"   onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition-colors">Mentions légales</Link></li>
            <li className="inline-flex items-center gap-1.5 text-white/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              <a
                href="https://status.splitzy.fr"
                target="_blank" rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                Tous les systèmes opérationnels
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
