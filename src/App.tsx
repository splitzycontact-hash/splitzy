import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, LazyMotion, domAnimation } from 'framer-motion'
import { useQuery } from 'convex/react'
import { SessionProvider, useSession } from './context/SessionContext'
import { PhoneWrapper } from './components/layout/PhoneWrapper'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'

// TableEntry est l'entrée QR — eager-load pour éviter un round-trip chunk
// supplémentaire sur Safari iOS (économise 300-500ms sur le chemin critique).
import { TableEntry } from './pages/TableEntry'

// Consumer flow — chargé à la demande
const Landing      = lazy(() => import('./pages/Landing').then(({ Landing })           => ({ default: Landing })))
const Profile      = lazy(() => import('./pages/Profile').then(({ Profile })           => ({ default: Profile })))
const Items        = lazy(() => import('./pages/Items').then(({ Items })               => ({ default: Items })))
const Tip          = lazy(() => import('./pages/Tip').then(({ Tip })                   => ({ default: Tip })))
const Payment      = lazy(() => import('./pages/Payment').then(({ Payment })           => ({ default: Payment })))
const Confirmation = lazy(() => import('./pages/Confirmation').then(({ Confirmation }) => ({ default: Confirmation })))
const Feedback     = lazy(() => import('./pages/Feedback').then(({ Feedback })         => ({ default: Feedback })))
const FeedbackSent = lazy(() => import('./pages/FeedbackSent').then(({ FeedbackSent }) => ({ default: FeedbackSent })))

// Dashboard restaurant + Clerk — tout chargé à la demande (Clerk absent du bundle initial)
const RestaurantRoot = lazy(() => import('./restaurant/RestaurantRoot'))

// Pages marketing — chargées à la demande
const Homepage    = lazy(() => import('./pages/marketing/Homepage').then(({ Homepage })       => ({ default: Homepage })))
const AboutPage   = lazy(() => import('./pages/marketing/AboutPage').then(({ AboutPage })     => ({ default: AboutPage })))
const BlogPage    = lazy(() => import('./pages/marketing/BlogPage').then(({ BlogPage })       => ({ default: BlogPage })))
const ContactPage = lazy(() => import('./pages/marketing/ContactPage').then(({ ContactPage }) => ({ default: ContactPage })))
const PricingPage = lazy(() => import('./pages/marketing/PricingPage').then(({ PricingPage }) => ({ default: PricingPage })))
const CarriersPage = lazy(() => import('./pages/marketing/CarriersPage').then(({ CarriersPage }) => ({ default: CarriersPage })))
const MarketingPaymentPage = lazy(() => import('./pages/marketing/PaymentPage').then(({ PaymentPage }) => ({ default: PaymentPage })))
const FonctionnalitesPage = lazy(() => import('./pages/marketing/Fonctionnalites').then(({ FonctionnalitesPage }) => ({ default: FonctionnalitesPage })))
const ChangelogPage = lazy(() => import('./pages/marketing/Changelog').then(({ ChangelogPage }) => ({ default: ChangelogPage })))
const PressePage = lazy(() => import('./pages/marketing/PressePage').then(({ PressePage }) => ({ default: PressePage })))
const AidePage = lazy(() => import('./pages/marketing/AidePage').then(({ AidePage }) => ({ default: AidePage })))
const SecuritePage = lazy(() => import('./pages/marketing/SecuritePage').then(({ SecuritePage }) => ({ default: SecuritePage })))
const PrivacyPage = lazy(() => import('./pages/marketing/PrivacyPage').then(({ PrivacyPage }) => ({ default: PrivacyPage })))
const LegalPage = lazy(() => import('./pages/marketing/LegalPage'))
const Unsubscribe = lazy(() => import('./pages/Unsubscribe').then(({ Unsubscribe }) => ({ default: Unsubscribe })))
const ExtraResponseConfirmation = lazy(() => import('./pages/ExtraResponseConfirmation').then(({ ExtraResponseConfirmation }) => ({ default: ExtraResponseConfirmation })))
const BlogArticlePage = lazy(() => import('./pages/marketing/BlogArticlePage').then(({ BlogArticlePage }) => ({ default: BlogArticlePage })))

function PageLoader() {
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FFFFFF',
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid #FFF4E5',
        borderTop: '3px solid #E8920A',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state } = useSession()
  if (!state.userName.trim()) {
    return <Navigate to="/welcome" replace />
  }
  return <>{children}</>
}

// M5 — Watcher temps réel "Forcer le paiement". Abonné à la table Convex tant
// que le convive est dans le flow ; quand le manager déclenche tables.forcePayment
// (forcePaymentMode → true), redirige automatiquement vers l'écran paiement.
// TableEntry ne peut pas porter ce watch : il se démonte dès la navigation vers
// /welcome. On garde donc le watcher monté au niveau de ConsumerAppContent.
function ForcePaymentWatcher() {
  const { state } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const liveTable = useQuery(
    api.tables.getOne,
    state.convexTableId ? { tableId: state.convexTableId as Id<'tables'> } : 'skip',
  )
  useEffect(() => {
    if (!liveTable?.forcePaymentMode) return
    // /payment est ProtectedRoute (userName requis) : sans nom, la redirection
    // rebondirait vers /welcome en boucle. On attend que le convive soit entré.
    if (!state.userName.trim()) return
    const p = location.pathname
    // Déjà sur l'écran paiement ou au-delà → ne pas couper le flow.
    if (p === '/payment' || p === '/confirmation' || p === '/feedback' || p === '/feedback/sent') return
    navigate('/payment', { replace: true })
  }, [liveTable?.forcePaymentMode, state.userName, location.pathname, navigate])
  return null
}

function ConsumerAppContent() {
  const location = useLocation()
  return (
    <PhoneWrapper>
      <ForcePaymentWatcher />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/t/:slug/:tableNumber" element={<TableEntry />} />
          <Route path="/welcome" element={<Landing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/items"         element={<ProtectedRoute><Items /></ProtectedRoute>} />
          <Route path="/tip"           element={<ProtectedRoute><Tip /></ProtectedRoute>} />
          <Route path="/payment"       element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/confirmation"  element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
          <Route path="/feedback"      element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
          <Route path="/feedback/sent" element={<ProtectedRoute><FeedbackSent /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </AnimatePresence>
    </PhoneWrapper>
  )
}

export default function App() {
  return (
    <LazyMotion features={domAnimation}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Pages marketing */}
            <Route path="/" element={<Homepage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/careers" element={<CarriersPage />} />
            <Route path="/how-it-works" element={<MarketingPaymentPage />} />
            <Route path="/demo" element={<MarketingPaymentPage />} />
            <Route path="/fonctionnalites" element={<FonctionnalitesPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/presse" element={<PressePage />} />
            <Route path="/aide" element={<AidePage />} />
            <Route path="/securite" element={<SecuritePage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/extra-response-confirmation" element={<ExtraResponseConfirmation />} />

            {/* Dashboard restaurant — Clerk chargé ici uniquement, absent du bundle initial */}
            <Route path="/restaurant/*" element={<RestaurantRoot />} />

            {/* Flow client QR — pas de Clerk */}
            <Route
              path="/*"
              element={
                <SessionProvider>
                  <ConsumerAppContent />
                </SessionProvider>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </LazyMotion>
  )
}
