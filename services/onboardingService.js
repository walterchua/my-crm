import { prisma } from '../lib/prisma.js'

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA NOTE
//
// Three fields in this payload are validated here but cannot yet be stored
// because they don't exist in the current Prisma schema:
//
//   Client.slug          — add slug String @unique to the Client model
//   ClientConfig.welcomeBonus   — add welcomeBonus Int @default(0)
//   ClientConfig.birthdayBonus  — add birthdayBonus Boolean @default(false)
//
// After adding those fields, run:
//   npx prisma migrate dev
//   npx prisma generate
//
// Then uncomment the three TODO lines in the prisma.$transaction block below.
// All validation logic is already in place — no other changes needed.
// ─────────────────────────────────────────────────────────────────────────────


// ─── Error factory helpers ────────────────────────────────────────────────────
// These create Error objects with extra properties so the route layer can
// inspect error.code to decide which HTTP status code to return, and
// error.field to tell the caller exactly which input needs fixing.
// Using real Error objects (rather than plain objects) preserves the stack trace
// for debugging while still carrying the structured metadata we need.

function validationError(field, message) {
  const err = new Error(message)
  err.code  = 'VALIDATION_ERROR'
  err.field = field
  return err
}

function duplicateSlugError(slug) {
  const err = new Error(`A client with the slug "${slug}" already exists`)
  err.code  = 'DUPLICATE_SLUG'
  err.field = 'slug'
  return err
}


