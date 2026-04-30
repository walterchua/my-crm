// Server Component — no data fetching needed here anymore.
// The selected client now lives in ClientContext (populated in the nav).
// Dashboard reads it directly from context, so this page just renders it.
import Dashboard from './components/Dashboard'

export default function HomePage() {
  return <Dashboard />
}
