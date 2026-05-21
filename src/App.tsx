import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, LazyMotion, domAnimation } from 'framer-motion'
import { SessionProvider, useSession } from './context/SessionContext'
import { PhoneWrapper } from './components/layout/PhoneWrapper'

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

function ConsumerAppContent() {
  const location = useLocation()
  return (
    <PhoneWrapper>
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
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/careers" element={<CarriersPage />} />
            <Route path="/how-it-works" element={<MarketingPaymentPage />} />
            <Route path="/demo" element={<MarketingPaymentPage />} />

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
