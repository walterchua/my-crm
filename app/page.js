// Server Component — fetches all clients from the database before the page loads.
// Passes them to the Dashboard client component as props so the dropdown
// is populated without any client-side loading state.
import { prisma } from '../lib/prisma'
import Dashboard from './components/Dashboard'

export default async function HomePage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'asc' },
  })

  return <Dashboard clients={clients} />
}
