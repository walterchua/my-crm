// These tests require npm run dev to be running

/**
 * Integration tests for POST /api/transactions — earning points
 *
 * These tests call the real server over HTTP and interact with a real database.
 * They verify the full stack: HTTP → API route → transactionService → Prisma → database.
 *
 * Points arithmetic used throughout:
 *   calculatePoints(spendAmount, earnRate) = Math.floor(spendAmount * earnRate)
 *   With earnRate 2.0:  spend 50  → earn 100 pts
 *                       spend 500 → earn 1000 pts
 *
 * KNOWN: Tier assignment uses pointsBalance not lifetimePoints.
 * This will be addressed in future development.
 *
 * Arrange-Act-Assert (AAA) pattern is used in every test:
 *   Arrange — set up inputs and any variables
 *   Act     — make the HTTP request
 *   Assert  — check the response matches expectations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../lib/prisma.js'

const BASE_URL = 'http://localhost:3000'

describe('POST /api/transactions — earning points', () => {
  // Shared references set during beforeAll and used across tests
  let testClient
  let testMember
  let testClient2
  let testMember2

  // ─── Setup ────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    // Create the primary test client first — config has a FK to client.
    // Using a timestamp in the name prevents name collisions across test runs.
    testClient = await prisma.client.create({
      data: { name: 'Test Client ' + Date.now() },
    })

    // Create config with earnRate 2.0 so points maths is easy to verify
    // (spend 50 → earn exactly 100 pts; spend 500 → earn exactly 1000 pts).
    await prisma.clientConfig.create({
      data: {
        clientId:      testClient.id,
        earnRate:      2.0,
        tierSilver:    500,
        tierGold:      1000,
        expiryDays:    365,
        pointsToRedeem: 200,
      },
    })

    // Create the primary test member with zero points so every earn test
    // starts from a known state.
    testMember = await prisma.member.create({
      data: {
        clientId: testClient.id,
        name:     'Earn Test Member',
        email:    'earn@integrationtest.com',
        points:   0,
        tier:     'Bronze',
      },
    })

    // Create a second client and member for the cross-tenant isolation test.
    // testMember2 belongs to testClient2 — using its ID with testClient.id
    // must always return 404, never process points across tenant boundaries.
    testClient2 = await prisma.client.create({
      data: { name: 'Test Client Tenant2 ' + Date.now() },
    })
    await prisma.clientConfig.create({
      data: {
        clientId:      testClient2.id,
        earnRate:      1.0,
        tierSilver:    500,
        tierGold:      1000,
        expiryDays:    365,
        pointsToRedeem: 200,
      },
    })
    testMember2 = await prisma.member.create({
      data: {
        clientId: testClient2.id,
        name:     'Other Tenant Member',
        email:    'tenant2@integrationtest.com',
        points:   0,
        tier:     'Bronze',
      },
    })
  })

  // ─── Teardown ─────────────────────────────────────────────────────────────
  afterAll(async () => {
    const clientIds = [testClient?.id, testClient2?.id].filter(Boolean)

    // 1. Transactions first — they reference both Member and Client (foreign keys).
    //    Deleting members before transactions would violate the FK constraint.
    await prisma.transaction.deleteMany({ where: { clientId: { in: clientIds } } })

    // 2. Vouchers next — they also reference Member and Client.
    await prisma.voucher.deleteMany({ where: { clientId: { in: clientIds } } })

    // 3. Members before Client — Member has a foreign key to Client.
    await prisma.member.deleteMany({ where: { clientId: { in: clientIds } } })

    // 4. ClientConfig before Client — ClientConfig has a foreign key to Client.
    await prisma.clientConfig.deleteMany({ where: { clientId: { in: clientIds } } })

    // 5. Client last — all child rows have been removed, safe to delete now.
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } })
  })

  // ─── Tests ────────────────────────────────────────────────────────────────

  it('records an earn event, returns 201, and correctly calculates points earned from spend amount', async () => {
    // Arrange
    // spend 50 × earnRate 2.0 = Math.floor(50 * 2.0) = 100 points earned
    const payload = {
      memberId:    testMember.id,
      clientId:    testClient.id,
      spendAmount: 50,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/transactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert — verify the response shape
    expect(res.status).toBe(201)
    expect(data.pointsEarned).toBe(100)
    expect(data.member.points).toBe(100)

    // Architecture Rule #1: clientId must be stored directly on the transaction —
    // verifies the earn service wrote clientId to the transaction row.
    expect(data.transaction.clientId).toBe(testClient.id)
    expect(data.transaction.type).toBe('earn')
  })

  it('upgrades the member to Gold tier when accumulated points reach the Gold threshold', async () => {
    // Arrange
    // After the happy path test above, testMember has 100 points.
    // spend 500 × earnRate 2.0 = Math.floor(500 * 2.0) = 1000 points earned.
    // 100 + 1000 = 1100 → above tierGold (1000) → tier becomes Gold.
    // Note: spending 500 from 0 also yields 1000 pts → Gold, so this test
    // is safe even if the previous test did not run.
    //
    // KNOWN: tier uses pointsBalance not lifetimePoints.
    // This will be addressed in future development.
    const payload = {
      memberId:    testMember.id,
      clientId:    testClient.id,
      spendAmount: 500,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/transactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(201)
    expect(data.member.tier).toBe('Gold')
    expect(data.member.points).toBeGreaterThanOrEqual(1000)
  })

  it('returns 400 when the spendAmount field is missing from the request body', async () => {
    // Arrange — spendAmount is deliberately omitted
    const payload = {
      memberId: testMember.id,
      clientId: testClient.id,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/transactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(data.error).toContain('Missing mandatory input')
  })

  it('returns 400 when the spendAmount is a negative number', async () => {
    // Arrange — negative spend has no business meaning for an earn event
    const payload = {
      memberId:    testMember.id,
      clientId:    testClient.id,
      spendAmount: -10,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/transactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(400)
  })

  it('returns 404 when a valid memberId is submitted with a clientId that does not match', async () => {
    // Arrange — testMember belongs to testClient, not testClient2.
    // Using testClient2.id as the wrong clientId ensures the service can load
    // a ClientConfig (Step 1 passes) but then finds no member under that client
    // (Step 3 fails) — which is the code path that returns 404.
    // A completely fake string would fail at Step 1 (no config) and return 500 instead.
    const payload = {
      memberId:    testMember.id,
      clientId:    testClient2.id, // real client, but not the one testMember belongs to
      spendAmount: 50,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/transactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(404)
    expect(data.error).toBe('Member not found for this client')
  })

  it('returns 404 when a member from one client is submitted with a different client\'s clientId (cross-tenant isolation)', async () => {
    // Arrange — testMember2 belongs to testClient2, not testClient.
    // Attempting to earn points for testMember2 under testClient should be
    // rejected to prevent data from crossing tenant boundaries.
    const payload = {
      memberId:    testMember2.id,
      clientId:    testClient.id, // wrong client for this member
      spendAmount: 50,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/transactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(404)
    expect(data.error).toBe('Member not found for this client')
  })
})
