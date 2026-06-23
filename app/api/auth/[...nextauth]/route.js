import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../../lib/prisma.js'

// ─────────────────────────────────────────────────────────────────────────────
// authOptions — the full NextAuth configuration object.
//
// Exported separately so middleware.js and other files can reference the same
// config without reimporting NextAuth (avoids multiple handler instances).
// ─────────────────────────────────────────────────────────────────────────────
export const authOptions = {

  // ─── Providers ─────────────────────────────────────────────────────────────
  // CredentialsProvider lets users log in with email + password.
  // It is deliberately simple for this admin-only POC. For a public-facing
  // app you would add OAuth providers (Google, GitHub, etc.) here.
  providers: [
    CredentialsProvider({
      name: 'Credentials',

      // These fields tell NextAuth what to collect on the built-in sign-in page.
      // We use our own /login page, so these are mainly used internally.
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },

      // authorize() is called when a user submits their credentials.
      // Return a user object on success, or null on failure.
      // NEVER throw — returning null is the correct way to signal bad credentials.
      async authorize(credentials) {
        // ─── Guard: both fields must be present ──────────────────────────────
        if (!credentials?.email || !credentials?.password) return null

        // ─── Look up user by email ────────────────────────────────────────────
        // findUnique is safe here — email has @unique in the schema, so this
        // query uses the index and returns at most one row.
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        // If no user found, return null — same response as wrong password
        // so callers cannot enumerate which emails exist.
        if (!user) return null

        // ─── Compare the submitted password against the stored hash ────────────
        // bcrypt.compare() runs the hash algorithm on the submitted password and
        // checks it against the stored hash. The original password is never stored.
        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        if (!passwordMatch) return null

        // ─── Return the user shape NextAuth will put in the token ─────────────
        // Only include fields we actually need — do NOT return the password hash.
        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          role:  user.role,
        }
      },
    }),
  ],

  // ─── Session strategy ───────────────────────────────────────────────────────
  // 'jwt' stores the session in a signed cookie — no database session table needed.
  // maxAge of 8 hours means admins are logged out after a working day.
  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60, // 8 hours in seconds
  },

  // ─── Custom pages ───────────────────────────────────────────────────────────
  // Tell NextAuth to use our own /login page instead of its built-in one.
  // Unauthenticated users will be redirected here by the middleware.
  pages: {
    signIn: '/login',
  },

  // ─── Callbacks ──────────────────────────────────────────────────────────────
  // Callbacks let us extend the default token and session shapes.
  // We add role and id so that any part of the app can read them from the session.
  callbacks: {
    // jwt() runs when a token is created or updated.
    // The `user` argument is only present on the first sign-in — we copy
    // the extra fields into the token so they survive across requests.
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = user.role
      }
      return token
    },

    // session() runs when session data is read by the app.
    // We copy id and role from the token into session.user so components
    // can read session.user.role without a separate database call.
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id
        session.user.role = token.role
      }
      return session
    },
  },

  // ─── Secret ─────────────────────────────────────────────────────────────────
  // Used to sign JWT tokens and encrypt cookies.
  // Must match NEXTAUTH_SECRET in .env — set a strong random value in production.
  secret: process.env.NEXTAUTH_SECRET,
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler export
//
// Next.js App Router requires named GET and POST exports.
// NextAuth handles both — GET is used by the session check endpoint,
// POST is used for sign-in, sign-out, and CSRF token requests.
// ─────────────────────────────────────────────────────────────────────────────
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
