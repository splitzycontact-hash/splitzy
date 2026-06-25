import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { convex } from '../lib/convex'
import { RestaurantApp } from './RestaurantApp'

const clerkReady = (() => {
  const k = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
  return typeof k === 'string' && k.startsWith('pk_') && k.length > 20
})()

export default function RestaurantRoot() {
  if (clerkReady) {
    return (
      <ClerkProvider
        publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY!}
        signInForceRedirectUrl="/restaurant"
        signUpForceRedirectUrl="/restaurant"
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <RestaurantApp />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    )
  }
  return <RestaurantApp />
}
