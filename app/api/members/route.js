import { prisma } from '../../../lib/prisma'

// POST /api/members — register a new member
export async function POST(request) {
  const body = await request.json()
  const { name, email, clientId } = body

  // Validate all mandatory fields are present
  for (const field of ['name', 'email', 'clientId']) {
    if (!body[field] && body[field] !== 0) {
      return Response.json(
        { error: `Missing mandatory input: ${field}` },
        { status: 400 }
      )
    }
  }

  try {
    const member = await prisma.member.create({
      data: {
        name,
        email,
        clientId,
        points: 0,
        tier: 'Bronze',
      },
    })
    return Response.json(member, { status: 201 })
  } catch (error) {
    // P2002 — unique constraint violation (duplicate email)
    if (error.code === 'P2002') {
      return Response.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }
    console.error('Error creating member:', error)
    return Response.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// GET /api/members?clientId=xxx — fetch all members for a client
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  if (!clientId) {
    return Response.json(
      { error: 'Missing required query parameter: clientId' },
      { status: 400 }
    )
  }

  try {
    const members = await prisma.member.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
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
