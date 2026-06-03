import { SignIn } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'

export function RestaurantSignIn() {
  const [params] = useSearchParams()
  // Permet de revenir sur une page précise après login (ex: accept-invite).
  // On n'accepte que des chemins internes pour éviter les redirections ouvertes.
  const rawRedirect = params.get('redirect')
  const redirectUrl = rawRedirect && rawRedirect.startsWith('/') ? rawRedirect : '/restaurant/onboarding'
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <div className="text-3xl font-black tracking-tight text-dark mb-1">
          Split<span className="text-brand">zy</span>
        </div>
        <div className="text-sm text-muted">Interface gérant</div>
      </div>
      <SignIn
        forceRedirectUrl={redirectUrl}
        signUpForceRedirectUrl={redirectUrl}
        appearance={{
          variables: {
            colorPrimary: '#E8920A',
            colorTextOnPrimaryBackground: '#ffffff',
            fontFamily: 'Inter, system-ui, sans-serif',
            borderRadius: '12px',
          },
          elements: {
            card: 'shadow-card border border-border',
            headerTitle: 'font-bold',
          },
        }}
      />
    </div>
  )
}