// ─────────────────────────────────────────────────────────────────────────────
// importClient(payload)
//
// The single entry point for merchant onboarding.
//
// Responsibilities (in order):
//   1. Validate every field — no DB work happens until all inputs are clean
//   2. Check that the slug is not already taken
//   3. Write Client + ClientConfig atomically so a partial insert is impossible
//
// Throws a structured error on any failure so the route can map it to the
// correct HTTP status code without any business logic leaking into the route.
// ─────────────────────────────────────────────────────────────────────────────
export async function importClient(payload) {

  // ─── Destructure payload with safe defaults for optional fields ─────────────
  // payload ?? {} guards against a null/undefined argument from the route layer.
  // welcomeBonus and birthdayBonus are optional — we default them here so the
  // rest of the function can treat them as always-present values.
  const {
    name,
    slug,
    earnRate,
    pointExpiry,
    tiers,
    minRedemption,
    welcomeBonus  = 0,
    birthdayBonus = false,
  } = payload ?? {}


  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1 — VALIDATION
  //
  // All validation runs before any database call.
  // WHY: If we wrote to the DB first and then hit a validation error, we
  // would need to roll back manually. Validating up front keeps DB operations
  // in a clean "either everything succeeds or nothing runs" state.
  // ─────────────────────────────────────────────────────────────────────────

  // ─── name ────────────────────────────────────────────────────────────────
  if (!name || typeof name !== 'string') {
    throw validationError('name', 'Name is required')
  }
  const trimmedName = name.trim()
  if (trimmedName.length < 2) {
    throw validationError('name', 'Name must be at least 2 characters')
  }
  if (trimmedName.length > 100) {
    throw validationError('name', 'Name must not exceed 100 characters')
  }

  // ─── slug ─────────────────────────────────────────────────────────────────
  // Slugs are URL-safe identifiers: lowercase letters, numbers, and hyphens only.
  // No spaces, no uppercase, no special characters.
  if (!slug || typeof slug !== 'string') {
    throw validationError('slug', 'Slug is required')
  }
  const SLUG_REGEX = /^[a-z0-9-]+$/
  if (!SLUG_REGEX.test(slug)) {
    throw validationError(
      'slug',
      'Slug must contain only lowercase letters, numbers, and hyphens'
    )
  }

  // ─── earnRate ─────────────────────────────────────────────────────────────
  // Must be a positive number — zero earn rate would mean no points ever earned.
  // Cap at 100 to prevent accidental misconfiguration (e.g. 1000 instead of 10).
  if (earnRate === undefined || earnRate === null || earnRate === '') {
    throw validationError('earnRate', 'Earn rate is required')
  }
  const parsedEarnRate = parseFloat(earnRate)
  if (isNaN(parsedEarnRate) || parsedEarnRate <= 0) {
    throw validationError('earnRate', 'Earn rate must be a positive number')
  }
  if (parsedEarnRate > 100) {
    throw validationError('earnRate', 'Earn rate must not exceed 100')
  }

  // ─── pointExpiry ──────────────────────────────────────────────────────────
  // How many days before a member's points expire.
  // Min 30 days — too short and members would lose points before they could
  // use them. Max 1825 days (5 years) to keep the loyalty programme active.
  if (pointExpiry === undefined || pointExpiry === null || pointExpiry === '') {
    throw validationError('pointExpiry', 'Point expiry is required')
  }
  const parsedExpiry = parseInt(pointExpiry, 10)
  if (isNaN(parsedExpiry) || parsedExpiry !== Number(pointExpiry)) {
    throw validationError('pointExpiry', 'Point expiry must be a whole number')
  }
  if (parsedExpiry < 30) {
    throw validationError('pointExpiry', 'Point expiry must be at least 30 days')
  }
  if (parsedExpiry > 1825) {
    throw validationError('pointExpiry', 'Point expiry must not exceed 1825 days (5 years)')
  }

  // ─── tiers ────────────────────────────────────────────────────────────────
  // tiers is a nested object: { silver: number, gold: number }
  // Gold must be strictly greater than Silver — otherwise the tier logic breaks.
  if (!tiers || typeof tiers !== 'object' || Array.isArray(tiers)) {
    throw validationError('tiers', 'Tiers must be an object with silver and gold properties')
  }

  const parsedSilver = parseInt(tiers.silver, 10)
  if (tiers.silver === undefined || tiers.silver === null || tiers.silver === '') {
    throw validationError('tiers.silver', 'Silver tier threshold is required')
  }
  if (isNaN(parsedSilver) || parsedSilver <= 0) {
    throw validationError('tiers.silver', 'Silver tier threshold must be a positive integer')
  }

  const parsedGold = parseInt(tiers.gold, 10)
  if (tiers.gold === undefined || tiers.gold === null || tiers.gold === '') {
    throw validationError('tiers.gold', 'Gold tier threshold is required')
  }
  if (isNaN(parsedGold) || parsedGold <= 0) {
    throw validationError('tiers.gold', 'Gold tier threshold must be a positive integer')
  }
  if (parsedGold <= parsedSilver) {
    throw validationError(
      'tiers.gold',
      'Gold tier threshold must be greater than Silver tier threshold'
    )
  }

  // ─── minRedemption ────────────────────────────────────────────────────────
  // The minimum number of points a member must have to redeem a voucher.
  // Minimum of 1 — zero would let members redeem with no points at all.
  if (minRedemption === undefined || minRedemption === null || minRedemption === '') {
    throw validationError('minRedemption', 'Minimum redemption points is required')
  }
  const parsedMinRedemption = parseInt(minRedemption, 10)
  if (isNaN(parsedMinRedemption) || parsedMinRedemption < 1) {
    throw validationError('minRedemption', 'Minimum redemption points must be at least 1')
  }

  // ─── welcomeBonus (optional, default 0) ──────────────────────────────────
  // Points awarded automatically when a member first registers.
  // Zero means no bonus — this is a valid off state, not an error.
  const parsedWelcomeBonus = parseInt(welcomeBonus, 10)
  if (isNaN(parsedWelcomeBonus) || parsedWelcomeBonus < 0) {
    throw validationError('welcomeBonus', 'Welcome bonus must be zero or a positive integer')
  }

  // ─── birthdayBonus (optional, default false) ──────────────────────────────
  // Whether this client awards bonus points on a member's birthday.
  // Must be a boolean — strings like "yes" are rejected.
  if (typeof birthdayBonus !== 'boolean') {
    throw validationError('birthdayBonus', 'Birthday bonus must be true or false')
  }


  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2 — DUPLICATE SLUG CHECK
  //
  // Check that no existing client already uses this slug.
  // This runs AFTER validation so we never hit the database with bad data.
  //
  // ─────────────────────────────────────────────────────────────────────────
  const existing = await prisma.client.findUnique({
    where: { slug },
  })
  if (existing) {
    throw duplicateSlugError(slug)
  }


  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3 — ATOMIC DATABASE WRITE
  //
  // WHY sequential $transaction instead of parallel:
  //   prisma.$transaction([op1, op2]) fires both at once — only safe when
  //   operations are independent. Here, ClientConfig REQUIRES client.id,
  //   which only exists after Client is created. We must do step 1 first,
  //   then use its result in step 2.
  //
  //   The sequential callback form — prisma.$transaction(async tx => {}) —
  //   runs each step in order inside one database transaction. We use 'tx'
  //   (not the global 'prisma') for every query so all writes are part of
  //   the same atomic unit. If step 2 fails, step 1 is automatically
  //   rolled back — we never end up with a Client that has no config.
  // ─────────────────────────────────────────────────────────────────────────
  return prisma.$transaction(async (tx) => {

    // Step 1 — create the Client row (merchant identity)
    const client = await tx.client.create({
      data: {
        name: trimmedName,
        slug,
      },
    })

    // Step 2 — create the ClientConfig row tied to the new client's id.
    // We use client.id from step 1 — this is why sequential $transaction is required.
    //
    // Field mapping from the onboarding payload to schema column names:
    //   pointExpiry   → expiryDays
    //   tiers.silver  → tierSilver
    //   tiers.gold    → tierGold
    //   minRedemption → pointsToRedeem
    //
    const config = await tx.clientConfig.create({
      data: {
        clientId:       client.id,
        earnRate:       parsedEarnRate,
        tierSilver:     parsedSilver,
        tierGold:       parsedGold,
        expiryDays:     parsedExpiry,
        pointsToRedeem: parsedMinRedemption,
        welcomeBonus:   parsedWelcomeBonus,
        birthdayBonus:  birthdayBonus,
      },
    })

    // Return both records so the route can pass them back to the caller
    return { client, config }
  })
}
