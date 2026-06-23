'use client'

// "use client" is required because this page uses useState (for form fields
// and error messages) and calls signIn() from next-auth/react, which is a
// client-side function that interacts with the browser's cookie storage.

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage
//
// A simple email + password form. On submit, it calls NextAuth's signIn()
// function with the 'credentials' provider. NextAuth sends the credentials
// to /api/auth/[...nextauth] which looks up the user and checks the password.
//
// If login succeeds, the user is redirected to / (the dashboard).
// If login fails, NextAuth returns an error string which we display inline.
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  // ─── Form state ─────────────────────────────────────────────────────────────
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const router = useRouter()

  // ─── Handle form submission ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    // Prevent the default browser form submission (full page reload)
    e.preventDefault()
    setError('')
    setLoading(true)

    // signIn('credentials') sends email + password to the NextAuth authorize()
    // callback. redirect: false means NextAuth returns a result object instead
    // of automatically redirecting — we handle the redirect ourselves so we
    // can show an error message if login fails.
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      // NextAuth returns "CredentialsSignin" for bad credentials — we show
      // a friendlier message so we don't expose internal error names.
      setError('Invalid email or password. Please try again.')
      return
    }

    // Login succeeded — navigate to the main dashboard.
    // We go to / rather than /admin so the user lands on the
    // client-facing dashboard regardless of their role.
    router.push('/')
    router.refresh() // refresh to pick up the new session cookie
  }

  return (
    // ─── Page wrapper — centred on screen, dark background ──────────────────
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* ─── Card ─────────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl px-8 py-10">

          {/* Title */}
          <h1 className="text-xl font-bold text-white mb-1">Admin Login</h1>
          <p className="text-gray-400 text-sm mb-8">
            Sign in to access the CRM dashboard
          </p>

          {/* ─── Error banner ─────────────────────────────────────────────── */}
          {/* Only visible when login fails */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* ─── Login form ───────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="admin@example.com"
              />
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Submit button — shows a spinner while the request is in flight */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
