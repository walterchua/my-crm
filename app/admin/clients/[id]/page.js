// Server Component — reads the client from the API and renders a
// static detail page. No interactivity needed, so "use client" is
// not required and we get the performance benefits of server-side rendering.
import Link from 'next/link'
import { notFound } from 'next/navigation'

// ─────────────────────────────────────────────────────────────
// Fetch a single client with config and member count from our API
// ─────────────────────────────────────────────────────────────
async function fetchClient(id) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const res = await fetch(`${base}/api/clients/${id}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch client')
  return res.json()
}

export default async function ClientDetailPage({ params }) {
  const { id } = await params
  const client = await fetchClient(id)

  // notFound() renders Next.js's built-in 404 page for this route
  if (!client) notFound()

  const cfg = client.config
  const memberCount = client._count?.members ?? 0

  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">

        {/* Back navigation */}
        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-gray-100 transition-colors mb-6 inline-block"
        >
          ← Back to Admin
        </Link>

        {/* Client header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{client.name}</h1>
            <p className="text-gray-400 text-xs mt-1 font-mono">{client.id}</p>
          </div>
          {/* Badge showing how many members this client has */}
          <span className="bg-gray-800 text-gray-300 text-sm px-3 py-1 rounded-full">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Config panel */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Loyalty Configuration
            </h2>
            {/* Link to the config editor */}
            <Link
              href={`/admin/clients/${client.id}/config`}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              Edit Config
            </Link>
          </div>

          {/* Config values in a 2-column grid */}
          {cfg ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ConfigRow label="Earn Rate"       value={`${cfg.earnRate} pts / $1`} />
              <ConfigRow label="Silver Tier"     value={`${cfg.tierSilver} pts`} />
              <ConfigRow label="Gold Tier"       value={`${cfg.tierGold} pts`} />
              <ConfigRow label="Points to Redeem" value={`${cfg.pointsToRedeem} pts`} />
              <ConfigRow label="Expiry"          value={`${cfg.expiryDays} days`} />
            </div>
          ) : (
            // Shown if somehow a client was created without a config row
            <p className="text-gray-500 text-sm">No configuration found.</p>
          )}
        </div>

        {/* Note about voucher value — it lives on individual Voucher records,
            not on ClientConfig, so it is not shown here. */}
        <p className="text-xs text-gray-500 mb-6">
          Note: Voucher value is set per voucher at redemption time, not stored in the client config.
        </p>

        {/* Action links */}
        <div className="flex gap-4">
          <Link
            href={`/members?clientId=${client.id}`}
            className="flex-1 text-center bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors border border-gray-600"
          >
            View Members
          </Link>
          <Link
            href={`/admin/clients/${client.id}/config`}
            className="flex-1 text-center bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Edit Configuration
          </Link>
        </div>
      </div>
    </div>
  )
}

// Single labelled value row used inside the config grid
function ConfigRow({ label, value }) {
  return (
    <div className="bg-gray-800 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  )
}
