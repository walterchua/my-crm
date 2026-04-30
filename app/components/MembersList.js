'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useClient } from '../context/ClientContext'

// Tier badge colours — matches the Dashboard component
const TIER_STYLES = {
  Bronze: 'bg-orange-900 text-orange-300',
  Silver: 'bg-gray-700   text-gray-200',
  Gold:   'bg-yellow-900 text-yellow-300',
}

// MembersList no longer receives `clients` as a prop.
// It reads the selected client directly from context, so the
// selection persists when the user navigates away and comes back.
export default function MembersList() {
  // selectedClient comes from the nav selector — { id, name }
  const { selectedClient, clients } = useClient()

  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Fetch members whenever the selected client changes
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

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header row — client name shown as subtitle, action button on the right */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Members</h1>
            {selectedClient && (
              <p className="text-gray-400 text-sm mt-1">
                Viewing: {selectedClient.name}
              </p>
            )}
          </div>

          <Link
            href="/members/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            + Add Member
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <p className="text-gray-400 text-sm">Loading members...</p>
        )}

        {/* Error state */}
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {/* Member list — each card links to the detail page.
            clientId is passed in the URL so the detail page can scope
            its database query and prevent cross-client access. */}
        {!loading && !error && members.length > 0 && (
          <div className="grid gap-3">
            {members.map(member => (
              <Link
                key={member.id}
                href={`/members/${member.id}?clientId=${selectedClient.id}`}
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

        {/* Empty state — shown when a client is selected but has no members */}
        {!loading && !error && members.length === 0 && selectedClient && (
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

        {/* No clients loaded yet — context is still fetching */}
        {clients.length === 0 && (
          <p className="text-gray-400 text-sm">Loading clients…</p>
        )}

      </div>
    </main>
  )
}
