import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export default async function NewMeetingPage({ searchParams }: { searchParams: Promise<{ contact?: string }> }) {
  const params = await searchParams
  const [contacts, projects] = await Promise.all([
    prisma.contact.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, take: 100, select: { id: true, title: true } }),
  ])

  async function createMeeting(formData: FormData) {
    'use server'
    const user = await requireAuth()

    const title = String(formData.get('title') || '').trim()
    const dateRaw = String(formData.get('date') || '')
    const date = new Date(dateRaw)
    if (!title || Number.isNaN(date.getTime())) return

    const contactIds = formData.getAll('contactIds').map(String).filter(Boolean)
    const projectIds = formData.getAll('projectIds').map(String).filter(Boolean)

    await prisma.meeting.create({
      data: {
        title,
        date,
        location: String(formData.get('location') || '') || null,
        notes: String(formData.get('notes') || '') || null,
        followUp: String(formData.get('followUp') || '') || null,
        createdById: user.id,
        attendees: { create: contactIds.map((contactId) => ({ contactId })) },
        projects: { create: projectIds.map((projectId) => ({ projectId })) },
      },
    })

    redirect('/meetings')
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/meetings" className="text-amber-600 hover:text-amber-700">← Back to Meetings</Link>
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Log CRM Meeting</h1>

      <form className="bg-white rounded-xl shadow-sm p-6 space-y-4" action={createMeeting}>
        <input name="title" required className="w-full px-3 py-2 border rounded-lg" placeholder="Meeting title" />
        <input name="date" type="datetime-local" required className="w-full px-3 py-2 border rounded-lg" />
        <input name="location" className="w-full px-3 py-2 border rounded-lg" placeholder="Zoom / Phone / Office" />

        <div>
          <label className="block text-sm font-medium mb-1">Attendees</label>
          <select name="contactIds" multiple className="w-full px-3 py-2 border rounded-lg h-40" defaultValue={params.contact ? [params.contact] : []}>
            {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Related Projects (optional)</label>
          <select name="projectIds" multiple className="w-full px-3 py-2 border rounded-lg h-32">
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </div>

        <textarea name="notes" rows={4} className="w-full px-3 py-2 border rounded-lg" placeholder="Notes" />
        <textarea name="followUp" rows={3} className="w-full px-3 py-2 border rounded-lg" placeholder="Follow up actions" />
        <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">Save Meeting</button>
      </form>
    </div>
  )
}
