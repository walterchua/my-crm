'use client'

// NavWrapper is a dedicated Client Component whose only job is to decide
// whether <Nav /> should render. We need this wrapper because:
//
//   1. app/layout.js is a Server Component (required for metadata + fonts).
//      Server Components cannot use hooks like usePathname().
//
//   2. Nav.js itself already uses useSession() and usePathname() — putting
//      the conditional return inside Nav caused a React hydration mismatch
//      ("Expected static flag was missing") when Next.js reconciled the
//      Server-rendered layout with the Client-rendered nav tree.
//
//   3. By isolating the conditional into this thin wrapper, layout.js stays
//      a clean Server Component and the hook boundary is explicit.

import { usePathname } from 'next/navigation'
import Nav from './Nav'

export default function NavWrapper() {
  // Read the current URL path. This hook is only available in Client Components.
  const pathname = usePathname()

  // Do not render the nav on the login page. The login page has its own
  // full-screen centred layout — the nav bar would be redundant and
  // visually incorrect above it.
  if (pathname === '/login') return null

  // For every other route, render the full navigation bar.
  return <Nav />
}
