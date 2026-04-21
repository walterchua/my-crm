import { prisma } from '../../../../lib/prisma'

// GET /api/members/:id?clientId=xxx — fetch a single member by id, scoped to a client
export async function GET(request, { params }) {
  // In Next.js 15+, params is a Promise — must be awaited
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  // Both id and clientId are mandatory — reject early if either is missing
  if (!id || !clientId) {
    return Response.json(
      { error: 'Bad request' },
      { status: 400 }
    )
  }

  try {
    // Scope by BOTH id AND clientId — this prevents a member from one client
    // being visible to a user of a different client even if they guess the id.
    // findFirst is used (not findUnique) because we're filtering on two fields.
    const member = await prisma.member.findFirst({
      where: { id, clientId },
    })

    // findFirst returns null when no match — that means not found or wrong client
    if (!member) {
      return Response.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Success — return the member record
    return Response.json(member)

  } catch (error) {
    // Log the real error server-side but never expose it to the client
    console.error('Error fetching member:', error)
    return Response.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
