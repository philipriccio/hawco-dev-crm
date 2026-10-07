export function followUpInput(body: Record<string, unknown>, creating = false) {
  const data: Record<string, string | boolean | Date | null> = {}
  for (const field of ['note', 'ownerName', 'waitingOn', 'contactId', 'projectId']) {
    if (body[field] !== undefined) {
      if (body[field] !== null && typeof body[field] !== 'string') throw new Error(`${field} must be text`)
      const value = typeof body[field] === 'string' ? body[field].trim() : null
      if ((value?.length || 0) > (field === 'note' ? 5000 : 250)) throw new Error(`${field} is too long`)
      data[field] = value || null
    }
  }
  if ((creating || 'note' in body) && !data.note) throw new Error('Add a follow-up description')
  if (creating && !data.contactId && !data.projectId) throw new Error('A contact or project is required')
  if ('dueAt' in body) {
    if (body.dueAt !== null && typeof body.dueAt !== 'string') throw new Error('Invalid due date')
    const date = body.dueAt ? new Date(String(body.dueAt)) : null
    if (date && !Number.isFinite(date.getTime())) throw new Error('Invalid due date')
    data.dueAt = date
  }
  if ('completed' in body) {
    if (typeof body.completed !== 'boolean') throw new Error('completed must be true or false')
    data.completed = body.completed
    data.completedAt = body.completed ? new Date() : null
  }
  return data
}

export function followUpUrgency(item: { completed: boolean; dueAt?: string | null; waitingOn?: string | null }, now = new Date()) {
  if (item.completed) return 'Completed'
  // Due dates are calendar dates; use Hawco's business day, not UTC or browser locale.
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)?.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const due = item.dueAt?.slice(0, 10)
  if (due && due < today) return 'Overdue'
  if (due === today) return 'Due today'
  if (item.waitingOn) return 'Waiting'
  return due ? 'Upcoming' : 'Unscheduled'
}
