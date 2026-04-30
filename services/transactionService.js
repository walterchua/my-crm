import { prisma } from '../lib/prisma.js'
import { calculatePoints } from '../lib/calculatePoints.js'
import { assignTier } from '../lib/assignTier.js'

/**
 * Orchestrates an earn-points event for a member.
 *
 * This function is the single source of truth for the earn flow.
 * It is intentionally kept separate from the API route so that
 * the business logic can be called from any context (API, scripts,
 * tests) without touching HTTP concerns.
 *
 * Steps:
 *  1. Load the merchant's configuration (earn rate, tier thresholds)
 *  2. Calculate points earned from the spend amount
 *  3. Load the member and compute their new balance
 *  4. Determine the member's new tier
 *  5. Atomically write the updated member and a new transaction log
 *
 * @param {object} params
 * @param {string} params.memberId    - The member receiving the points
 * @param {string} params.clientId    - The merchant the member belongs to
 * @param {number} params.spendAmount - The purchase amount in currency units
 * @returns {{ member, transaction, pointsEarned, newTier }}
 */
export async function earnPoints({ memberId, clientId, spendAmount }) {

  // ─── Step 1: Load client configuration ────────────────────────────────────
  // Business rules (earn rate, tier thresholds) live in ClientConfig per the
  // architecture rules — never hardcoded in application code.
  const config = await prisma.clientConfig.findUnique({
    where: { clientId },
  })

  if (!config) {
    throw new Error('Client configuration not found')
  }

  // ─── Step 2: Calculate points earned ──────────────────────────────────────
  // Delegating to the existing pure function — we do not rewrite this logic.
  const pointsEarned = calculatePoints(spendAmount, config.earnRate)

  // ─── Step 3: Load the member — scoped by both memberId AND clientId ────────
  // WHY a single combined WHERE clause instead of two separate checks:
  //
  //   ✗ Unsafe two-step approach:
  //       member = findFirst({ where: { id: memberId } })   // finds any member
  //       if (member.clientId !== clientId) throw ...        // checked too late
  //
  //   The unsafe version has a window between the fetch and the check where the
  //   wrong member is already in memory. More critically, any code path that
  //   forgets the second check silently processes cross-tenant data.
  //
  //   ✓ Safe single-step approach (used here):
  //       member = findFirst({ where: { id: memberId, clientId } })
  //
  //   Prisma translates this to:
  //       SELECT * FROM "Member" WHERE id = $1 AND "clientId" = $2
  //
  //   If the memberId belongs to a different client, the database returns no
  //   row — the member is never loaded at all, so no cross-tenant data ever
  //   reaches application code. Existence and ownership are enforced together
  //   in one atomic database operation.
  const member = await prisma.member.findFirst({
    where: { id: memberId, clientId },
  })

  if (!member) {
    throw new Error('Member not found for this client')
  }

  // ─── Step 4: Compute new balance and tier ─────────────────────────────────
  const newBalance = member.points + pointsEarned
  const newTier = assignTier(newBalance, config.tierSilver, config.tierGold)

  // ─── Step 5: Atomic write — member update + transaction log ───────────────
  // prisma.$transaction guarantees both writes succeed or both are rolled back.
  // Two separate awaits would leave the database inconsistent if the second
  // write failed after the first had already committed.
  const [updatedMember, transaction] = await prisma.$transaction([

    // Write 1: update the member's point balance and tier
    prisma.member.update({
      where: { id: memberId },
      data: {
        points: newBalance,
        tier: newTier,
      },
    }),

    // Write 2: insert an immutable audit record of this earn event
    // pointsBefore / pointsAfter / pointsChanged match the Transaction schema
    // amount records the original spend that triggered this earn event
    prisma.transaction.create({
      data: {
        memberId,
        type: 'earn',
        pointsBefore: member.points,
        pointsAfter: newBalance,
        pointsChanged: pointsEarned,
        amount: spendAmount,
      },
    }),
  ])

  return { member: updatedMember, transaction, pointsEarned, newTier }
}
