import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '@clerk/clerk-react'
import { SessionProvider, useSession } from './context/SessionContext'
import { PhoneWrapper } from './components/layout/PhoneWrapper'
import { RestaurantApp } from './restaurant/RestaurantApp'

import { Landing } from './pages/Landing'
import { Profile } from './pages/Profile'
import { Table } from './pages/Table'
import { Items } from './pages/Items'
import { Recap } from './pages/Recap'
import { Tip } from './pages/Tip'
import { Payment } from './pages/Payment'
import { Confirmation } from './pages/Confirmation'
import { Feedback } from './pages/Feedback'
import { FeedbackSent } from './pages/FeedbackSent'
import { TableEntry } from './pages/TableEntry'

import { Homepage } from './pages/marketing/Homepage'
import { AboutPage } from './pages/marketing/AboutPage'
import { BlogPage } from './pages/marketing/BlogPage'
import { ContactPage } from './pages/marketing/ContactPage'
import { PricingPage } from './pages/marketing/PricingPage'
import { CarriersPage } from './pages/marketing/CarriersPage'
import { PaymentPage } from './pages/marketing/PaymentPage'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

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
          <Route path="/table"         element={<ProtectedRoute><Table /></ProtectedRoute>} />
          <Route path="/items"         element={<ProtectedRoute><Items /></ProtectedRoute>} />
          <Route path="/recap"         element={<ProtectedRoute><Recap /></ProtectedRoute>} />
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

function ConsumerAppGuard() {
  const { isSignedIn, isLoaded } = useAuth()
  const { state } = useSession()
  const location = useLocation()

  // QR code table routes are always public — never block customers.
  // window.location.pathname is checked first: useLocation() can lag during
  // Clerk re-initialization on hard refresh, causing a spurious auth redirect.
  if (window.location.pathname.startsWith('/t/') || location.pathname.startsWith('/t/')) {
    return <ConsumerAppContent />
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Authenticated Clerk user with no active table context → restaurant owner, send to dashboard
  // If restaurantName is set, they arrived via a QR code scan → let them through
  if (isSignedIn && !state.restaurantName) {
    return <Navigate to="/restaurant/onboarding" replace />
  }

  return <ConsumerAppContent />
}

function AppRoutes() {
  if (!clerkReady) return <ConsumerAppContent />
  return <ConsumerAppGuard />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Marketing pages */}
        <Route path="/" element={<Homepage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/careers" element={<CarriersPage />} />
        <Route path="/how-it-works" element={<PaymentPage />} />
        <Route path="/demo" element={<PaymentPage />} />

        {/* Restaurant owner dashboard */}
        <Route path="/restaurant/*" element={<RestaurantApp />} />

        {/* Consumer QR client — /welcome + /t/:slug/:tableNumber + flow */}
        <Route
          path="/*"
          element={
            <SessionProvider>
              <AppRoutes />
            </SessionProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
