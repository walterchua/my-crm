'use client'

// useEffect runs code after the component renders in the browser.
// useState holds values that, when changed, cause the component to re-render.
import { useEffect, useState } from 'react'

export default function Dashboard({ clients }) {
  // Track which client is selected — default to the first one in the list
  const [selectedClientId, setSelectedClientId] = useState(
    clients[0]?.id ?? null
  )

  // Members fetched for the selected client
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Fetch members whenever the selected client changes
  useEffect(() => {
    if (!selectedClientId) return

    async function fetchMembers() {
      setLoading(true)
      setError('')

      try {
        const res = await fetch(`/api/members?clientId=${selectedClientId}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to load members')
          setMembers([])
          return
        }

        setMembers(data)
      } catch {
        setError('Something went wrong')
        setMembers([])
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [selectedClientId])

  // Derive summary stats from the current member list
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0)
  const tierCounts  = members.reduce((acc, m) => {
    acc[m.tier] = (acc[m.tier] ?? 0) + 1
    return acc
  }, {})

  // The full name of whichever client is currently selected
  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>

          {/* Client selector dropdown */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="client-select"
              className="text-sm text-gray-400 whitespace-nowrap"
            >
              Viewing client:
            </label>
            <select
              id="client-select"
              value={selectedClientId ?? ''}
              onChange={e => setSelectedClientId(e.target.value)}
              className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* No clients at all */}
        {clients.length === 0 && (
          <p className="text-gray-400">No clients found. Run the seed to add demo data.</p>
        )}

        {/* Summary stat cards */}
        {!loading && !error && members.length >= 0 && selectedClient && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Members" value={members.length} />
            <StatCard label="Total Points"  value={totalPoints.toLocaleString()} />
            <StatCard label="Gold / Platinum"
              value={`${tierCounts.Gold ?? 0} / ${tierCounts.Platinum ?? 0}`}
            />
            <StatCard label="Bronze / Silver"
              value={`${tierCounts.Bronze ?? 0} / ${tierCounts.Silver ?? 0}`}
            />
          </div>
        )}

      </div>
    </main>
  )
}

// Small reusable stat card
function StatCard({ label, value }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
    </div>
  )
}
