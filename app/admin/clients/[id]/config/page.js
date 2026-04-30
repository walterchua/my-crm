"use client"

// "use client" is needed because:
// 1. We use useEffect to fetch current config when the page loads
// 2. We use useState to manage form fields, loading, and feedback
// 3. The form submits via fetch (browser-side network call)
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditConfigPage({ params }) {
  // In Next.js 16 App Router, params is a Promise when accessed inside
  // a Client Component — we unwrap it with React.use()
  const { id } = use(params)
  const router = useRouter()

  // Form state — all strings initially (inputs always produce strings)
  const [form, setForm] = useState({
    earnRate:      '',
    tierSilver:    '',
    tierGold:      '',
    expiryDays:    '',
    pointsToRedeem: '',
  })

  // Inline field validation errors
  const [fieldErrors, setFieldErrors] = useState({})

  // API-level error message shown below the form
  const [apiError, setApiError] = useState('')

  // Green success banner shown after a successful save
  const [successMsg, setSuccessMsg] = useState('')

  // True while fetching current config on load
  const [fetching, setFetching] = useState(true)

  // True while PUT request is in-flight
  const [loading, setLoading] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // On mount, fetch the current config to pre-populate the form.
  // We re-use the GET /api/clients/[id] route which already
  // returns the config object embedded in the client response.
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/clients/${id}`)
        if (!res.ok) {
          setApiError('Could not load current configuration.')
          return
        }
        const data = await res.json()
        const cfg = data.config

        // Pre-populate each field with the value from the database
        if (cfg) {
          setForm({
            earnRate:      String(cfg.earnRate),
            tierSilver:    String(cfg.tierSilver),
            tierGold:      String(cfg.tierGold),
            expiryDays:    String(cfg.expiryDays),
            pointsToRedeem: String(cfg.pointsToRedeem),
          })
        }
      } catch {
        setApiError('Network error loading configuration.')
      } finally {
        setFetching(false)
      }
    }

    loadConfig()
  }, [id])

  // Update a single field and clear its inline error on change
  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    // Clear success banner when the user starts editing again
    setSuccessMsg('')
  }

  // ─────────────────────────────────────────────────────────────
  // UI-side validation — mirrors the API rules for instant feedback
  // ─────────────────────────────────────────────────────────────
  function validate() {
    const errors = {}

    if (!form.earnRate)                           errors.earnRate      = 'Earn rate is required'
    else if (parseFloat(form.earnRate) <= 0)      errors.earnRate      = 'Earn rate must be greater than zero'
    if (!form.tierSilver)                         errors.tierSilver    = 'Silver threshold is required'
    if (!form.tierGold)                           errors.tierGold      = 'Gold threshold is required'
    else if (
      form.tierSilver &&
      parseInt(form.tierGold, 10) <= parseInt(form.tierSilver, 10)
    ) {
      errors.tierGold = 'Gold threshold must be greater than Silver threshold'
    }
    if (!form.expiryDays)                         errors.expiryDays    = 'Expiry days is required'
    else if (parseInt(form.expiryDays, 10) <= 0)  errors.expiryDays    = 'Expiry days must be greater than zero'
    if (!form.pointsToRedeem)                     errors.pointsToRedeem = 'Redeem points is required'
    else if (parseInt(form.pointsToRedeem, 10) <= 0) errors.pointsToRedeem = 'Redeem points must be greater than zero'

    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setApiError('')
    setSuccessMsg('')

    // Run UI validation first
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error || 'Something went wrong')
        return
      }

      // Show a green success banner — do not redirect, the user may
      // want to tweak values further without losing context
      setSuccessMsg('Configuration saved successfully')
    } catch {
      setApiError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  // Loading skeleton while current config is being fetched
  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading configuration…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Back navigation to the client's detail page */}
        <Link
          href={`/admin/clients/${id}`}
          className="text-sm text-gray-400 hover:text-gray-100 transition-colors mb-6 inline-block"
        >
          ← Back to Client
        </Link>

        <h1 className="text-2xl font-bold text-white mb-1">Edit Configuration</h1>
        <p className="text-gray-400 text-sm mb-8">
          Update the loyalty rules for this merchant.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* ── Points rules ── */}
          <Section title="Points Rules">
            <Field
              label="Earn Rate (points per $1 spent)"
              name="earnRate"
              type="number"
              step="0.1"
              value={form.earnRate}
              onChange={handleChange}
              error={fieldErrors.earnRate}
            />
            <Field
              label="Points to Redeem (per voucher)"
              name="pointsToRedeem"
              type="number"
              value={form.pointsToRedeem}
              onChange={handleChange}
              error={fieldErrors.pointsToRedeem}
            />
            <Field
              label="Expiry Days (points expire after)"
              name="expiryDays"
              type="number"
              value={form.expiryDays}
              onChange={handleChange}
              error={fieldErrors.expiryDays}
            />
          </Section>

          {/* ── Tier thresholds ── */}
          <Section title="Tier Thresholds">
            <p className="text-xs text-gray-400 -mt-2 mb-3">
              Gold must be higher than Silver. Changes apply to new tier evaluations only.
            </p>
            <Field
              label="Silver Threshold (pts)"
              name="tierSilver"
              type="number"
              value={form.tierSilver}
              onChange={handleChange}
              error={fieldErrors.tierSilver}
            />
            <Field
              label="Gold Threshold (pts)"
              name="tierGold"
              type="number"
              value={form.tierGold}
              onChange={handleChange}
              error={fieldErrors.tierGold}
            />
          </Section>

          {/* Success banner — green, shown after a successful PUT */}
          {successMsg && (
            <p className="text-green-400 text-sm">{successMsg}</p>
          )}

          {/* API-level error — red, shown when the PUT returns an error */}
          {apiError && (
            <p className="text-red-400 text-sm">{apiError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Shared sub-components (same shape as in the new-client form)
// ─────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, name, type, value, onChange, error, step }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        step={step}
        className={[
          'w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm',
          'border focus:outline-none focus:ring-2 focus:ring-indigo-500',
          error ? 'border-red-500' : 'border-gray-600',
        ].join(' ')}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
