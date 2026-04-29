import { redeemPoints } from '../../../services/redemptionService.js'

// POST /api/redeem — redeem points and issue a voucher for a member
export async function POST(request) {
  const body = await request.json()
  const { memberId, clientId } = body

  // ─── Validate required fields are present ─────────────────────────────────
  // Both fields are mandatory — return 400 with the specific missing field
  // name so the caller knows exactly what to fix.
  for (const field of ['memberId', 'clientId']) {
    if (!body[field]) {
      return Response.json(
        { error: `Missing mandatory input: ${field}` },
        { status: 400 }
      )
    }
  }

  // ─── Call the service layer ────────────────────────────────────────────────
  // All business logic and database work lives in redemptionService — this
  // route only handles HTTP concerns (parsing, validation, status codes).
  try {
    const result = await redeemPoints({ memberId, clientId })

    // 201 Created — a new voucher record was created
    return Response.json(result, { status: 201 })

  } catch (error) {

    // ─── Known error: member not found for this client ───────────────────────
    if (error.message === 'Member not found') {
      return Response.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // ─── Known error: merchant has no configuration row ──────────────────────
    // This is a data setup problem, not a caller mistake — return 500.
    if (error.message === 'Client configuration not found') {
      return Response.json(
        { error: 'Client configuration not found' },
        { status: 500 }
      )
    }

    // ─── Known error: member's points balance is insufficient ─────────────────
    // The request was structurally valid but the member cannot redeem — 400.
    if (error.message === 'Not enough points to redeem voucher') {
      return Response.json(
        { error: 'Not enough points to redeem voucher' },
        { status: 400 }
      )
    }

    // ─── Catch-all: unexpected errors ────────────────────────────────────────
    // Log the real error internally so we can investigate, but never expose
    // raw error details to the caller.
    console.error('Error processing redemption:', error)
    return Response.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
