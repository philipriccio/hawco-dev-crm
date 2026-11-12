'use client'

import { useRef, useState, type PointerEvent } from 'react'
import Link from 'next/link'
import type { ProjectStatus } from '@prisma/client'

type ActiveProject = {
  id: string
  title: string
  status: ProjectStatus
  currentStage: string | null
  nextAction: string | null
  contacts: { contact: { id: string; name: string } }[]
  ipProperties: { id: string; title: string }[]
}

const statusLabels: Partial<Record<ProjectStatus, string>> = {
  EARLY_DEVELOPMENT: 'Early Development',
  DEVELOPING: 'Developing',
  PACKAGING: 'Packaging',
  PITCHED: 'Pitched',
  DEVELOPING_WITH_NETWORK: 'Developing with Network',
  GREENLIT: 'Greenlit',
}

export default function ActiveDevelopment({ projects: initialProjects, revision: initialRevision }: { projects: ActiveProject[]; revision: number }) {
  const [projects, setProjects] = useState(initialProjects)
  const [revision, setRevision] = useState(initialRevision)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [needsReload, setNeedsReload] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const drag = useRef<{ id: string; before: ActiveProject[]; current: ActiveProject[]; x: number; y: number; scroller: HTMLElement | null } | null>(null)
  const saving = useRef(false)
  const scrollFrame = useRef<number | null>(null)

  async function reload() {
    setBusy(true)
    try {
      const response = await fetch('/api/dashboard/development-order', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const fresh = await response.json()
      setProjects(fresh.projects); setRevision(fresh.revision); setNeedsReload(false)
      setStatus('Latest order loaded. You can move projects again.')
    } catch { setStatus('Could not reload. Your changes have not been confirmed. Try Reload latest order.'); setNeedsReload(true) }
    finally { setBusy(false) }
  }
  async function save(next: ActiveProject[], before: ActiveProject[]) {
    if (saving.current) return
    saving.current = true; setBusy(true); setProjects(next); setStatus('Saving order…')
    try {
      const response = await fetch('/api/dashboard/development-order', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, projectIds: next.map(p => p.id) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(response.status === 409 ? 'The order or active projects changed in another tab. Reload the latest order.' : 'Could not confirm this save. Reload the latest order before trying again.')
      setRevision(result.revision); setStatus('Order saved for everyone.')
    } catch (error) {
      setProjects(before); setNeedsReload(true)
      setStatus(error instanceof Error ? error.message : 'Unable to save. Reload the latest order.')
    } finally { saving.current = false; setBusy(false) }
  }
  function move(index: number, delta: number) {
    if (busy || needsReload || dragging || index + delta < 0 || index + delta >= projects.length) return
    const next = [...projects]; const [item] = next.splice(index, 1); next.splice(index + delta, 0, item)
    void save(next, projects)
  }
  function pointerDown(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (busy || needsReload || event.button !== 0) return
    event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId)
    let scroller: HTMLElement | null = event.currentTarget.parentElement
    while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement
    drag.current = { id, before: projects, current: projects, x: event.clientX, y: event.clientY, scroller }; setDragging(id)
    setStatus('Drag to a new position. Release to save; Escape to cancel.')
    function edgeScroll() {
      const active = drag.current
      if (!active) return
      const bounds = active.scroller?.getBoundingClientRect()
      const top = Math.max(0, bounds?.top ?? 0), bottom = Math.min(window.innerHeight, bounds?.bottom ?? window.innerHeight)
      const delta = active.y < top + 80 ? -12 : active.y > bottom - 80 ? 12 : 0
      if (delta) {
        if (active.scroller) active.scroller.scrollBy(0, delta)
        else window.scrollBy(0, delta)
        reorderAt(active.x, active.y, delta)
      }
      scrollFrame.current = requestAnimationFrame(edgeScroll)
    }
    scrollFrame.current = requestAnimationFrame(edgeScroll)
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current
    if (!active) return
    const direction = event.clientY - active.y
    active.x = event.clientX; active.y = event.clientY
    reorderAt(event.clientX, event.clientY, direction)
  }
  function reorderAt(x: number, y: number, direction: number) {
    const active = drag.current
    if (!active) return
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-development-project]')
    if (!row || row.dataset.developmentProject === active.id) return
    const bounds = row.getBoundingClientRect()
    if ((direction > 0 && y < bounds.top + Math.min(60, bounds.height / 2)) || (direction < 0 && y > bounds.bottom - Math.min(60, bounds.height / 2))) return
    const next = [...active.current], from = next.findIndex(p => p.id === active.id), to = next.findIndex(p => p.id === row.dataset.developmentProject)
    if (from < 0 || to < 0) return
    const [item] = next.splice(from, 1); next.splice(to, 0, item); active.current = next; setProjects(next)
  }
  function finishDrag(cancel = false) {
    const active = drag.current
    drag.current = null; setDragging(null)
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current)
    scrollFrame.current = null
    if (!active) return
    if (cancel) { setProjects(active.before); setStatus('Move cancelled.'); return }
    if (active.before.every((p, i) => p.id === active.current[i].id)) { setStatus('Order unchanged.'); return }
    void save(active.current, active.before)
  }

  return (
    <section id="active-development" aria-labelledby="active-development-heading" className="min-w-0 scroll-mt-4 border-t-2 border-[#b59558] pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="active-development-heading">Active Development <span className="ml-2 text-sm font-normal text-slate-500">{projects.length} project{projects.length === 1 ? '' : 's'}</span></h2>
          <p className="mt-1 text-sm text-slate-500">Drag the handle or use the arrows to prioritize projects. Order is saved for everyone; the Slate is unchanged.</p>
        </div>
        <Link href="/whiteboard" className="shrink-0 text-sm font-medium text-blue-700 hover:underline">Open Slate →</Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <p role="status" aria-live="polite" className={needsReload ? 'text-red-700' : 'text-slate-600'}>{status}</p>
        {needsReload && <button type="button" onClick={() => void reload()} disabled={busy} className="rounded border px-3 py-2 font-medium disabled:opacity-50">Reload latest order</button>}
      </div>
      {projects.length === 0 ? (
        <p className="mt-5 rounded-lg bg-white/60 p-5 text-sm text-slate-500">No active development projects on the Slate yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-[#dedfd9] border-y border-[#dedfd9]">
          {projects.map((project, index) => (
            <li key={project.id} data-development-project={project.id} className={`grid min-w-0 gap-4 py-5 xl:grid-cols-12 xl:gap-5 ${dragging === project.id ? 'rounded bg-blue-50 ring-2 ring-blue-400' : ''}`}>
              <div className="min-w-0 xl:col-span-3">
                <div className="mb-2 flex items-center gap-1">
                  <button type="button" aria-label={`Drag ${project.title}`} title="Drag to reorder" disabled={busy || needsReload} onPointerDown={event => pointerDown(event, project.id)} onPointerMove={pointerMove} onPointerUp={() => finishDrag()} onPointerCancel={() => finishDrag(true)} onLostPointerCapture={() => { if (drag.current) finishDrag(true) }} onKeyDown={event => { if (event.key === 'Escape') finishDrag(true) }} className="min-h-11 min-w-11 touch-none cursor-grab rounded border text-lg active:cursor-grabbing disabled:opacity-40">⠿</button>
                  <button type="button" aria-label={`Move ${project.title} up`} disabled={busy || needsReload || !!dragging || index === 0} onClick={() => move(index, -1)} className="min-h-11 min-w-11 rounded border disabled:opacity-30">↑</button>
                  <button type="button" aria-label={`Move ${project.title} down`} disabled={busy || needsReload || !!dragging || index === projects.length - 1} onClick={() => move(index, 1)} className="min-h-11 min-w-11 rounded border disabled:opacity-30">↓</button>
                  <span className="ml-1 text-xs text-slate-500" aria-label={`Position ${index + 1} of ${projects.length}`}>{index + 1}</span>
                </div>
              <h3 className="min-w-0 text-base font-semibold [overflow-wrap:anywhere] ">
                <Link href={`/projects/${encodeURIComponent(project.id)}`} className="text-[#203346] hover:underline">{project.title}</Link>
              </h3>
              </div>
              <dl className="grid min-w-0 gap-4 sm:grid-cols-2 xl:col-span-9 xl:grid-cols-9 xl:gap-5">
                <div className="min-w-0 xl:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Writers</dt>
                  <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                    {project.contacts.length > 0 ? (
                      <ul className="space-y-1">
                        {project.contacts.map(({ contact }) => <li key={contact.id}><Link href={`/contacts/${encodeURIComponent(contact.id)}`} className="text-blue-700 hover:underline">{contact.name}</Link></li>)}
                      </ul>
                    ) : <span className="text-slate-500">Not recorded</span>}
                  </dd>
                </div>
                <div className="min-w-0 xl:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Underlying IP</dt>
                  <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                    {project.ipProperties.length > 0 ? (
                      <ul className="space-y-1">
                        {project.ipProperties.map((ip) => <li key={ip.id}><Link href={`/ip/${encodeURIComponent(ip.id)}`} className="text-blue-700 hover:underline">{ip.title}</Link></li>)}
                      </ul>
                    ) : <span className="text-slate-500">Not recorded</span>}
                  </dd>
                </div>
                <div className="min-w-0 xl:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Status</dt>
                  <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                    <span className="inline-block max-w-full rounded-md bg-[#e9ede9] px-2 py-1 text-xs font-medium text-[#203346]">{statusLabels[project.status] || project.status.replaceAll('_', ' ')}</span>
                    {project.currentStage?.trim() && <p className="mt-2 whitespace-pre-wrap text-slate-600">{project.currentStage}</p>}
                  </dd>
                </div>
                <div className="min-w-0 xl:col-span-3">
                  <dt className="text-xs font-medium text-slate-500">Next steps</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700 [overflow-wrap:anywhere]">{project.nextAction?.trim() ? project.nextAction : <span className="text-slate-500">Not recorded</span>}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
