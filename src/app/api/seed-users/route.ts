import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'User seeding is disabled in the deployed application. Create users through the admin users API.' },
    { status: 410 }
  )
}
