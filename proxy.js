import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// proxy.js — application-wide authentication gate
//
// Next.js 16 runs this file automatically on every matching request BEFORE
// the request reaches any page or API route. Unauthenticated users are
// turned away at the edge — they never touch the database or any server code.
//
// Public paths (no session required):
//   /login         — the sign-in page itself must be reachable without a session
//   /api/auth/**   — NextAuth's own endpoints (sign-in, sign-out, CSRF token).
//                    Protecting these would break the login flow entirely.
//   /api/health    — intentionally public so external monitoring tools can
//                    poll it without needing to authenticate.
//
// Everything else requires a valid session:
//   /              — dashboard
//   /admin/**      — admin pages and client management
//   /members/**    — member pages
//   /api/**        — all API routes (except the public ones above)
//
// Bonus behaviour: if an already-authenticated user visits /login, they are
// redirected to /admin rather than seeing the login form again.
// ─────────────────────────────────────────────────────────────────────────────
export async function proxy(request) {
  const { pathname } = request.nextUrl

  // ─── Check for a valid JWT token in the request ──────────────────────────
  // getToken() reads the NextAuth session cookie and verifies its signature
  // against NEXTAUTH_SECRET. Returns the decoded token object if valid, or
  // null if the cookie is absent, expired, or tampered with.
  const token = await getToken({
    req:    request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isAuthenticated = Boolean(token)

  // ─── Special case: /login ────────────────────────────────────────────────
  // The login page is public, but if the user is already authenticated there
  // is no reason to show it — send them straight to the admin dashboard.
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    // Not authenticated — let them through to the login form
    return NextResponse.next()
  }

  // ─── All other paths: require authentication ─────────────────────────────
  // If the user has a valid session, let the request through to its destination.
  if (isAuthenticated) {
    return NextResponse.next()
  }

  // ─── No valid session — redirect to /login ───────────────────────────────
  // After a successful sign-in, the user always lands on / (the dashboard).
  // We use a fixed callbackUrl of '/' rather than the current pathname so
  // the destination is predictable regardless of which protected page
  // triggered the redirect.
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('callbackUrl', '/')
  return NextResponse.redirect(loginUrl)
}

// ─────────────────────────────────────────────────────────────────────────────
// config.matcher — which paths trigger this proxy function.
//
// The negative lookahead pattern `(?!...)` tells Next.js to run this proxy
// on EVERY path EXCEPT the ones listed inside it:
//
//   _next/static   — compiled JS/CSS bundles — no auth needed, never changes
//   _next/image    — Next.js image optimisation endpoint
//   favicon.ico    — browser tab icon request
//   api/auth       — NextAuth's own routes (must stay public — see above)
//   api/health     — health check endpoint (must stay public — see above)
//
// Without this exclusion the proxy would run on every static asset request,
// which is wasteful and can interfere with Next.js internals.
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/health).*)',
  ],
}
