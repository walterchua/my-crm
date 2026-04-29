import { prisma } from '../lib/prisma.js'
import { canRedeem } from '../lib/canRedeem.js'
import { assignTier } from '../lib/assignTier.js'
import { randomUUID } from 'crypto'

/**
 * Orchestrates a points-redemption event for a member.
 *
 * This function is the single source of truth for the redeem flow.
 * It is intentionally kept separate from the API route so that the
 * business logic can be called from any context (API, scripts, tests)
 * without touching HTTP concerns.
 *
 * Steps:
 *  1. Load the member — scoped to the correct merchant
 *  2. Load the merchant's configuration (redemption threshold, tier thresholds)
 *  3. Guard check: confirm the member is eligible — runs BEFORE any DB write
 *  4. Compute the new balance, new tier, and voucher expiry date
 *  5. Atomically write: deduct points, issue voucher, log transaction
 *
 * @param {object} params
 * @param {string} params.memberId  - The member redeeming their points
 * @param {string} params.clientId  - The merchant the member belongs to
 * @returns {{ voucher, newBalance, pointsDeducted }}
 */
export async function redeemPoints({ memberId, clientId }) {

  // ─── Step 1: Load the member — scoped by memberId AND clientId ────────────
  // Scoping by clientId is mandatory: it prevents one merchant from reading
  // or modifying another merchant's member data (architecture rule #1).
  const member = await prisma.member.findFirst({
    where: { id: memberId, clientId },
  })

  if (!member) {
    throw new Error('Member not found')
  }

  // ─── Step 2: Load client configuration ────────────────────────────────────
  // Business rules (redemption threshold, tier thresholds, expiry window) live
  // in ClientConfig per the architecture rules — never hardcoded here.
  const config = await prisma.clientConfig.findUnique({
    where: { clientId },
  })

  if (!config) {
    throw new Error('Client configuration not found')
  }

  // ─── Step 3: Eligibility guard — runs BEFORE the DB transaction ───────────
  // Why canRedeem is called here, outside prisma.$transaction:
  //   • It is a pure business-rule check. If the member is ineligible we must
  //     bail out immediately — no database rows should be touched at all.
  //   • Running this check before opening a transaction keeps the transaction
  //     window as short as possible, which reduces the time a DB lock is held.
  //   • Placing business logic inside a transaction block mixes concerns and
  //     makes the code harder to test and reason about.
  //
  // Schema note: Member does not yet have a pointsExpiryDate column.
  // We pass null so canRedeem treats the member's points as never expiring.
  // Replace null with member.pointsExpiryDate once the column is added.
  const eligible = canRedeem(member.points, config.pointsToRedeem, null)

  if (!eligible) {
    throw new Error('Not enough points to redeem voucher')
  }

  // ─── Step 4: Compute values needed for the atomic write ───────────────────
  const newBalance = member.points - config.pointsToRedeem
  const newTier    = assignTier(newBalance, config.tierSilver, config.tierGold)

  // Voucher expiry is derived from the merchant's configured window (expiryDays)
  // so different merchants can offer different voucher validity periods.
  const voucherExpiry = new Date()
  voucherExpiry.setDate(voucherExpiry.getDate() + config.expiryDays)

  // Schema note: ClientConfig does not yet have a voucherValue column.
  // Using a fixed default of 5.00 until the schema is extended.
  // Replace this constant with config.voucherValue once the column is added.
  const VOUCHER_VALUE = 5.00

  // ─── Step 5: Atomic write — deduct points + issue voucher + audit log ─────
  // prisma.$transaction guarantees all three writes succeed together or are all
  // rolled back. Using separate awaits would risk a partial state — for example,
  // points deducted but no voucher created — if any write failed mid-way.
  const [, voucher] = await prisma.$transaction([

    // Write 1: deduct the redeemed points and recalculate the member's tier
    prisma.member.update({
      where: { id: memberId },
      data: {
        points: newBalance,
        tier:   newTier,
      },
    }),

    // Write 2: issue the voucher to the member
    // Schema note: Voucher does not have a clientId column — omitted intentionally.
    // A unique code is generated per voucher; expiry is calculated above.
    prisma.voucher.create({
      data: {
        memberId,
        code:       randomUUID(),
        value:      VOUCHER_VALUE,
        expiryDate: voucherExpiry,
      },
    }),

    // Write 3: immutable audit record of this redemption event
    // Schema note: Transaction does not have a clientId column — omitted intentionally.
    // pointsChanged stores the positive amount deducted (consistent with earn convention).
    prisma.transaction.create({
      data: {
        memberId,
        type:          'redeem',
        pointsBefore:  member.points,
        pointsAfter:   newBalance,
        pointsChanged: config.pointsToRedeem,
      },
    }),
  ])

  return {
    voucher,
    newBalance,
    pointsDeducted: config.pointsToRedeem,
  }
}
