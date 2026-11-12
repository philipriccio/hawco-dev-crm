import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import {
  getDeal,
  runReminders,
  stageImport,
  syncIp,
} from '@/lib/agreements/service'
import { failure, response } from '@/lib/agreements/http'
import { prisma } from '@/lib/db'
import { assert, DealError } from '@/lib/agreements/domain'
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    const { id } = await c.params
    const b = await r.json()
    switch (b.action) {
      case 'import':
        return response(await stageImport(a, id, b))
      case 'syncIp':
        return response(await syncIp(a, id, b))
      case 'reminders':
        return response(await runReminders(id))
      case 'externalReminder': {
        if (typeof b.id === 'string')
          await prisma.agreementReminder.updateMany({
            where: { id: b.id, agreementId: id, state: { not: 'SUPERSEDED' } },
            data: {
              state: 'FAILED',
              attempts: { increment: 1 },
              error: 'External delivery is not configured. Nothing was sent.',
            },
          })
        throw new DealError(
          503,
          'External delivery is not configured. Nothing was sent.',
        )
      }
      case 'reminder': {
        assert(
          ['ACKNOWLEDGED', 'SNOOZED', 'DELIVERED'].includes(b.state),
          'Invalid reminder state',
        )
        const until = b.state === 'SNOOZED' ? new Date(b.until) : null
        assert(
          !until || (Number.isFinite(until.getTime()) && until > new Date()),
          'Future snooze date required',
        )
        const result = await prisma.agreementReminder.updateMany({
          where: { id: b.id, agreementId: id, state: { not: 'SUPERSEDED' } },
          data: {
            state: b.state,
            snoozedUntil: until,
            attempts: b.state === 'DELIVERED' ? { increment: 1 } : undefined,
            error: null,
          },
        })
        assert(
          result.count === 1,
          'Reminder not found or superseded by a reviewed date revision',
        )
        return response({ ok: true })
      }
      case 'export': {
        const d = await getDeal(id)
        return response({
          notice:
            'Business-only lawyer intake. Restricted legal notes, advice, documents and legacy unclassified attachments are excluded. No email sent.',
          agreement: { id, title: d.legacy.title, project: d.legacy.project },
          workspace: d.workspace,
          documents: d.documents,
        })
      }
      default:
        throw new DealError(400, 'Unknown action')
    }
  } catch (e) {
    return failure(e)
  }
}
