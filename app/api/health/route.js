import { prisma } from '../../../lib/prisma.js'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health
//
// A lightweight database liveness probe.
//
// WHY this exists:
//   - External monitoring tools (Uptime Robot, Vercel checks, etc.) can poll
//     this endpoint to detect database outages without scraping a real page.
//   - The admin page calls the underlying Prisma query directly (Server
//     Component pattern), but this route is the public contract for any
//     tool that needs a simple HTTP health check.
//
// Returns:
//   200 { status: 'healthy',   timestamp }  — database is reachable
//   503 { status: 'unhealthy', error }       — database is not reachable
//
// 503 Service Unavailable is the correct status for "I'm up but my dependency
// is down". 500 would imply a bug in this code, which is not the case here.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // $queryRaw sends a raw SQL query directly to the database.
    // SELECT 1 returns immediately with no table reads — it is the
    // lightest possible query to confirm the connection is alive.
    await prisma.$queryRaw`SELECT 1`

    return Response.json(
      { status: 'healthy', timestamp: new Date().toISOString() },
      { status: 200 }
    )

  } catch (error) {
    // Log the real error server-side for diagnostics, but return a safe
    // message — we don't want to expose connection strings or internal details.
    console.error('Health check failed:', error)

    return Response.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    )
  }
}
