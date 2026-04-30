'use client'

import { useEffect, useState } from 'react'
import { useClient } from '../context/ClientContext'

export default function Dashboard() {
  // Read the globally selected client from context.
  // When the user changes the nav selector, selectedClient updates here
  // automatically — no prop drilling needed.
  const { selectedClient, clients } = useClient()

  // Members fetched for the selected client
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Re-fetch members whenever the selected client changes
  useEffect(() => {
    if (!selectedClient?.id) return

    async function fetchMembers() {
      setLoading(true)
      setError('')

      try {
        const res  = await fetch(`/api/members?clientId=${selectedClient.id}`)
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
  }, [selectedClient?.id])

  // Derive summary stats from the current member list
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0)
  const tierCounts  = members.reduce((acc, m) => {
    acc[m.tier] = (acc[m.tier] ?? 0) + 1
    return acc
  }, {})

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Page heading — client name shown in subtitle so context is clear */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          {selectedClient && (
            <p className="text-gray-400 text-sm mt-1">
              Viewing: {selectedClient.name}
            </p>
          )}
        </div>

        {/* No clients at all — shown while context is still loading */}
        {clients.length === 0 && (
          <p className="text-gray-400">Loading clients…</p>
        )}

        {/* Summary stat cards — only shown once a client is selected */}
        {!loading && !error && selectedClient && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Total Members" value={members.length} />
            <StatCard label="Total Points"  value={totalPoints.toLocaleString()} />
            <StatCard label="Gold / Silver / Bronze"
              value={`${tierCounts.Gold ?? 0} / ${tierCounts.Silver ?? 0} / ${tierCounts.Bronze ?? 0}`}
            />
          </div>
        )}

        {/* Loading state */}
        {loading && <p className="text-gray-400 text-sm">Loading…</p>}

        {/* Error state */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

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
