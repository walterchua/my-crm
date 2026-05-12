// These tests require npm run dev to be running

/**
 * Integration tests for POST /api/redeem — points redemption
 *
 * These tests call the real server over HTTP and interact with a real database.
 * They verify the full stack: HTTP → API route → redemptionService → Prisma → database.
 *
 * Test client config: pointsToRedeem = 200
 *   Member A — 500 pts: eligible to redeem (500 >= 200)
 *   Member B — 100 pts: not eligible (100 < 200)
 *
 * Arrange-Act-Assert (AAA) pattern is used in every test:
 *   Arrange — set up inputs and any variables
 *   Act     — make the HTTP request
 *   Assert  — check the response matches expectations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../lib/prisma.js'

const BASE_URL = 'http://localhost:3000'

describe('POST /api/redeem — points redemption', () => {
  // Shared references set during beforeAll and used across tests
  let testClient
  let memberA    // 500 pts — can redeem
  let memberB    // 100 pts — cannot redeem (insufficient points)

  // ─── Setup ────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    // Create the test client first — ClientConfig has a foreign key to Client,
    // so the Client row must exist before we create its config.
    // Using a timestamp in the name prevents name collisions across test runs.
    testClient = await prisma.client.create({
      data: { name: 'Test Client ' + Date.now() },
    })

    // Create config with a low redemption threshold (200) so tests are
    // clearly above or below the threshold without large point balances.
    await prisma.clientConfig.create({
      data: {
        clientId:      testClient.id,
        earnRate:      1.0,
        tierSilver:    500,
        tierGold:      1000,
        expiryDays:    30,
        pointsToRedeem: 200,
      },
    })

    // Create Member A with 500 points — well above the 200-point threshold.
    // This is the happy path member; their balance after redemption should be 300.
    memberA = await prisma.member.create({
      data: {
        clientId: testClient.id,
        name:     'Redeem Member A',
        email:    'redeem-a@integrationtest.com',
        points:   500,
        tier:     'Silver',
      },
    })

    // Create Member B with 100 points — below the 200-point threshold.
    // Redemption must be rejected and their balance must remain unchanged.
    memberB = await prisma.member.create({
      data: {
        clientId: testClient.id,
        name:     'Redeem Member B',
        email:    'redeem-b@integrationtest.com',
        points:   100,
        tier:     'Bronze',
      },
    })

    // NOTE: Member C (expired points) is not created here.
    // The Member schema does not include a pointsExpiryDate field, and
    // redemptionService.js hardcodes null for the expiry argument to canRedeem().
    // The expired-points test below is skipped until the schema and service
    // are updated to support point expiry.
  })

  // ─── Teardown ─────────────────────────────────────────────────────────────
  afterAll(async () => {
    // 1. Transactions first — they reference both Member and Client (foreign keys).
    //    Deleting members before transactions would violate the FK constraint.
    await prisma.transaction.deleteMany({ where: { clientId: testClient.id } })

    // 2. Vouchers next — they also reference Member and Client.
    await prisma.voucher.deleteMany({ where: { clientId: testClient.id } })

    // 3. Members before Client — Member has a foreign key to Client.
    await prisma.member.deleteMany({ where: { clientId: testClient.id } })

    // 4. ClientConfig before Client — ClientConfig has a foreign key to Client.
    await prisma.clientConfig.deleteMany({ where: { clientId: testClient.id } })

    // 5. Client last — all child rows have been removed, safe to delete now.
    await prisma.client.delete({ where: { id: testClient.id } })
  })

  // ─── Tests ────────────────────────────────────────────────────────────────

  it('redeems points for an eligible member, issues a voucher, and deducts 200 points from their balance', async () => {
    // Arrange
    const payload = {
      memberId: memberA.id,
      clientId: testClient.id,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/redeem`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert — verify the response shape
    expect(res.status).toBe(201)
    expect(data.newBalance).toBe(300)          // 500 - 200 = 300
    expect(data.pointsDeducted).toBe(200)

    // Architecture Rule #1: clientId must be stored directly on the voucher —
    // verifies the redemption service wrote clientId to the voucher row.
    expect(data.voucher.clientId).toBe(testClient.id)
    expect(data.voucher.memberId).toBe(memberA.id)

    // Verify the transaction audit record also carries clientId (Architecture Rule #1)
    const transaction = await prisma.transaction.findFirst({
      where: { memberId: memberA.id, clientId: testClient.id, type: 'redeem' },
      orderBy: { createdAt: 'desc' },
    })
    expect(transaction).not.toBeNull()
    expect(transaction.clientId).toBe(testClient.id)
    expect(transaction.type).toBe('redeem')
  })

  it('returns 400 and leaves the member balance unchanged when the member does not have enough points', async () => {
    // Arrange — Member B has only 100 pts, threshold is 200 pts
    const payload = {
      memberId: memberB.id,
      clientId: testClient.id,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/redeem`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(data.error).toBe('Not enough points to redeem voucher')

    // Verify Member B's balance is unchanged in the database — no partial writes
    const memberBInDb = await prisma.member.findFirst({
      where: { id: memberB.id, clientId: testClient.id },
    })
    expect(memberBInDb.points).toBe(100)
  })

  it.skip('returns 400 when the member\'s points have expired', () => {
    // KNOWN LIMITATION: The Member schema does not have a pointsExpiryDate field.
    // redemptionService.js hardcodes null for the canRedeem() expiry argument,
    // which means points are treated as never expiring regardless of any future
    // expiry field on the member.
    //
    // This test is skipped until:
    //   1. pointsExpiryDate is added to the Member model in prisma/schema.prisma
    //   2. redemptionService.js is updated to read member.pointsExpiryDate
    //      instead of passing null to canRedeem()
  })

  it('returns 404 when a valid memberId is submitted with a clientId that does not match', async () => {
    // Arrange — memberA.id is a real member but 'wrong-client-id' is not its owner.
    // The service's combined WHERE clause (id AND clientId) will return no row → 404.
    const payload = {
      memberId: memberA.id,
      clientId: 'wrong-client-id',
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/redeem`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(404)
    expect(data.error).toBe('Member not found for this client')
  })

  it('returns 400 when the memberId field is missing from the request body', async () => {
    // Arrange — memberId is deliberately omitted
    const payload = {
      clientId: testClient.id,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/redeem`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(data.error).toContain('Missing mandatory input')
  })
})
