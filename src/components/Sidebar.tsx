'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: DashboardIcon },
  { name: 'Development Board', href: '/whiteboard', icon: BoardIcon },
  { name: 'Projects', href: '/projects', icon: ProjectsIcon },
  { name: 'Coverage', href: '/coverage', icon: CoverageIcon },
  { name: 'Contacts', href: '/contacts', icon: ContactsIcon },
  { name: 'Meetings', href: '/meetings', icon: MeetingsIcon },
  { name: 'Materials', href: '/materials', icon: MaterialsIcon },
  { name: 'Market Intel', href: '/market-intel', icon: MarketIcon },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
]

export function Sidebar() {
  const pathname = usePathname()
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        searchInputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex flex-col w-64 bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Logo */}
      <div className="flex items-center justify-center py-6 border-b border-slate-800/50">
        <Image
          src="/logo.png"
          alt="Hawco Productions"
          width={160}
          height={80}
          className="object-contain"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200 ease-out
                ${isActive 
                  ? 'bg-amber-500/10 text-white' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <item.icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                isActive ? 'text-amber-500' : 'text-slate-500 group-hover:text-amber-500/70'
              }`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Global Search */}
      <div className="px-3 py-2">
        <form action="/projects" method="GET" className="relative">
          <input
            ref={searchInputRef}
            type="text"
            name="search"
            placeholder="Search... (Cmd+K)"
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-400 rounded">
            ⌘K
          </kbd>
        </form>
      </div>

      {/* User section */}
      <div className="px-4 py-4 border-t border-slate-800/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-yellow-500 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-900">PR</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">Philip Riccio</p>
            <p className="text-[10px] text-amber-500/60">Development</p>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            title="Sign out"
          >
            <LogoutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Icons
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function CoverageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      <path d="M15 8h-2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2z" />
    </svg>
  )
}

function BoardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 8h10" />
      <path d="M7 12h10" />
    </svg>
  )
}

function ProjectsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function ContactsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  )
}

function MeetingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
    </svg>
  )
}

function MaterialsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  )
}

function MarketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
