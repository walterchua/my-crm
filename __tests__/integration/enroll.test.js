// These tests require npm run dev to be running

/**
 * Integration tests for POST /api/members — member enrollment
 *
 * These tests call the real server over HTTP and interact with a real database.
 * They verify the full stack: HTTP → API route → Prisma → database.
 *
 * Arrange-Act-Assert (AAA) pattern is used in every test:
 *   Arrange — set up inputs and any variables
 *   Act     — make the HTTP request
 *   Assert  — check the response matches expectations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../../lib/prisma.js'

const BASE_URL = 'http://localhost:3000'

describe('POST /api/members — member enrollment', () => {
  // Shared references set during beforeAll and used across tests
  let testClient
  let testClient2

  // ─── Setup ────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    // Create a test client first — ClientConfig has a foreign key to Client,
    // so the Client row must exist before we can create its config.
    // Using a timestamp in the name avoids conflicts if a previous test run
    // left records behind (e.g. from a failed afterAll).
    testClient = await prisma.client.create({
      data: { name: 'Test Client ' + Date.now() },
    })

    // Create the config row for testClient so the server can load business rules
    // (earn rate, tier thresholds) when the enrollment API is called.
    await prisma.clientConfig.create({
      data: {
        clientId:      testClient.id,
        earnRate:      1.0,
        tierSilver:    500,
        tierGold:      1000,
        expiryDays:    365,
        pointsToRedeem: 200,
      },
    })
  })

  // ─── Teardown ─────────────────────────────────────────────────────────────
  afterAll(async () => {
    // Collect the IDs of all test clients that were created (testClient2 may
    // not exist if that test was skipped or failed before creating it).
    const clientIds = [testClient?.id, testClient2?.id].filter(Boolean)

    // 1. Transactions first — they reference both Member and Client (foreign keys).
    //    Deleting members before transactions would violate the FK constraint.
    await prisma.transaction.deleteMany({ where: { clientId: { in: clientIds } } })

    // 2. Vouchers next — same reason: they reference both Member and Client.
    await prisma.voucher.deleteMany({ where: { clientId: { in: clientIds } } })

    // 3. Members before Client — Member has a foreign key to Client.
    await prisma.member.deleteMany({ where: { clientId: { in: clientIds } } })

    // 4. ClientConfig before Client — ClientConfig has a foreign key to Client.
    await prisma.clientConfig.deleteMany({ where: { clientId: { in: clientIds } } })

    // 5. Client last — all child rows have been removed, safe to delete now.
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } })
  })

  // ─── Tests ────────────────────────────────────────────────────────────────

  it('enrolls a new member and returns 201 with zero points and Bronze tier', async () => {
    // Arrange
    const payload = {
      name:     'Alice Test',
      email:    'alice@integrationtest.com',
      clientId: testClient.id,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/members`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(201)
    expect(data.points).toBe(0)
    expect(data.tier).toBe('Bronze')
    expect(data.email).toBe('alice@integrationtest.com')
    expect(data.clientId).toBe(testClient.id)
  })

  it('returns 400 with a Missing mandatory input message when the name field is absent', async () => {
    // Arrange — name is deliberately omitted
    const payload = {
      email:    'nobody@integrationtest.com',
      clientId: testClient.id,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/members`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(data.error).toContain('Missing mandatory input')
  })

  it('returns 400 with a Missing mandatory input message when the email field is absent', async () => {
    // Arrange — email is deliberately omitted
    const payload = {
      name:     'No Email Person',
      clientId: testClient.id,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/members`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(data.error).toContain('Missing mandatory input')
  })

  it('returns 409 when the same email is enrolled a second time under the same client', async () => {
    // Arrange — alice@integrationtest.com was already enrolled in the happy path test above
    const payload = {
      name:     'Alice Duplicate',
      email:    'alice@integrationtest.com',
      clientId: testClient.id,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/members`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(409)
    expect(data.error).toBe('Email already registered for this client')
  })

  it('allows the same email address to be enrolled under a different client because uniqueness is per client', async () => {
    // Arrange — create a second client so we can test the composite unique constraint:
    // @@unique([clientId, email]) means the same email is fine across different clients.
    // testClient2 is created here (not in beforeAll) because this test is the only one that needs it.
    testClient2 = await prisma.client.create({
      data: { name: 'Test Client 2 ' + Date.now() },
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

    const payload = {
      name:     'Alice Other Client',
      email:    'alice@integrationtest.com', // same email, different client
      clientId: testClient2.id,
    }

    // Act
    const res  = await fetch(`${BASE_URL}/api/members`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()

    // Assert
    expect(res.status).toBe(201)
    expect(data.clientId).toBe(testClient2.id)
    expect(data.points).toBe(0)
    expect(data.tier).toBe('Bronze')
  })
})
