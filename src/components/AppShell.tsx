'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const drawer = useRef<HTMLDialogElement>(null)
  const menu = useRef<HTMLButtonElement>(null)
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/login/')
  const closeDrawer = () => {
    drawer.current?.close()
    menu.current?.focus()
  }

  useEffect(() => {
    if (isPublicRoute) return
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        drawer.current?.close()
        router.push('/search')
      }
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onResize = () => { if (desktop.matches) drawer.current?.close() }
    window.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onResize)
    }
  }, [isPublicRoute, router])

  if (isPublicRoute) return <main className="min-h-screen bg-[#F2F4F7]/50">{children}</main>

  return (
    <div className="flex h-dvh bg-[#F2F4F7]/50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:p-3">Skip to content</a>
      <aside className="hidden shrink-0 lg:block"><Sidebar /></aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button ref={menu} type="button" aria-label="Open navigation" aria-haspopup="dialog" aria-controls="mobile-navigation" className="rounded border border-slate-300 px-3 py-2" onClick={() => drawer.current?.showModal()}>Menu</button>
          <span className="font-semibold">Hawco</span>
          <Link href="/search" className="rounded px-3 py-2 text-blue-700">Search</Link>
        </header>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
      <dialog ref={drawer} id="mobile-navigation" aria-label="Navigation" className="m-0 h-dvh max-h-none w-72 max-w-[90vw] border-0 bg-slate-950 p-0 text-white backdrop:bg-slate-950/60" onClose={() => menu.current?.focus()} onClick={(event) => { if (event.target === event.currentTarget) closeDrawer() }}>
        <div className="flex h-full flex-col">
          <button type="button" autoFocus onClick={closeDrawer} className="m-3 self-end rounded border border-slate-500 px-3 py-2">Close navigation</button>
          <div className="min-h-0 flex-1"><Sidebar onNavigate={closeDrawer} /></div>
        </div>
      </dialog>
    </div>
  )
}
