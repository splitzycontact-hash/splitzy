import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { SessionProvider, useSession } from './context/SessionContext'
import { PhoneWrapper } from './components/layout/PhoneWrapper'

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

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state } = useSession()
  if (!state.userName.trim()) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  const location = useLocation()

  return (
    <PhoneWrapper>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/table"
            element={
              <ProtectedRoute>
                <Table />
              </ProtectedRoute>
            }
          />
          <Route
            path="/items"
            element={
              <ProtectedRoute>
                <Items />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recap"
            element={
              <ProtectedRoute>
                <Recap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tip"
            element={
              <ProtectedRoute>
                <Tip />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/confirmation"
            element={
              <ProtectedRoute>
                <Confirmation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Feedback />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback/sent"
            element={
              <ProtectedRoute>
                <FeedbackSent />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </PhoneWrapper>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <AppRoutes />
      </SessionProvider>
    </BrowserRouter>
  )
}
