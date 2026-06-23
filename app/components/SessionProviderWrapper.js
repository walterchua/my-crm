'use client'

// ─────────────────────────────────────────────────────────────────────────────
// SessionProviderWrapper
//
// Why does this file exist?
//
// app/layout.js must remain a Server Component because:
//   1. It exports `metadata` — Next.js only reads metadata from Server Components
//   2. It uses next/font/google — font optimisation only works server-side
//
// SessionProvider from next-auth/react needs "use client" (it uses React context
// internally to share session state across the component tree).
//
// The solution is this thin wrapper: layout.js imports it as a regular import
// (Server Components CAN import Client Components), and the "use client"
// boundary lives here, not in layout.js.
//
// Any component in the app that calls useSession() will receive the current
// session state because SessionProvider is at the root of the tree here.
// ─────────────────────────────────────────────────────────────────────────────
import { SessionProvider } from 'next-auth/react'

export default function SessionProviderWrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}
