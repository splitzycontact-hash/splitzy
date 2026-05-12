import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { PrintProvider, usePrintState } from '../context/PrintContext'
import { PrintReport } from '../components/PrintReport'

interface RestaurantLayoutProps {
  children: ReactNode
}

export function RestaurantLayout({ children }: RestaurantLayoutProps) {
  const print = usePrintState()

  return (
    <PrintProvider onOpen={print.open}>
      <div className="flex h-screen w-full min-w-[1024px] overflow-hidden bg-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
      <PrintReport open={print.isOpen} onClose={print.close} />
    </PrintProvider>
  )
}
