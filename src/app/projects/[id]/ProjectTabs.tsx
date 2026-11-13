'use client'

import type { ReactNode } from 'react'
import { useRef } from 'react'
import { useSearchParams } from 'next/navigation'

const tabs = ['overview', 'manage'] as const
type Tab = typeof tabs[number]

/** Keep both panels mounted: navigating between them must not discard editor drafts. */
export default function ProjectTabs({ overview, children }: { overview: ReactNode; children: ReactNode }) {
  const search = useSearchParams()
  const active: Tab = search.get('tab') === 'manage' ? 'manage' : 'overview'
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  function select(tab: Tab) {
    const url = new URL(window.location.href)
    if (tab === 'manage') url.searchParams.set('tab', tab)
    else url.searchParams.delete('tab')
    window.history.pushState(null, '', url)
  }
  return <div className="mx-auto max-w-[1440px] min-w-0">
    <div role="tablist" aria-label="Project views" className="flex gap-6 border-b border-slate-200 bg-white px-5 sm:px-8">
      {tabs.map((tab, index) => <button key={tab} ref={node => { buttons.current[index] = node }} id={`project-tab-${tab}`} type="button" role="tab" aria-selected={active === tab} aria-controls={`project-panel-${tab}`} tabIndex={active === tab ? 0 : -1}
        onClick={() => select(tab)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index
          select(tabs[next]); buttons.current[next]?.focus()
        }} className={`border-b-2 px-1 py-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 ${active === tab ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
        {tab === 'overview' ? 'Overview' : 'Manage'}
      </button>)}
    </div>
    <section id="project-panel-overview" role="tabpanel" aria-labelledby="project-tab-overview" tabIndex={0} hidden={active !== 'overview'}>{overview}</section>
    <section id="project-panel-manage" role="tabpanel" aria-labelledby="project-tab-manage" tabIndex={0} hidden={active !== 'manage'}>
      <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><p className="font-medium text-slate-900">Project workspace</p><p className="mt-1 text-sm text-slate-500">Edit details, manage relationships and materials, and move the project forward. Switching tabs keeps your drafts here.</p></div>
      {children}
    </section>
  </div>
}
