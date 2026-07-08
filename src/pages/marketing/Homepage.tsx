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
        <title>Splitzy — Pilotez votre restaurant à distance, encaissez plus vite</title>
        <meta name="description" content="Plan de salle en direct, KPIs temps réel, équipe, insights IA — et le paiement fractionné par QR code, sans application. Pilotez votre restaurant même sans y être. Essayez Splitzy gratuitement." />
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
