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
        <meta name="description" content="Un plan gratuit pour découvrir, Essentiel et Pro pour piloter votre service. Aucun engagement, aucun frais caché. Demandez une démo — Splitzy s'adapte à la taille de votre restaurant." />
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
