import { prisma } from '../lib/prisma'

// ─────────────────────────────────────────────────────────────
// createClient
// ─────────────────────────────────────────────────────────────
// Why sequential $transaction instead of parallel?
//
// Prisma's parallel form — prisma.$transaction([op1, op2]) —
// fires all operations at the same time. You can only use it
// when operations are completely independent of each other.
//
// Here, creating ClientConfig REQUIRES the Client's id, which
// only exists after the Client row has been inserted. We cannot
// know that id in advance, so we cannot start both operations
// simultaneously.
//
// The sequential (callback) form — prisma.$transaction(async tx => {})
// — runs each step in order inside the same database transaction.
// We use 'tx' (the transaction-scoped Prisma client) instead of
// the global 'prisma' so every query is part of the same atomic
// unit. If step 2 fails, step 1 is automatically rolled back —
// we will never end up with a Client row that has no config.
// ─────────────────────────────────────────────────────────────
export async function createClient({
  name,
  earnRate,
  tierSilver,
  tierGold,
  expiryDays,
  pointsToRedeem,
}) {
  return prisma.$transaction(async (tx) => {
    // Step 1 — create the Client record (merchant identity)
    const client = await tx.client.create({
      data: { name },
    })

    // Step 2 — create the ClientConfig tied to that new client.
    // We use client.id from step 1 — this is why sequential is required.
    const config = await tx.clientConfig.create({
      data: {
        clientId:      client.id,
        earnRate:      parseFloat(earnRate),
        tierSilver:    parseInt(tierSilver, 10),
        tierGold:      parseInt(tierGold, 10),
        expiryDays:    parseInt(expiryDays, 10),
        pointsToRedeem: parseInt(pointsToRedeem, 10),
      },
    })

    // Return both so the API can hand them back to the caller
    return { client, config }
  })
}

// ─────────────────────────────────────────────────────────────
// getClients
// Returns every client with their config and member count.
// No clientId filter — this is the admin view of all clients.
// ─────────────────────────────────────────────────────────────
export async function getClients() {
  return prisma.client.findMany({
    include: {
      // Pull in all ClientConfig fields alongside each client
      config: true,
      // _count asks Prisma to count related records without
      // fetching every member row — efficient for display
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ─────────────────────────────────────────────────────────────
// getClient
// Returns a single client by id, with config and member count.
// Returns null if the id does not match any row.
// ─────────────────────────────────────────────────────────────
export async function getClient(id) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      config: true,
      _count: { select: { members: true } },
    },
  })
}

// ─────────────────────────────────────────────────────────────
// updateConfig
// Updates the ClientConfig row that belongs to the given clientId.
// Returns the updated config record.
// ─────────────────────────────────────────────────────────────
export async function updateConfig(clientId, {
  earnRate,
  tierSilver,
  tierGold,
  expiryDays,
  pointsToRedeem,
}) {
  return prisma.clientConfig.update({
    where: { clientId },
    data: {
      earnRate:      parseFloat(earnRate),
      tierSilver:    parseInt(tierSilver, 10),
      tierGold:      parseInt(tierGold, 10),
      expiryDays:    parseInt(expiryDays, 10),
      pointsToRedeem: parseInt(pointsToRedeem, 10),
    },
  })
}
