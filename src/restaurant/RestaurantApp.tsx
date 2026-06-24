import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { RestaurantAuthGuard } from './components/RestaurantAuthGuard'
import { RestaurantGuard } from './components/RestaurantGuard'
import { RoleGuard } from './components/RoleGuard'
import { RestaurantSignIn } from './pages/RestaurantSignIn'
import { RestaurantOnboarding } from './pages/RestaurantOnboarding'
import { AcceptInvite } from './pages/AcceptInvite'
import { Overview } from './pages/Overview'
import { Tables } from './pages/Tables'
import { Reputation } from './pages/Reputation'
import { Analytics } from './pages/Analytics'
import { Factures } from './pages/Factures'
import { Integrations } from './pages/Integrations'
import { MenuPage } from './pages/MenuPage'
import { Clients } from './pages/Clients'
import { Planning } from './pages/Planning'
import { ExtrasPage } from './pages/ExtrasPage'
import { SallePage } from './pages/SallePage'
import { Settings } from './pages/Settings'
import { ChatPage } from './pages/ChatPage'
import { useChatNotifications } from './hooks/useChatNotifications'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

// Rattrape un token d'invitation en attente après un retour de Clerk. Clerk peut
// rediriger vers /restaurant ou /restaurant/onboarding (signUpForceRedirectUrl du
// ClerkProvider) au lieu de /accept-invite, et ne préserve pas toujours le query
// param `redirect` à travers le flow sign-up/verify. Le token, lui, survit en
// sessionStorage (même onglet) → dès que l'utilisateur est connecté, on le ramène
// sur /accept-invite pour déclencher l'auto-acceptation (sinon : aucune ligne
// `members` → getByMembership null → onboarding à tort).
function PendingInviteWatcher() {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const pendingToken = sessionStorage.getItem('pendingInviteToken')
    if (!pendingToken) return
    // Consomme immédiatement le token pour éviter toute boucle de redirection.
    sessionStorage.removeItem('pendingInviteToken')
    // Si Clerk nous a déjà amenés sur /accept-invite avec le bon token, on laisse
    // la page faire son auto-acceptation sans re-naviguer.
    const alreadyHere =
      location.pathname === '/restaurant/accept-invite' &&
      new URLSearchParams(location.search).get('token') === pendingToken
    if (!alreadyHere) {
      navigate(`/restaurant/accept-invite?token=${encodeURIComponent(pendingToken)}`, { replace: true })
    }
  }, [isLoaded, isSignedIn, location.pathname, location.search, navigate])

  return null
}

// Rendu à l'intérieur de RestaurantGuard (donc RestaurantProvider) : le hook a
// accès à restaurantId + au routeur (useLocation). Ne rend rien.
function ChatNotificationsMount() {
  useChatNotifications()
  return null
}

export function RestaurantApp() {
  return (
    <>
      {clerkReady && <PendingInviteWatcher />}
      <Routes>
      <Route path="/sign-in" element={<RestaurantSignIn />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
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
                    <ChatNotificationsMount />
                    <Routes>
                      <Route path="/"             element={<Overview />} />
                      <Route path="/tables"       element={<Tables />} />
                      <Route path="/salle"        element={<RoleGuard allowed={['owner', 'manager']}><SallePage /></RoleGuard>} />
                      <Route path="/chat"         element={<ChatPage />} />
                      <Route path="/reputation"   element={<Reputation />} />
                      <Route path="/analytics"    element={<Analytics />} />
                      <Route path="/factures"     element={<Factures />} />
                      <Route path="/integrations" element={<RoleGuard allowed={['owner']}><Integrations /></RoleGuard>} />
                      <Route path="/menu"         element={<MenuPage />} />
                      <Route path="/clients"      element={<RoleGuard allowed={['owner', 'manager']}><Clients /></RoleGuard>} />
                      <Route path="/planning"     element={<RoleGuard allowed={['owner', 'manager']}><Planning /></RoleGuard>} />
                      <Route path="/extras"       element={<RoleGuard allowed={['owner', 'manager']}><ExtrasPage /></RoleGuard>} />
                      <Route path="/settings"     element={<RoleGuard allowed={['owner', 'manager']}><Settings /></RoleGuard>} />
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
    </>
  )
}
