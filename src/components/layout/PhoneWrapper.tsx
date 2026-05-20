import type { ReactNode } from 'react'

interface PhoneWrapperProps {
  children: ReactNode
}

export function PhoneWrapper({ children }: PhoneWrapperProps) {
  return (
    <>
      {/* Desktop: iPhone-style frame */}
      <div className="hidden md:flex items-center justify-center min-h-screen w-full bg-bg py-8 relative">
        <div
          className="relative flex flex-col overflow-hidden bg-white"
          style={{
            width: 390,
            minHeight: 844,
            borderRadius: 44,
            border: '8px solid #1a1a1a',
            boxShadow: '0 40px 80px rgba(0,0,0,0.4), inset 0 0 0 1px #333',
          }}
        >
          {/* Notch bar */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-6 text-white text-xs font-semibold"
            style={{ background: '#0d0d0d', height: 48 }}
          >
            <span>9:41</span>
            <div
              className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full"
              style={{ width: 120, height: 30, top: 8 }}
            />
            <span className="flex items-center gap-1">
              <span>●●●</span>
              <span>5G</span>
              <span>🔋</span>
            </span>
          </div>

          {/* Screen content */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ background: '#F4F4F5' }}>
            {children}
          </div>
        </div>
      </div>

      {/* Mobile: full screen */}
      <div className="md:hidden flex flex-col w-full" style={{ background: '#F4F4F5', minHeight: '100dvh' }}>
        {children}
      </div>
    </>
  )
}
