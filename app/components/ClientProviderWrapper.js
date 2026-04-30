"use client"

// ─────────────────────────────────────────────────────────────
// ClientProviderWrapper
// ─────────────────────────────────────────────────────────────
// Why does this file exist?
//
// app/layout.js must remain a Server Component because:
//   1. It exports `metadata` — Next.js only reads metadata from server components
//   2. It uses next/font/google — font optimisation only works server-side
//
// But ClientProvider needs "use client" (it uses useState and useEffect).
// The solution is this thin wrapper: layout.js imports it as a regular
// component (safe — Server Components can import Client Components),
// and the "use client" boundary lives here, not in layout.js.
// ─────────────────────────────────────────────────────────────
import { ClientProvider } from '../context/ClientContext'

export default function ClientProviderWrapper({ children }) {
  return <ClientProvider>{children}</ClientProvider>
}
