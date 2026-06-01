import { Routes, Route, Navigate } from 'react-router-dom'
import { RestaurantAuthGuard } from './components/RestaurantAuthGuard'
import { RestaurantGuard } from './components/RestaurantGuard'
import { RestaurantSignIn } from './pages/RestaurantSignIn'
import { RestaurantOnboarding } from './pages/RestaurantOnboarding'
import { Overview } from './pages/Overview'
import { Tables } from './pages/Tables'
import { Reputation } from './pages/Reputation'
import { Analytics } from './pages/Analytics'
import { Factures } from './pages/Factures'
import { Integrations } from './pages/Integrations'
import { MenuPage } from './pages/MenuPage'
import { Clients } from './pages/Clients'
import { Settings } from './pages/Settings'

export function RestaurantApp() {
  return (
    <Routes>
      <Route path="/sign-in" element={<RestaurantSignIn />} />
      <Route path="/onboarding" element={<RestaurantOnboarding />} />
      <Route
        path="/*"
        element={
          <RestaurantAuthGuard>
            <Routes>
              <Route
                path="/*"
                element={
                  <RestaurantGuard>
                    <Routes>
                      <Route path="/"             element={<Overview />} />
                      <Route path="/tables"       element={<Tables />} />
                      <Route path="/reputation"   element={<Reputation />} />
                      <Route path="/analytics"    element={<Analytics />} />
                      <Route path="/factures"     element={<Factures />} />
                      <Route path="/integrations" element={<Integrations />} />
                      <Route path="/menu"         element={<MenuPage />} />
                      <Route path="/clients"      element={<Clients />} />
                      <Route path="/settings"     element={<Settings />} />
                      {/* Legacy redirect */}
                      <Route path="/feedbacks"    element={<Navigate to="/restaurant/reputation" replace />} />
                      <Route path="*"             element={<Navigate to="/restaurant" replace />} />
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
