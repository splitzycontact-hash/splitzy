import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { ConvexProvider } from 'convex/react'
import { HelmetProvider } from 'react-helmet-async'
import { convex } from './lib/convex'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'
import App from './App.tsx'

Sentry.init({
  dsn: "https://bcdfbc2e0810fbaf10d7f5d4a58f01d5@o4511620681236480.ingest.de.sentry.io/4511620692115536",
  environment: import.meta.env.MODE,
  release: 'splitzy@1.0.0',
  tracesSampleRate: 0.1,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={
      <div style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ fontSize: 14, color: '#666' }}>
          Une erreur est survenue. L'équipe a été notifiée.
        </p>
      </div>
    }>
      <HelmetProvider>
        <ErrorBoundary scope="root">
          <ConvexProvider client={convex}>
            <App />
          </ConvexProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
