// Server Component — fetches all clients from the database before the page loads.
// Passes them to MembersList so the client dropdown is ready immediately,
// with no loading state needed for the selector itself.
import { prisma } from '../../lib/prisma'
import MembersList from '../components/MembersList'

export default async function MembersPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return <MembersList clients={clients} />
}
