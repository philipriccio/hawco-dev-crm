'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/login/')

  if (isPublicRoute) {
    return (
      <main className="min-h-screen bg-[#F2F4F7]/50">
        {children}
      </main>
    )
  }

  return (
    <div className="flex h-screen bg-[#F2F4F7]/50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
