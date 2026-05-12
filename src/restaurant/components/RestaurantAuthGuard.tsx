import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

function GuardWithClerk({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Chargement...</span>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/restaurant/sign-in" replace />
  }

  return <>{children}</>
}

export function RestaurantAuthGuard({ children }: { children: React.ReactNode }) {
  if (!clerkReady) return <>{children}</>
  return <GuardWithClerk>{children}</GuardWithClerk>
}
