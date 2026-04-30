import { getClient } from '../../../../services/clientService'

// ─────────────────────────────────────────────────────────────
// GET /api/clients/[id]
// Returns a single client with their config and member count.
// Used by both the client detail page and the config editor
// (to pre-populate form fields with current values).
// ─────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
  // params.id comes from the [id] folder name in the file path
  const { id } = await params

  try {
    const client = await getClient(id)

    // getClient returns null when Prisma finds no matching row
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 })
    }

    return Response.json(client, { status: 200 })
  } catch (error) {
    console.error('Error fetching client:', error)
    return Response.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}
