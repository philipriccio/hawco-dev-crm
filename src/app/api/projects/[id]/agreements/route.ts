import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

// Old creation accepted unclassified generic file URLs. All new deals now use
// the typed workspace and classification-first document endpoint. Reads of old
// project/contacts/file references remain unchanged.
export async function POST() {
  const actor = await requireApiAuth()
  if (isAuthResponse(actor)) return actor
  return NextResponse.json(
    {
      error:
        'Create this deal in the Agreements workspace, then classify documents before upload.',
      workspaceUrl: '/agreements',
    },
    { status: 410 },
  )
}
