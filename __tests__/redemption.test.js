/**
 * Arrange-Act-Assert (AAA) pattern
 * ─────────────────────────────────
 * Every test in this file is structured in three steps:
 *
 *   Arrange — set up the inputs, mocks, and any variables needed for the test
 *   Act     — call the function being tested
 *   Assert  — check that the result or thrown error matches what we expect
 *
 * These tests cover the orchestration logic of redeemPoints() in
 * services/redemptionService.js. We mock all external dependencies
 * (Prisma and the lib functions) so tests run without a real database
 * and each case is fully controlled.
 *
 * canRedeem's own logic is already covered in __tests__/canRedeem.test.js.
 * Here we test how the SERVICE responds to canRedeem's verdict.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { redeemPoints } from '../services/redemptionService.js'
import { prisma } from '../lib/prisma.js'
import { canRedeem } from '../lib/canRedeem.js'

// ─── Mock: Prisma client ───────────────────────────────────────────────────
// Replacing the real Prisma client with vi.fn() stubs means tests never
// open a database connection. Each test can control what "the DB returns".
//
// We must stub every Prisma method the service calls — including member.update,
// voucher.create, and transaction.create — because those calls are evaluated
// immediately when the service builds the array passed to $transaction.
// Even though $transaction is mocked to return a fixed result, Prisma still
// invokes each operation builder before handing the array off.
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    member:       { findFirst: vi.fn(), update: vi.fn() },
    clientConfig: { findUnique: vi.fn() },
    voucher:      { create: vi.fn() },
    transaction:  { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// ─── Mock: canRedeem ───────────────────────────────────────────────────────
// We mock canRedeem so each test can declare eligibility directly.
// This also future-proofs the expired-points test: once the Member schema
// gains a pointsExpiryDate column and the service passes it through,
// the mock here lets us simulate an expiry rejection without needing real
// date arithmetic in the service test.
vi.mock('../lib/canRedeem.js', () => ({
  canRedeem: vi.fn(),
}))

// ─── Mock: assignTier ──────────────────────────────────────────────────────
// We only need a stable return value here; tier logic is tested in
// __tests__/assignTier.test.js.
vi.mock('../lib/assignTier.js', () => ({
  assignTier: vi.fn().mockReturnValue('Bronze'),
}))

// ─── Shared fixture data ───────────────────────────────────────────────────
// These values represent a typical single-merchant setup reused across tests.
const MOCK_CLIENT_ID = 'client-abc'
const MOCK_MEMBER_ID = 'member-xyz'

const MOCK_CONFIG = {
  clientId:      MOCK_CLIENT_ID,
  pointsToRedeem: 500,
  tierSilver:    500,
  tierGold:      2000,
  expiryDays:    365,
}

const MOCK_VOUCHER = {
  id:         1,
  memberId:   MOCK_MEMBER_ID,
  code:       'uuid-1234',
  value:      5.00,
  status:     'active',
  expiryDate: new Date('2027-01-01'),
}

// Default transaction result: [updatedMember, voucher, transactionLog]
// The service destructures position [1] for the voucher.
const DEFAULT_TX_RESULT = [
  { id: MOCK_MEMBER_ID, points: 750, tier: 'Bronze' },
  MOCK_VOUCHER,
  { id: 1, type: 'redeem' },
]

// ─── Tests ────────────────────────────────────────────────────────────────

describe('redeemPoints', () => {

  beforeEach(() => {
    // Clear all call history between tests so assertions never bleed across cases
    vi.clearAllMocks()

    // Set up default prisma responses — individual tests override what they need
    prisma.clientConfig.findUnique.mockResolvedValue(MOCK_CONFIG)
    prisma.$transaction.mockResolvedValue(DEFAULT_TX_RESULT)
  })

  // ─── Happy path ─────────────────────────────────────────────────────────
  // The normal expected case: member has enough points, voucher is issued.

  it('issues a voucher when the member has more points than required', async () => {
    // Arrange — member has 1250 pts; threshold is 500 — comfortably eligible
    const member = { id: MOCK_MEMBER_ID, clientId: MOCK_CLIENT_ID, points: 1250 }
    prisma.member.findFirst.mockResolvedValue(member)
    canRedeem.mockReturnValue(true)

    // Act
    const result = await redeemPoints({ memberId: MOCK_MEMBER_ID, clientId: MOCK_CLIENT_ID })

    // Assert — the DB transaction must have run and the return shape is correct
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(result).toMatchObject({
      voucher:        MOCK_VOUCHER,
      newBalance:     750,   // 1250 - 500
      pointsDeducted: 500,
    })
  })

  // ─── Negative flow ───────────────────────────────────────────────────────
  // Member does not have enough points — no DB write should happen at all.

  it('throws and skips the DB transaction when the member has insufficient points', async () => {
    // Arrange — member has only 100 pts; threshold is 500 — not eligible
    const member = { id: MOCK_MEMBER_ID, clientId: MOCK_CLIENT_ID, points: 100 }
    prisma.member.findFirst.mockResolvedValue(member)
    canRedeem.mockReturnValue(false)

    // Act & Assert — service must throw before touching the database
    await expect(
      redeemPoints({ memberId: MOCK_MEMBER_ID, clientId: MOCK_CLIENT_ID })
    ).rejects.toThrow('Not enough points to redeem voucher')

    // The DB transaction must NOT have been opened
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // ─── Boundary ────────────────────────────────────────────────────────────
  // Member has exactly the required balance — canRedeem treats >= as eligible.

  it('issues a voucher when the member has exactly the required points balance', async () => {
    // Arrange — member has exactly 500 pts (the minimum threshold)
    const member = { id: MOCK_MEMBER_ID, clientId: MOCK_CLIENT_ID, points: 500 }
    prisma.member.findFirst.mockResolvedValue(member)
    canRedeem.mockReturnValue(true)

    // Override the transaction result for this case: post-redeem balance is 0
    prisma.$transaction.mockResolvedValue([
      { id: MOCK_MEMBER_ID, points: 0, tier: 'Bronze' },
      MOCK_VOUCHER,
      { id: 2, type: 'redeem' },
    ])

    // Act
    const result = await redeemPoints({ memberId: MOCK_MEMBER_ID, clientId: MOCK_CLIENT_ID })

    // Assert — transaction ran, balance is zero, full threshold was deducted
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(result.newBalance).toBe(0)     // 500 - 500
    expect(result.pointsDeducted).toBe(500)
    expect(result.voucher).toEqual(MOCK_VOUCHER)
  })

  // ─── Expired points ──────────────────────────────────────────────────────
  // Points have expired — no voucher should be issued even with enough balance.
  //
  // Note: the current Member schema does not have a pointsExpiryDate column,
  // so the service currently passes null to canRedeem (treating points as
  // never expiring). We mock canRedeem here to simulate the rejection that
  // will occur once the schema is extended with an expiry field and the
  // service is updated to pass that value through.

  it('throws and skips the DB transaction when the member\'s points have expired', async () => {
    // Arrange — member has plenty of points but canRedeem returns false
    // because (once schema is extended) the expiry date is in the past
    const member = { id: MOCK_MEMBER_ID, clientId: MOCK_CLIENT_ID, points: 1000 }
    prisma.member.findFirst.mockResolvedValue(member)
    canRedeem.mockReturnValue(false)   // simulates an expiry-based rejection

    // Act & Assert
    await expect(
      redeemPoints({ memberId: MOCK_MEMBER_ID, clientId: MOCK_CLIENT_ID })
    ).rejects.toThrow('Not enough points to redeem voucher')

    // No DB writes should have occurred
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

})
