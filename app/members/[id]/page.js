// Server Component — runs on the server, queries the database directly.
// Receives the member id from the URL path and clientId from the query string.
import Link from 'next/link'
import { prisma } from '../../../lib/prisma'

// Tier badge colour map — same palette used across the app
const TIER_STYLES = {
  Bronze:   'bg-orange-900 text-orange-300',
  Silver:   'bg-gray-700   text-gray-200',
  Gold:     'bg-yellow-900 text-yellow-300',
  Platinum: 'bg-sky-900    text-sky-300',
}

// In Next.js 15+, both params and searchParams are Promises — must be awaited
export default async function MemberDetailPage({ params, searchParams }) {
  const { id }       = await params
  const { clientId } = await searchParams

  // ── Guard: clientId is required to scope the query ───────────────────────
  // Without it we cannot safely look up the member — return a clear error UI
  if (!clientId) {
    return (
      <ErrorScreen message="Bad request — missing client context." />
    )
  }

  // ── Database query — scoped by BOTH id and clientId ──────────────────────
  // This ensures a member from one client is never visible to another client,
  // even if someone manually types a member id they shouldn't have access to.
  const member = await prisma.member.findFirst({
    where: { id, clientId },
  })

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!member) {
    return (
      <ErrorScreen message="Member not found." />
    )
  }

  // ── Format the join date into a readable string ───────────────────────────
  const joinedDate = new Date(member.createdAt).toLocaleDateString('en-SG', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  })

  // ── Render member detail ──────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Back link */}
        <Link
          href="/members"
          className="text-sm text-gray-400 hover:text-white transition-colors inline-block"
        >
          ← Back to Members
        </Link>

        {/* Member card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-6">

          {/* Name + tier badge */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold text-white">{member.name}</h1>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${TIER_STYLES[member.tier] ?? 'bg-gray-700 text-gray-200'}`}>
              {member.tier}
            </span>
          </div>

          {/* Divider */}
          <hr className="border-gray-800" />

          {/* Detail fields */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Email */}
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</dt>
              <dd className="text-white">{member.email}</dd>
            </div>

            {/* Points balance */}
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">Points Balance</dt>
              <dd className="text-white text-2xl font-bold">{member.points.toLocaleString()} pts</dd>
            </div>

            {/* Member since */}
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">Member Since</dt>
              <dd className="text-white">{joinedDate}</dd>
            </div>

            {/* Member ID — useful for support lookups */}
            <div>
              <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">Member ID</dt>
              <dd className="text-gray-400 text-xs font-mono break-all">{member.id}</dd>
            </div>

          </dl>
        </div>

      </div>
    </main>
  )
}

// ── Reusable error screen ─────────────────────────────────────────────────────
// Shown for both "not found" and "bad request" — keeps error handling DRY
function ErrorScreen({ message }) {
  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href="/members"
          className="text-sm text-gray-400 hover:text-white transition-colors inline-block"
        >
          ← Back to Members
        </Link>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <p className="text-gray-400">{message}</p>
        </div>
      </div>
    </main>
  )
}
