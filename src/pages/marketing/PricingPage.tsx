import { Navbar } from './Navbar'
import { PricingPreview } from './PricingPreview'
import { CtaFinal } from './CtaFinal'
import { Footer } from './Footer'

export function PricingPage() {
  return (
    <div className="marketing-site w-full min-h-screen bg-ink-900">
      <Navbar />
      <main className="pt-16">
        <PricingPreview />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  )
}
