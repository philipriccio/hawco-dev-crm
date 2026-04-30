import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { requireApiAdmin, isAuthResponse } from '@/lib/api-auth'

// GET all users (for admin purposes)
export async function GET() {
  try {
    const session = await requireApiAdmin()
    if (isAuthResponse(session)) return session
    

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const session = await requireApiAdmin()
    if (isAuthResponse(session)) return session
    

    const body = await request.json()
    const { email, password, name, role = 'MEMBER' } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    // Log activity
    await logActivity({
      action: 'created',
      entityType: 'user',
      entityId: user.id,
      entityName: user.name,
      userId: session.id,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
