import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { ConvexProvider } from 'convex/react'
import { convex } from './lib/convex'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'
import App from './App.tsx'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
const clerkReady = typeof CLERK_KEY === 'string' && CLERK_KEY.startsWith('pk_') && CLERK_KEY.length > 20

const inner = (
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary scope="root">
      {clerkReady ? (
        <ClerkProvider
          publishableKey={CLERK_KEY!}
          signInForceRedirectUrl="/restaurant/onboarding"
          signUpForceRedirectUrl="/restaurant/onboarding"
          allowedRedirectOrigins={['https://splitzy.fr', 'https://www.splitzy.fr']}
        >
          {inner}
        </ClerkProvider>
      ) : (
        inner
      )}
    </ErrorBoundary>
  </StrictMode>,
)
