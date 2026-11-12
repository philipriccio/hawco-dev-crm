import { createHash } from 'node:crypto'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { assert } from '@/lib/agreements/domain'
import { privateAccess } from '@/lib/agreements/service'
import { failure, response } from '@/lib/agreements/http'
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    const { id } = await c.params
    const f = await r.formData()
    const classification = f.get('classification')
    assert(
      ['BUSINESS', 'RESTRICTED', 'MIXED', 'REDLINE', 'ADVICE'].includes(
        String(classification),
      ),
      'Classify before upload',
    )
    const restricted = classification !== 'BUSINESS'
    if (restricted) privateAccess(a)
    assert(
      (await prisma.agreementWorkspace.count({ where: { id } })) === 1,
      'Initialize the agreement workspace first',
    )
    const file = f.get('file')
    assert(
      file instanceof File && file.size > 0 && file.size <= 10 * 1024 * 1024,
      'File must be 1 byte–10 MB',
    )
    assert(
      /\.(pdf|txt|doc|docx)$/i.test(file.name),
      'Only PDF, TXT, DOC and DOCX allowed',
    )
    const source = String(f.get('source') || '').trim()
    assert(source, 'Source reference required')
    const parentId = String(f.get('parentId') || '') || null
    if (parentId) {
      const count = restricted
        ? await prisma.agreementLegal.count({
            where: { id: parentId, agreementId: id },
          })
        : await prisma.agreementDocument.count({
            where: { id: parentId, agreementId: id },
          })
      assert(
        count === 1,
        'Parent version must be in same agreement/classification',
      )
    }
    const bytes = Buffer.from(await file.arrayBuffer())
    const hash = createHash('sha256').update(bytes).digest('hex')
    const name = file.name.slice(0, 200)
    const mimeType = file.name.endsWith('.pdf')
      ? 'application/pdf'
      : file.name.endsWith('.txt')
        ? 'text/plain'
        : 'application/octet-stream'
    if (restricted) {
      const doc = await prisma.agreementLegal.create({
        data: {
          agreementId: id,
          kind: String(classification),
          name,
          body: source,
          mimeType,
          hash,
          parentId,
          bytes,
          actorId: a.id,
        },
      })
      return response({ id: doc.id, hash, restricted: true })
    }
    const doc = await prisma.agreementDocument.create({
      data: {
        agreementId: id,
        name,
        mimeType,
        hash,
        parentId,
        bytes,
        source,
        classification: 'BUSINESS',
        actorId: a.id,
      },
      select: { id: true, hash: true },
    })
    return response(doc)
  } catch (e) {
    return failure(e)
  }
}
