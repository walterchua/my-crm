// These tests require npm run dev to be running

/**
 * Integration tests for POST /api/clients and PUT /api/clients/[id]/config
 *
 * These tests call the real server over HTTP and interact with a real database.
 * They verify the full admin flow: create a client, update its config, and
 * confirm the new config is immediately applied to live earn calculations.
 *
 * Test ordering matters here: the client created in test 1 is reused by tests
 * 4 and 5. The createdClientId variable carries the ID between tests.
 *
 * Arrange-Act-Assert (AAA) pattern is used in every test:
 *   Arrange — set up inputs and any variables
 *   Act     — make the HTTP request
 *   Assert  — check the response matches expectations
 */

import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '../../lib/prisma.js'

const BASE_URL = 'http://localhost:3000'

describe('POST /api/clients and PUT /api/clients/[id]/config — admin flows', () => {
  // createdClientId flows from the "Create client" test to subsequent tests.
  // It is null until that test succeeds.
  let createdClientId = null

  // earnTestMemberId is set inside the "verify config update is live" test so
  // afterAll can clean it up even if the assertion fails.
  let earnTestMemberId = null

  // ─── Teardown ─────────────────────────────────────────────────────────────
  afterAll(async () => {
    // Only clean up if the client was actually created (test 1 succeeded).
    if (!createdClientId) return

    // 1. Transactions first — they reference both Member and Client (foreign keys).
    //    Deleting members before transactions would violate the FK constraint.
    await prisma.transaction.deleteMany({ where: { clientId: createdClientId } })

    // 2. Vouchers next — they also reference Member and Client.
    await prisma.voucher.deleteMany({ where: { clientId: createdClientId } })

    // 3. Members before Client — Member has a foreign key to Client.
    //    earnTestMember was created under createdClientId, so this covers it.
    await prisma.member.deleteMany({ where: { clientId: createdClientId } })

    // 4. ClientConfig before Client — ClientConfig has a foreign key to Client.
    await prisma.clientConfig.deleteMany({ where: { clientId: createdClientId } })

    // 5. Client last — all child rows have been removed, safe to delete now.
    await prisma.client.delete({ where: { id: createdClientId } })
  })

  // ─── Tests ────────────────────────────────────────────────────────────────

  it('creates a new client with its initial config and returns 201 with both records', async () => {
    // Arrange — use a timestamp so the client name does not collide across test runs
    const payload = {
      name:           'Admin Test Client ' + Date.now(),
      earnRate:       1.0,
      tierSilver:     300,
      tierGold:       600,
      expiryDays:     90,
      pointsToRedeem: 100,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/clients`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Store the ID so subsequent tests in this suite can reference it
    createdClientId = data?.client?.id ?? null

    // Assert — both the client and its config were created atomically
    expect(res.status).toBe(201)
    expect(data.client).toBeDefined()
    expect(data.config).toBeDefined()
    expect(data.client.name).toBe(payload.name)
    expect(data.config.clientId).toBe(data.client.id)
    expect(data.config.earnRate).toBe(1.0)

    // Confirm both rows actually exist in the database
    const clientInDb = await prisma.client.findUnique({ where: { id: data.client.id } })
    const configInDb = await prisma.clientConfig.findUnique({ where: { clientId: data.client.id } })
    expect(clientInDb).not.toBeNull()
    expect(configInDb).not.toBeNull()
  })

  it('returns 400 when the client name is missing from the request body', async () => {
    // Arrange — name is deliberately omitted; no DB record should be created
    const payload = {
      earnRate:       1.0,
      tierSilver:     300,
      tierGold:       600,
      expiryDays:     90,
      pointsToRedeem: 100,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/clients`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(data.error).toContain('Missing mandatory input')
  })

  it('returns 400 when the Gold tier threshold is not greater than the Silver tier threshold', async () => {
    // Arrange — tierGold is equal to tierSilver, which violates the business rule
    const payload = {
      name:           'Bad Tiers Client',
      earnRate:       1.0,
      tierSilver:     500,
      tierGold:       500, // must be strictly greater than tierSilver
      expiryDays:     90,
      pointsToRedeem: 100,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/clients`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(data.error).toBe('Gold tier threshold must be greater than Silver tier threshold')
  })

  it('updates the client config earnRate and returns 200 with the updated config record', async () => {
    // Arrange — use the client created in test 1 (createdClientId must not be null)
    // Update earnRate from 1.0 to 4.0; all other fields are required by the route.
    const payload = {
      earnRate:       4.0,  // changing from 1.0
      tierSilver:     300,
      tierGold:       600,
      expiryDays:     90,
      pointsToRedeem: 100,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/clients/${createdClientId}/config`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(200)
    expect(data.earnRate).toBe(4.0)
    expect(data.clientId).toBe(createdClientId)
  })

  it('applies the updated earnRate immediately so that the next earn call uses the new rate', async () => {
    // Arrange — create a member under the test client so we can earn points.
    // We create via Prisma directly because we are testing the earn flow, not enrollment.
    // earnTestMemberId is stored so afterAll can clean it up regardless of whether
    // this test passes or fails.
    const member = await prisma.member.create({
      data: {
        clientId: createdClientId,
        name:     'Config Live Test Member',
        email:    'config-live@integrationtest.com',
        points:   0,
        tier:     'Bronze',
      },
    })
    earnTestMemberId = member.id

    // spend 100 × earnRate 4.0 = Math.floor(100 * 4.0) = 400 points
    const payload = {
      memberId:    member.id,
      clientId:    createdClientId,
      spendAmount: 100,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/transactions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert — the earn calculation should use the new earnRate of 4.0, not the old 1.0
    expect(res.status).toBe(201)
    expect(data.pointsEarned).toBe(400)   // 100 * 4.0 = 400, proves new config is live
    expect(data.member.points).toBe(400)

    // Architecture Rule #1: clientId must be stored directly on the transaction
    expect(data.transaction.clientId).toBe(createdClientId)
  })
})
