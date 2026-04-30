import { updateConfig } from '../../../../../services/clientService'

// ─────────────────────────────────────────────────────────────
// PUT /api/clients/[id]/config
// Updates the business rules (earn rate, tier thresholds, etc.)
// for the specified client. All fields are required because a
// partial config could leave the loyalty engine in a broken state.
// ─────────────────────────────────────────────────────────────
export async function PUT(request, { params }) {
  // params.id is the client's cuid string from the URL segment
  const { id } = await params
  const body = await request.json()

  // Validate that every config field was supplied
  const requiredFields = [
    'earnRate',
    'tierSilver',
    'tierGold',
    'expiryDays',
    'pointsToRedeem',
  ]

  for (const field of requiredFields) {
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
    const config = await updateConfig(id, body)
    // 200 OK — the existing resource was updated successfully
    return Response.json(config, { status: 200 })
  } catch (error) {
    // P2025 — no ClientConfig row exists for this clientId
    if (error.code === 'P2025') {
      return Response.json({ error: 'Client not found' }, { status: 404 })
    }
    console.error('Error updating config:', error)
    return Response.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
