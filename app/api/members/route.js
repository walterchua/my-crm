import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/members — fetch all members
export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return Response.json(members)
  } catch (error) {
    console.error('Error fetching members:', error)
    return Response.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}