import { Helmet } from 'react-helmet-async'
import { Navbar } from './Navbar'
import { PricingPreview } from './PricingPreview'
import { CtaFinal } from './CtaFinal'
import { Footer } from './Footer'

export function PricingPage() {
  return (
    <div className="marketing-site w-full min-h-screen bg-ink-900">
      <Helmet>
        <title>Tarifs — Splitzy</title>
        <meta name="description" content="Commencez gratuitement, passez Pro quand vous êtes prêt. Aucun engagement, aucun frais caché. Splitzy s'adapte à la taille de votre restaurant." />
      </Helmet>
      <Navbar />
      <main className="pt-16">
        <PricingPreview />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  )
}
