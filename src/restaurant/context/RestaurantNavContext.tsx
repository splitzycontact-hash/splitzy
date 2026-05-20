import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface RestaurantNavContextValue {
  sidebarOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void
}

const RestaurantNavContext = createContext<RestaurantNavContextValue>({
  sidebarOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
})

export function RestaurantNavProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <RestaurantNavContext.Provider
      value={{
        sidebarOpen,
        openSidebar: () => setSidebarOpen(true),
        closeSidebar: () => setSidebarOpen(false),
      }}
    >
      {children}
    </RestaurantNavContext.Provider>
  )
}

export function useRestaurantNav() {
  return useContext(RestaurantNavContext)
}
