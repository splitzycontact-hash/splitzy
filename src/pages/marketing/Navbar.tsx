import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { IconArrowRight, IconMenu, IconClose } from './Icons'

const NAV_LINKS = [
  { label: 'Comment ça marche', href: '/#comment-ca-marche' },
  { label: 'Tarifs',            href: '/pricing' },
  { label: 'Blog',              href: '/blog' },
]

export function SplitzyLogo({ className = '' }: { className?: string }) {
  return (
    <a
      href="/"
      className={`inline-flex items-center select-none ${className}`}
      aria-label="Splitzy — retour à l'accueil"
    >
      <span className="text-[22px] font-black tracking-tight text-white">
        Split<span style={{ color: '#E8920A' }}>zy</span>
      </span>
    </a>
  )
}

function NavLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="text-[15px] transition-colors duration-150 whitespace-nowrap text-white/70 hover:text-white font-medium"
    >
      {label}
    </a>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const closeDrawer = () => setOpen(false)

  return (
    <>
      <header
        className={
          'fixed top-0 inset-x-0 z-50 transition-all duration-300 ' +
          (scrolled
            ? 'bg-ink-900/80 backdrop-blur-md border-b border-white/10'
            : 'bg-transparent border-b border-transparent')
        }
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="h-14 md:h-16 flex items-center justify-between gap-4 lg:gap-8">
            <SplitzyLogo />

            <nav className="hidden md:flex items-center gap-5 lg:gap-8">
              {NAV_LINKS.map((l) => (
                <NavLink key={l.href} {...l} />
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-2 shrink-0">
              <a
                href="/restaurant/sign-in"
                className="text-[14px] font-medium text-white/80 hover:text-white px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                Se connecter
              </a>
              <a
                href="/restaurant/onboarding"
                className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[14px] font-medium px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-orange-600/30 hover:-translate-y-0.5 whitespace-nowrap"
              >
                <span className="hidden lg:inline">Commencer gratuitement</span>
                <span className="lg:hidden">Commencer</span>
                <IconArrowRight size={15} />
              </a>
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={open}
              aria-controls="mobile-drawer"
              className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 text-white active:bg-white/10 rounded-lg"
            >
              <IconMenu size={22} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[60] md:hidden bg-ink-900 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.18 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
              <SplitzyLogo />
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Fermer le menu"
                className="inline-flex items-center justify-center w-11 h-11 -mr-2 text-white active:bg-white/10 rounded-lg"
              >
                <IconClose size={22} />
              </button>
            </div>

            <m.nav
              className="flex-1 overflow-y-auto px-6 pt-8 pb-6 flex flex-col"
              initial="hidden"
              animate="visible"
              variants={{
                hidden:  {},
                visible: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
              }}
            >
              {NAV_LINKS.map((l) => (
                <m.a
                  key={l.href}
                  href={l.href}
                  onClick={closeDrawer}
                  className="block py-4 text-[22px] font-semibold text-white border-b border-white/10"
                  variants={{
                    hidden:  { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
                  }}
                >
                  {l.label}
                </m.a>
              ))}

              <div className="mt-auto pt-8 flex flex-col gap-3">
                <a
                  href="/restaurant/onboarding"
                  onClick={closeDrawer}
                  className="inline-flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-700 text-white font-medium text-base px-6 py-4 rounded-xl shadow-lg shadow-orange-600/30"
                >
                  Commencer gratuitement
                  <IconArrowRight size={17} />
                </a>
                <a
                  href="/restaurant/sign-in"
                  onClick={closeDrawer}
                  className="inline-flex items-center justify-center text-white font-medium text-base px-6 py-4 rounded-xl border border-white/20 active:bg-white/5"
                >
                  Se connecter
                </a>
              </div>
            </m.nav>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
