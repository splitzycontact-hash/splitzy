import { Navbar } from './Navbar'
import { Hero } from './Hero'
import { Logos } from './Logos'
import { HowItWorks } from './HowItWorks'
import { Features } from './Features'
import { Stats } from './Stats'
import { Solution } from './Solution'
import { Testimonials } from './Testimonials'
import { PricingPreview } from './PricingPreview'
import { Faq } from './Faq'
import { CtaFinal } from './CtaFinal'
import { Footer } from './Footer'

export function Homepage() {
  return (
    <div className="marketing-site w-full min-h-screen bg-ink-900">
      <Navbar />
      <main>
        <Hero />
        <Logos />
        <HowItWorks />
        <Features />
        <Stats />
        <Solution />
        <Testimonials />
        <PricingPreview />
        <Faq />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  )
}
