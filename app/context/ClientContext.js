"use client"

// Context must be "use client" because createContext and useContext
// are React browser APIs — they have no meaning on the server.
import { createContext, useContext, useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────
// The Context object
// ─────────────────────────────────────────────────────────────
// createContext() creates a named slot that can hold any value.
// null is the default — it signals "no Provider found above you",
// which we catch in useClient() below and throw a helpful error.
const ClientContext = createContext(null)

// ─────────────────────────────────────────────────────────────
// ClientProvider
// ─────────────────────────────────────────────────────────────
// This component wraps the entire app (via layout.js). It owns the
// shared state and makes it available to every component underneath.
//
// State stored here:
//   clients         — full list of all clients, fetched once on mount
//   selectedClient  — the currently active client { id, name }
//
// We fetch from GET /api/clients rather than Prisma directly because
// this is a Client Component (browser-side) — it cannot import Prisma.
// ─────────────────────────────────────────────────────────────
export function ClientProvider({ children }) {
  const [clients,        setClients]        = useState([])
  const [selectedClient, setSelectedClient] = useState(null)

  // Fetch all clients once when the app first loads.
  // useEffect with [] runs exactly once after the first render.
  useEffect(() => {
    async function loadClients() {
      try {
        const res  = await fetch('/api/clients')
        const data = await res.json()

        if (!res.ok || !Array.isArray(data)) return

        setClients(data)

        // Auto-select the first client so pages are never blank
        if (data.length > 0) {
          setSelectedClient({ id: data[0].id, name: data[0].name })
        }
      } catch {
        // If the fetch fails, clients stays [] and pages show a graceful empty state
      }
    }

    loadClients()
  }, [])

  // The value object is what every useClient() call receives.
  // Wrapping in an object means we can add more fields later without
  // changing every consumer.
  const value = { clients, selectedClient, setSelectedClient }

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────
// useClient — the public hook
// ─────────────────────────────────────────────────────────────
// Any component that needs the selected client calls this.
// It returns { clients, selectedClient, setSelectedClient }.
//
// Throwing when used outside a Provider catches setup mistakes
// early — you get a clear error instead of a silent undefined.
// ─────────────────────────────────────────────────────────────
export function useClient() {
  const context = useContext(ClientContext)
  if (!context) {
    throw new Error('useClient must be used inside a <ClientProvider>')
  }
  return context
}
