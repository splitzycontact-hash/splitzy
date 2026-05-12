import { Routes, Route, Navigate } from 'react-router-dom'
import { RestaurantAuthGuard } from './components/RestaurantAuthGuard'
import { RestaurantGuard } from './components/RestaurantGuard'
import { RestaurantSignIn } from './pages/RestaurantSignIn'
import { RestaurantOnboarding } from './pages/RestaurantOnboarding'
import { Overview } from './pages/Overview'
import { Tables } from './pages/Tables'
import { Feedbacks } from './pages/Feedbacks'
import { Factures } from './pages/Factures'
import { Settings } from './pages/Settings'

export function RestaurantApp() {
  return (
    <Routes>
      <Route path="/sign-in" element={<RestaurantSignIn />} />
      <Route
        path="/*"
        element={
          <RestaurantAuthGuard>
            <Routes>
              <Route path="/onboarding" element={<RestaurantOnboarding />} />
              <Route
                path="/*"
                element={
                  <RestaurantGuard>
                    <Routes>
                      <Route path="/"          element={<Overview />} />
                      <Route path="/tables"    element={<Tables />} />
                      <Route path="/feedbacks" element={<Feedbacks />} />
                      <Route path="/factures"  element={<Factures />} />
                      <Route path="/settings"  element={<Settings />} />
                      <Route path="*"          element={<Navigate to="/restaurant" replace />} />
                    </Routes>
                  </RestaurantGuard>
                }
              />
            </Routes>
          </RestaurantAuthGuard>
        }
      />
    </Routes>
  )
}
