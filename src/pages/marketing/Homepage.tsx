import { Helmet } from 'react-helmet-async'
import { Navbar } from './Navbar'
import { Hero } from './Hero'
// import { Logos } from './Logos' // HIDDEN — fake client logos (0 clients)
import { HowItWorks } from './HowItWorks'
import { LogoMarquee } from './LogoMarquee'
import { Features } from './Features'
import { Stats } from './Stats'
import { Solution } from './Solution'
// import { Testimonials } from './Testimonials' // HIDDEN — fake testimonials (0 clients)
import { PricingPreview } from './PricingPreview'
import { Faq } from './Faq'
import { CtaFinal } from './CtaFinal'
import { Footer } from './Footer'

export function Homepage() {
  return (
    <div className="marketing-site w-full min-h-screen bg-ink-900">
      <Helmet>
        <title>Splitzy — Encaissement intelligent et pilotage centralisé pour votre restaurant</title>
        <meta name="description" content="Vos clients paient et partagent l'addition par QR code, synchronisé avec votre caisse. Avis Google automatisés, pilotage en temps réel. Demandez une démo de Splitzy." />
      </Helmet>
      <Navbar />
      <main>
        <Hero />
        {/* <Logos /> */}
        <HowItWorks />
        <LogoMarquee />
        <Features />
        <Stats />
        <Solution />
        {/* <Testimonials /> */}
        <PricingPreview />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  )
}
