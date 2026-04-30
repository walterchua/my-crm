import { createClient, getClients } from '../../../services/clientService'

// ─────────────────────────────────────────────────────────────
// GET /api/clients
// Admin route — returns every client with their config and
// member count. No clientId scoping because this is the platform
// operator view; they need to see all merchants at once.
// ─────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const clients = await getClients()
    return Response.json(clients, { status: 200 })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return Response.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/clients
// Creates a new client and its initial config in one atomic
// operation. All fields are required — partial configs are not
// allowed because the app would break without earn rate, tiers,
// and expiry rules.
// ─────────────────────────────────────────────────────────────
export async function POST(request) {
  const body = await request.json()

  // Every config field is mandatory — validate each one in turn
  const requiredFields = [
    'name',
    'earnRate',
    'tierSilver',
    'tierGold',
    'expiryDays',
    'pointsToRedeem',
  ]

  for (const field of requiredFields) {
    // Allow 0 as a legitimate value (e.g. earnRate could theoretically be 0
    // but that is caught by the business rule below), so we only reject
    // null, undefined, and empty string here.
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return Response.json(
        { error: `Missing mandatory input: ${field}` },
        { status: 400 }
      )
    }
  }

  // Business rule validations
  if (parseFloat(body.earnRate) <= 0) {
    return Response.json(
      { error: 'Earn rate must be greater than zero' },
      { status: 400 }
    )
  }

  if (parseInt(body.tierGold, 10) <= parseInt(body.tierSilver, 10)) {
    return Response.json(
      { error: 'Gold tier threshold must be greater than Silver tier threshold' },
      { status: 400 }
    )
  }

  if (parseInt(body.expiryDays, 10) <= 0) {
    return Response.json(
      { error: 'Expiry days must be greater than zero' },
      { status: 400 }
    )
  }

  if (parseInt(body.pointsToRedeem, 10) <= 0) {
    return Response.json(
      { error: 'Redeem points must be greater than zero' },
      { status: 400 }
    )
  }

  try {
    // createClient handles the sequential $transaction internally —
    // both rows are created or neither is.
    const result = await createClient(body)
    // 201 Created — a new resource was successfully created
    return Response.json(result, { status: 201 })
  } catch (error) {
    // P2002 — a client with this name already exists (unique constraint)
    if (error.code === 'P2002') {
      return Response.json(
        { error: 'A client with this name already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating client:', error)
    return Response.json({ error: 'Failed to create client' }, { status: 500 })
  }
}
