// Server Component — no "use client" needed because this page only
// reads data and renders it. There is no useState or onClick here.
// Next.js fetches the data on the server before sending HTML to the browser.

// force-dynamic tells Next.js to re-run this page on every request
// instead of caching the result at build time. Without this, Next.js
// may serve a stale snapshot with no clients shown.
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getClients } from '../../services/clientService'
import { prisma } from '../../lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// WHY the health check runs here instead of calling GET /api/health:
//
// Server Components cannot call their own API routes via fetch() — there is
// no localhost server running during server-side rendering on Vercel.
// Instead, Server Components call the underlying logic (Prisma, services)
// directly. The /api/health route exists for external monitoring tools that
// need an HTTP endpoint; the admin page does the equivalent check inline.
// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {

  // ─── Database health check ──────────────────────────────────────────────────
  // Run a lightweight SELECT 1 query to confirm the database is reachable.
  // If this throws, dbHealthy is set to false and the page renders the
  // error banner with all action buttons disabled.
  let dbHealthy = true
  let clients   = []

  try {
    await prisma.$queryRaw`SELECT 1`
    // If the DB is up, fetch the client list for the dashboard
    clients = await getClients()
  } catch {
    // Database is unreachable — render a degraded but non-crashing page
    dbHealthy = false
  }

  return (
    // Page background — matches the dark theme used across the app
    <div className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* ─── Health banner ─────────────────────────────────────────────────
            Only shown when the database health check fails.
            Appears at the very top so it is immediately visible.
        ─────────────────────────────────────────────────────────────────── */}
        {!dbHealthy && (
          <div className="flex items-center gap-3 bg-red-950 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-8">
            <span className="text-red-400 text-lg">⚠</span>
            <p className="text-sm font-medium">
              Database unavailable — actions are disabled
            </p>
          </div>
        )}

        {/* Page header row — title on the left, action button on the right */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              All merchant clients on the platform
            </p>
          </div>

          {/* ─── New Client button ──────────────────────────────────────────
              When the database is healthy: a Link navigates to the create form.
              When the database is down: a disabled button prevents navigation
              because creating a client would fail anyway.
          ─────────────────────────────────────────────────────────────────── */}
          {dbHealthy ? (
            <Link
              href="/admin/clients/new"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + New Client
            </Link>
          ) : (
            <button
              disabled
              className="bg-indigo-600 opacity-40 cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              + New Client
            </button>
          )}
        </div>

        {/* Empty state — shown when the DB is healthy but no clients exist yet */}
        {dbHealthy && clients.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No clients yet.</p>
            <p className="text-sm mt-2">
              Create your first client using the button above.
            </p>
          </div>
        )}

        {/* Grid of client cards — 1 column on mobile, 3 on desktop */}
        {dbHealthy && clients.length > 0 && (
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
