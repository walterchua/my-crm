import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma.js'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
//
// Creates the very first admin user account.
// This endpoint locks itself after one successful registration — if a User
// row already exists, it returns 403 so it cannot be used to create extra
// admin accounts via the API. Additional admins must be created directly in
// the database or through a future admin management UI.
//
// SECURITY NOTE: This endpoint should be called once during initial setup,
// then left in place (it self-locks). Do NOT expose it publicly — add a
// network-level restriction or delete after first use in production.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request) {

  // ─── Parse request body ───────────────────────────────────────────────────
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const { email, password, name } = body

  // ─── Validate required fields ─────────────────────────────────────────────
  if (!email || !password || !name) {
    return Response.json(
      { error: 'email, password, and name are all required' },
      { status: 400 }
    )
  }

  if (typeof password !== 'string' || password.length < 8) {
    return Response.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  // ─── Check if any admin already exists ────────────────────────────────────
  // count() is cheaper than findFirst() — we only need a yes/no answer.
  // If at least one User row exists, registration is closed.
  const existingCount = await prisma.user.count()
  if (existingCount > 0) {
    return Response.json(
      { error: 'Registration is closed. An admin account already exists.' },
      { status: 403 }
    )
  }

  // ─── Hash the password ────────────────────────────────────────────────────
  // bcrypt.hash() runs the password through the bcrypt algorithm with a cost
  // factor of 12. A higher cost factor means more CPU work per login attempt,
  // which makes brute-force attacks much slower. 12 is a good balance between
  // security and the time it takes a legitimate user to log in (~300ms).
  // The plain-text password is never stored — only this hash.
  const hashedPassword = await bcrypt.hash(password, 12)

  // ─── Create the user record ───────────────────────────────────────────────
  try {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        // role defaults to 'admin' as defined in the schema
      },
    })

    // Return 201 Created — NEVER include the password hash in the response
    return Response.json(
      { email: user.email, name: user.name, role: user.role },
      { status: 201 }
    )

  } catch (error) {
    // P2002 — email already taken (another request beat us to it)
    if (error.code === 'P2002') {
      return Response.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }
    console.error('Error creating admin user:', error)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
