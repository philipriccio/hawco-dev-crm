import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Database seeding is disabled in the deployed application. Use the controlled Prisma seed workflow instead.' },
    { status: 410 }
  )
}
