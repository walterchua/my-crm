"use client"

// "use client" is required because this page uses useState for
// form values, validation errors, loading state, and the API
// error message — all of which are interactive browser concerns.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewClientPage() {
  const router = useRouter()

  // One piece of state per form field — controlled inputs
  const [form, setForm] = useState({
    name:          '',
    earnRate:      '',
    tierSilver:    '',
    tierGold:      '',
    expiryDays:    '',
    pointsToRedeem: '',
  })

  // Inline validation errors shown beneath each field
  const [fieldErrors, setFieldErrors] = useState({})

  // The error message returned by the API (shown below the form)
  const [apiError, setApiError] = useState('')

  // True while the POST request is in-flight — disables the button
  const [loading, setLoading] = useState(false)

  // Update a single field and clear its validation error on change
  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
  }

  // ─────────────────────────────────────────────────────────────
  // UI-side validation — runs before we hit the network.
  // This gives the user instant feedback without waiting for a
  // round-trip. The API also validates (safety net), but both
  // layers are required: UI for speed, API for security.
  // ─────────────────────────────────────────────────────────────
  function validate() {
    const errors = {}

    if (!form.name.trim())                        errors.name          = 'Client name is required'
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

    // Run UI validation first — stop here if anything is wrong
    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      // res.ok is false for any 4xx or 5xx status — use it, not just catch
      if (!res.ok) {
        setApiError(data.error || 'Something went wrong')
        return
      }

      // On success, redirect to the new client's detail page
      router.push(`/admin/clients/${data.client.id}`)
    } catch {
      // Network-level failure (e.g. server is down)
      setApiError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">

        {/* Back navigation */}
        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-gray-100 transition-colors mb-6 inline-block"
        >
          ← Back to Admin
        </Link>

        <h1 className="text-2xl font-bold text-white mb-1">New Client</h1>
        <p className="text-gray-400 text-sm mb-8">
          Create a merchant and configure their loyalty rules.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* ── Identity ── */}
          <Section title="Identity">
            <Field
              label="Client Name"
              name="name"
              type="text"
              placeholder="e.g. Sunrise Coffee"
              value={form.name}
              onChange={handleChange}
              error={fieldErrors.name}
            />
          </Section>

          {/* ── Points rules ── */}
          <Section title="Points Rules">
            <Field
              label="Earn Rate (points per $1 spent)"
              name="earnRate"
              type="number"
              step="0.1"
              placeholder="e.g. 1"
              value={form.earnRate}
              onChange={handleChange}
              error={fieldErrors.earnRate}
            />
            <Field
              label="Points to Redeem (per voucher)"
              name="pointsToRedeem"
              type="number"
              placeholder="e.g. 500"
              value={form.pointsToRedeem}
              onChange={handleChange}
              error={fieldErrors.pointsToRedeem}
            />
            <Field
              label="Expiry Days (points expire after)"
              name="expiryDays"
              type="number"
              placeholder="e.g. 365"
              value={form.expiryDays}
              onChange={handleChange}
              error={fieldErrors.expiryDays}
            />
          </Section>

          {/* ── Tier thresholds ── */}
          <Section title="Tier Thresholds">
            <p className="text-xs text-gray-400 -mt-2 mb-3">
              Each threshold is the minimum cumulative points to reach that tier.
              Gold must be higher than Silver.
            </p>
            <Field
              label="Silver Threshold (pts)"
              name="tierSilver"
              type="number"
              placeholder="e.g. 500"
              value={form.tierSilver}
              onChange={handleChange}
              error={fieldErrors.tierSilver}
            />
            <Field
              label="Gold Threshold (pts)"
              name="tierGold"
              type="number"
              placeholder="e.g. 2000"
              value={form.tierGold}
              onChange={handleChange}
              error={fieldErrors.tierGold}
            />
          </Section>

          {/* API-level error shown below the form */}
          {apiError && (
            <p className="text-red-400 text-sm">{apiError}</p>
          )}

          {/* Submit button — disabled and relabelled while loading */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Client'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Section — groups related fields under a heading
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

// ─────────────────────────────────────────────────────────────
// Field — a labelled input with optional inline error message
// ─────────────────────────────────────────────────────────────
function Field({ label, name, type, value, onChange, error, placeholder, step }) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        className={[
          'w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm',
          'border focus:outline-none focus:ring-2 focus:ring-indigo-500',
          error ? 'border-red-500' : 'border-gray-600',
        ].join(' ')}
      />
      {/* Inline error — only rendered when validation fails for this field */}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
