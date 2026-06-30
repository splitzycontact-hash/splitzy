import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'splitzy-93',
      project: 'javascript-react',
      // SENTRY_AUTH_TOKEN doit être configuré dans les env vars Vercel (build time)
      // Scopes requis : project:releases, org:read
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Upload les source maps et les supprimer du bundle final
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      release: {
        // Utilise le SHA git comme version de release pour lier les erreurs au commit
        inject: true,
        create: true,
        finalize: true,
      },
      telemetry: false,
    }),
  ],
  build: {
    // Générer les source maps pour le plugin Sentry
    sourcemap: true,
  },
})
