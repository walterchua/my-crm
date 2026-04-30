import { earnPoints } from '../../../services/transactionService.js'

// POST /api/transactions — record an earn-points event for a member purchase
export async function POST(request) {
  const body = await request.json()
  const { memberId, clientId, spendAmount } = body

  // ─── Validate required fields are present ─────────────────────────────────
  // All three fields are mandatory — return 400 with the specific missing field
  // name so the caller knows exactly what to fix.
  for (const field of ['memberId', 'clientId', 'spendAmount']) {
    if (!body[field] && body[field] !== 0) {
      return Response.json(
        { error: `Missing mandatory input: ${field}` },
        { status: 400 }
      )
    }
  }

  // ─── Validate spendAmount is a positive number ────────────────────────────
  // A zero or negative spend has no business meaning for an earn event.
  if (typeof spendAmount !== 'number' || spendAmount <= 0) {
    return Response.json(
      { error: 'Invalid spend amount' },
      { status: 400 }
    )
  }

  // ─── Call the service layer ────────────────────────────────────────────────
  // All business logic and database work lives in transactionService — this
  // route only handles HTTP concerns.
  try {
    const result = await earnPoints({ memberId, clientId, spendAmount })

    // 201 Created — a new transaction record was created
    return Response.json(result, { status: 201 })

  } catch (error) {

    // ─── Known error: merchant has no configuration row ──────────────────────
    // This is a data setup problem, not a caller mistake, so we return 500.
    if (error.message === 'Client configuration not found') {
      return Response.json(
        { error: 'Client configuration not found' },
        { status: 500 }
      )
    }

    // ─── Known error: memberId not found under this clientId ─────────────────
    // Covers both "member does not exist" and "member belongs to a different
    // client" — we intentionally return the same 404 for both so callers
    // cannot probe which client a member belongs to.
    if (error.message === 'Member not found for this client') {
      return Response.json(
        { error: 'Member not found for this client' },
        { status: 404 }
      )
    }

    // ─── Catch-all: unexpected errors ────────────────────────────────────────
    // Log the real error internally so we can investigate, but never expose
    // raw error details to the caller.
    console.error('Error recording earn transaction:', error)
    return Response.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
