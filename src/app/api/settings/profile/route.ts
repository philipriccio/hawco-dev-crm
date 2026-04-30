import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiAuth, isAuthResponse } from '@/lib/api-auth'

// GET current user profile
export async function GET() {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const user = session
    
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    })

    return NextResponse.json(userProfile)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// PATCH update user profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireApiAuth()
    if (isAuthResponse(session)) return session
    const user = session
    const body = await request.json()

    const { name, email } = body

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        )
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name && { name }),
        ...(email && { email: email.toLowerCase() }),
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
