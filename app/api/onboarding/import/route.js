import { NextResponse } from 'next/server'
import { importClient } from '../../../../services/onboardingService.js'
// Sentry captures unexpected errors and sends them to the Sentry dashboard
// with a full stack trace, so we can investigate production issues without
// having to reproduce them locally.
import * as Sentry from '@sentry/nextjs'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/onboarding/import
//
// Onboarding entry point for creating a new merchant client.
// Accepts a JSON body with all client and config fields, delegates all
// validation and DB work to importClient() in onboardingService, and maps
// the result (or error) to the correct HTTP response.
//
// This route intentionally contains NO business logic — it only handles
// HTTP concerns: parsing the request body, calling the service, and
// returning the right status code and shape.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request) {

  // ─── Parse the request body ──────────────────────────────────────────────
  // We read the full JSON body up front and pass it as a single payload
  // object to the service. The service owns all field validation — the route
  // does not inspect individual fields.
  let payload
  try {
    payload = await request.json()
  } catch {
    // If the request body is not valid JSON at all, return 400 immediately
    // before touching the service layer.
    return NextResponse.json(
      { error: 'Request body must be valid JSON' },
      { status: 400 }
    )
  }

  // ─── Call the service layer ───────────────────────────────────────────────
  try {
    const result = await importClient(payload)

    // 201 Created — both the Client and ClientConfig rows were created.
    // The response body contains both records so the caller can confirm
    // what was written and use client.id for subsequent requests.
    return NextResponse.json(result, { status: 201 })

  } catch (error) {

    // ─── Validation failure ─────────────────────────────────────────────────
    // The service throws VALIDATION_ERROR when any input field is missing,
    // the wrong type, or out of the allowed range.
    // We return 400 and include the field name so the caller knows exactly
    // which input to fix.
    if (error.code === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 400 }
      )
    }

    // ─── Duplicate slug ─────────────────────────────────────────────────────
    // The service throws DUPLICATE_SLUG when a client with the same slug
    // already exists in the database.
    // We return 409 Conflict — the request was valid but cannot be fulfilled
    // because of the existing record.
    if (error.code === 'DUPLICATE_SLUG') {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 409 }
      )
    }

    // ─── Unexpected error ───────────────────────────────────────────────────
    // Any other error (Prisma failure, network issue, unhandled edge case)
    // is logged server-side so we can investigate, but we never expose raw
    // error details to the caller — that could leak internal system details.
    console.error('Unexpected error in POST /api/onboarding/import:', error)

    // Send the full error to Sentry so it appears in the dashboard with
    // stack trace and context. extra.context helps filter by route in Sentry.
    Sentry.captureException(error, {
      extra: { context: 'POST /api/onboarding/import — create new merchant client' },
    })

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
