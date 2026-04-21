// Server Component — fetches the real clientId before the page loads
// and passes it to the form so nothing is ever hardcoded on the client.
import { prisma } from '../../../lib/prisma'
import NewMemberForm from '../../components/NewMemberForm'

export default async function NewMemberPage() {
  // Read the first client from the database — returns the real cuid string
  const client = await prisma.client.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  // Pass the real clientId down to the interactive form component
  return <NewMemberForm clientId={client?.id ?? null} />
}
