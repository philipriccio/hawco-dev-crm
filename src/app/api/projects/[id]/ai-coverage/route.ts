import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await req.json()

    const { verdict, total_score, subscores, summary, title, raw_report } = body

    // Map CoverageIQ subscores to our schema fields (CoverageIQ uses 0-10, our schema uses 0-5)
    // Divide by 2 so storage is consistent — display will multiply back to /50
    const concept    = subscores?.concept     ?? subscores?.concept_originality    ?? null
    const characters = subscores?.characters  ?? subscores?.character_development  ?? null
    const structure  = subscores?.structure   ?? subscores?.structure_pacing       ?? null
    const dialogue   = subscores?.dialogue                                          ?? null
    const marketFit  = subscores?.market_fit  ?? subscores?.marketability          ?? null

    // Store raw /10 scores but halve them to fit the /5 schema
    const toHalf = (v: number | null) => v != null ? v / 2 : null

    // Map verdict string to Prisma enum
    const verdictMap: Record<string, 'PASS' | 'CONSIDER' | 'RECOMMEND'> = {
      PASS: 'PASS',
      CONSIDER: 'CONSIDER',
      RECOMMEND: 'RECOMMEND',
    }
    const prismaVerdict = verdictMap[verdict?.toUpperCase()] ?? 'PASS'

    const coverage = await prisma.coverage.create({
      data: {
        projectId,
        reader: 'CoverageIQ',
        dateRead: new Date(),
        title: title ?? 'AI Coverage',
        writer: '',
        verdict: prismaVerdict,
        scoreConcept:    toHalf(concept),
        scoreCharacters: toHalf(characters),
        scoreStructure:  toHalf(structure),
        scoreDialogue:   toHalf(dialogue),
        scoreMarketFit:  toHalf(marketFit),
        // total_score from CoverageIQ is already /50; halve to /25 for storage
        scoreTotal: total_score != null ? total_score / 2 : null,
        summary: summary ?? null,
        strengths: raw_report ? JSON.stringify(raw_report) : null,
      },
    })

    return NextResponse.json({ success: true, id: coverage.id })
  } catch (error) {
    console.error('AI coverage save error:', error)
    return NextResponse.json({ error: 'Failed to save coverage' }, { status: 500 })
  }
}
