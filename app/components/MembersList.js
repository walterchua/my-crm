'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Tier badge colours — matches the Dashboard component
const TIER_STYLES = {
  Bronze:   'bg-orange-900  text-orange-300',
  Silver:   'bg-gray-700    text-gray-200',
  Gold:     'bg-yellow-900  text-yellow-300',
  Platinum: 'bg-sky-900     text-sky-300',
}

export default function MembersList({ clients }) {
  // Default to the first client in the list
  const [selectedClientId, setSelectedClientId] = useState(
    clients[0]?.id ?? null
  )
  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Fetch members whenever the selected client changes
  useEffect(() => {
    if (!selectedClientId) return

    async function fetchMembers() {
      setLoading(true)
      setError('')

      try {
        const res  = await fetch(`/api/members?clientId=${selectedClientId}`)
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

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">Members</h1>

          <div className="flex items-center gap-3">
            {/* Client selector */}
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

            {/* Add member button */}
            <Link
              href="/members/new"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              + Add Member
            </Link>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-gray-400 text-sm">Loading members...</p>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {/* Member list — each card links to the detail page with clientId in the URL */}
        {!loading && !error && members.length > 0 && (
          <div className="grid gap-3">
            {members.map(member => (
              // Entire card is a link — clientId is passed so the detail page
              // can scope the database query and prevent cross-client access
              <Link
                key={member.id}
                href={`/members/${member.id}?clientId=${selectedClientId}`}
                className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-4 flex justify-between items-center hover:border-gray-600 hover:bg-gray-800 transition-colors"
              >
                <div>
                  <p className="text-white font-medium">{member.name}</p>
                  <p className="text-gray-400 text-sm">{member.email}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${TIER_STYLES[member.tier] ?? 'bg-gray-700 text-gray-200'}`}>
                      {member.tier}
                    </span>
                    <p className="text-white font-bold text-lg mt-1">
                      {member.points.toLocaleString()} pts
                    </p>
                  </div>
                  <span className="text-gray-500 text-sm">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && members.length === 0 && selectedClientId && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No members yet for this client.</p>
            <Link
              href="/members/new"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Register first member
            </Link>
          </div>
        )}

        {/* No clients */}
        {clients.length === 0 && (
          <p className="text-gray-400">No clients found. Run the seed to add demo data.</p>
        )}

      </div>
    </main>
  )
}
