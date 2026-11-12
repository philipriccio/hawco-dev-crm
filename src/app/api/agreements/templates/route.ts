import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'
import {
  assert,
  TYPES,
  mayReadLegal,
  sourceValid,
} from '@/lib/agreements/domain'
import { privateAccess, json } from '@/lib/agreements/service'
import { templateMetadata, decideTemplate } from '@/lib/agreements/templates'
import { failure, response } from '@/lib/agreements/http'
export async function GET() {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    return response(
      await prisma.agreementTemplate.findMany({
        where: mayReadLegal(a.id) ? {} : { status: 'APPROVED' },
        select: templateMetadata,
        orderBy: { createdAt: 'desc' },
      }),
    )
  } catch (e) {
    return failure(e)
  }
}
export async function POST(r: Request) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    privateAccess(a)
    const f = await r.formData()
    assert(
      f.get('classification') === 'BUSINESS',
      'Template registry accepts explicitly business-classified files only; mixed/advice/redlines belong in restricted Legal',
    )
    const type = String(f.get('type'))
    assert(TYPES.includes(type as never), 'Invalid template type')
    const versionLabel = String(f.get('versionLabel') || '').trim()
    assert(
      versionLabel && versionLabel.length <= 100,
      'Unique template version label required',
    )
    const source = {
      reference: String(f.get('reference') || ''),
      locator: String(f.get('locator') || ''),
    }
    assert(sourceValid(source), 'Template source and locator required')
    const file = f.get('file')
    assert(
      file instanceof File &&
        file.size > 0 &&
        file.size <= 10 * 1024 * 1024 &&
        /\.(pdf|txt|doc|docx)$/i.test(file.name),
      'Template file must be PDF/TXT/DOC/DOCX, 1 byte–10 MB',
    )
    const parentId = String(f.get('parentId') || '') || null
    if (parentId)
      assert(
        (await prisma.agreementTemplate.count({
          where: { id: parentId, type },
        })) === 1,
        'Parent template must have same type',
      )
    const bytes = Buffer.from(await file.arrayBuffer())
    return response(
      await prisma.agreementTemplate.create({
        data: {
          type,
          versionLabel,
          name: file.name.slice(0, 200),
          mimeType: file.name.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : 'application/octet-stream',
          bytes,
          hash: createHash('sha256').update(bytes).digest('hex'),
          parentId,
          source: json(source),
          decisions: [],
          actorId: a.id,
        },
        select: templateMetadata,
      }),
    )
  } catch (e) {
    return failure(e)
  }
}
export async function PATCH(r: Request) {
  const a = await requireApiAuth()
  if (isAuthResponse(a)) return a
  try {
    return response(await decideTemplate(a, await r.json()))
  } catch (e) {
    return failure(e)
  }
}
