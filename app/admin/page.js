// Server Component — no "use client" needed because this page only
// reads data and renders it. There is no useState or onClick here.
// Next.js fetches the data on the server before sending HTML to the browser.
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────
// Fetch all clients from our own API.
// We call the API route (rather than Prisma directly) so the
// data layer goes through one path — making it easier to add
// caching, auth middleware, or logging later.
// ─────────────────────────────────────────────────────────────
async function fetchClients() {
  // process.env.NEXT_PUBLIC_BASE_URL lets the server-side fetch
  // know the full URL. Falls back to localhost for local dev.
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const res = await fetch(`${base}/api/clients`, {
    // cache: 'no-store' means every page load gets fresh data
    // instead of a cached snapshot — important for admin views.
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export default async function AdminDashboardPage() {
  const clients = await fetchClients()

  return (
    // Page background — matches the dark theme used across the app
    <div className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Page header row — title on the left, action button on the right */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              All merchant clients on the platform
            </p>
          </div>
          {/* Link to the create-client form */}
          <Link
            href="/admin/clients/new"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Client
          </Link>
        </div>

        {/* Empty state — shown when no clients exist yet */}
        {clients.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No clients yet.</p>
            <p className="text-sm mt-2">
              Create your first client using the button above.
            </p>
          </div>
        ) : (
          // Grid of client cards — 1 column on mobile, 3 on desktop
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              // Each card links to that client's detail page
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="block bg-gray-900 border border-gray-700 rounded-xl p-6 hover:border-indigo-500 transition-colors group"
              >
                {/* Client name */}
                <h2 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
                  {client.name}
                </h2>

                {/* Key stats in a 2-column mini-grid */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Stat
                    label="Earn Rate"
                    value={`${client.config?.earnRate ?? '—'} pts/$`}
                  />
                  <Stat
                    label="Members"
                    value={client._count?.members ?? 0}
                  />
                  <Stat
                    label="Gold Threshold"
                    value={`${client.config?.tierGold ?? '—'} pts`}
                  />
                  <Stat
                    label="Expiry"
                    value={`${client.config?.expiryDays ?? '—'} days`}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Small helper component — renders one labelled stat inside a card.
// Kept in this file because it is only used here.
function Stat({ label, value }) {
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-white mt-0.5">{value}</p>
    </div>
  )
}
