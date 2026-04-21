import { PrismaClient } from '@prisma/client'

// In development, Next.js hot-reloads modules on every save.
// Without this pattern, each reload creates a new PrismaClient and
// exhausts the database connection pool. We store one instance on
// globalThis so it survives hot-reloads.
const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
