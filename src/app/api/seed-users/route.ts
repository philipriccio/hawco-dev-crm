import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

// POST seed initial users
// Protected by a simple secret (one-time use)
export async function POST(request: NextRequest) {
  try {
    // Simple auth check for seeding
    const authHeader = request.headers.get('authorization')
    if (authHeader !== 'Bearer hawco-seed-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = [
      { name: 'Allan Hawco', email: 'hawco@hawcoproductions.com', password: 'hawco', role: 'ADMIN' as const },
      { name: 'Erin Sullivan', email: 'erin@girlmathtv.com', password: 'sullivan', role: 'MEMBER' as const },
      { name: 'Janine Squires', email: 'janine@hawcoproductions.com', password: 'squires', role: 'MEMBER' as const },
      { name: 'Kyla Nicolle', email: 'kyla@hawcoproductions.com', password: 'nicolle', role: 'MEMBER' as const },
    ]

    const results = []

    for (const userData of users) {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() },
      })

      if (existing) {
        results.push({ email: userData.email, status: 'already exists' })
        continue
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10)

      const user = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      })

      results.push({ ...user, status: 'created' })
    }

    return NextResponse.json({
      success: true,
      message: 'Users seeded successfully',
      users: results,
    })
  } catch (error) {
    console.error('Seed users error:', error)
    return NextResponse.json(
      { error: 'Failed to seed users', details: String(error) },
      { status: 500 }
    )
  }
}
