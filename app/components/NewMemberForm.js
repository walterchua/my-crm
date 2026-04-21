'use client'

// This is the interactive part of the registration page.
// It receives clientId as a prop from the Server Component wrapper (page.js),
// so it never needs to hardcode or fetch it itself.
import { useState } from 'react'
import Link from 'next/link'

export default function NewMemberForm({ clientId }) {
  const [name,            setName]            = useState('')
  const [email,           setEmail]           = useState('')
  const [validationError, setValidationError] = useState('')
  const [apiError,        setApiError]        = useState('')
  const [successMessage,  setSuccessMessage]  = useState('')
  const [loading,         setLoading]         = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    // Clear previous messages
    setValidationError('')
    setApiError('')
    setSuccessMessage('')

    // Inline validation — check before calling the API
    if (!name.trim()) {
      setValidationError('Missing mandatory input: name')
      return
    }
    if (!email.trim()) {
      setValidationError('Missing mandatory input: email')
      return
    }

    setLoading(true)

    try {
      // clientId comes from props — it is the real cuid from the database,
      // fetched server-side before this component ever mounted
      const response = await fetch('/api/members', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), email: email.trim(), clientId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setApiError(data.error || 'Something went wrong')
        return
      }

      setSuccessMessage(`✓ ${data.name} registered successfully! Starting balance: 0 points.`)
      setName('')
      setEmail('')
    } catch {
      setApiError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-md mx-auto">

        {/* Back link */}
        <Link
          href="/members"
          className="text-sm text-gray-400 hover:text-white mb-6 inline-block"
        >
          ← Back to Members
        </Link>

        <h1 className="text-3xl font-bold text-white mb-8">Register New Member</h1>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-5">

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Tan"
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane@email.com"
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Inline validation error */}
          {validationError && (
            <p className="text-red-400 text-sm">{validationError}</p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Registering...' : 'Register Member'}
          </button>

          {/* API error */}
          {apiError && (
            <p className="text-red-400 text-sm">{apiError}</p>
          )}

          {/* Success message */}
          {successMessage && (
            <p className="text-green-400 text-sm">{successMessage}</p>
          )}

        </form>
      </div>
    </main>
  )
}
