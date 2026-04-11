# my-crm Project Context

## Who I Am
I am a Product Owner with deep loyalty and CRM domain expertise,
learning vibecoding (AI-assisted development) as a self-development
initiative. I am not a developer by background.

Please always:
- Explain what you are building and why before writing code
- Use simple language and avoid unexplained jargon
- Tell me when there are multiple approaches and recommend one
- Flag anything that could be a security concern
- Keep code comments explaining what each section does

## What We Are Building
A multi-client CRM loyalty platform as a learning project.
The system manages members, points, tiers, vouchers, and
transactions across multiple independent merchant clients.

This is a learning project but designed with production
architecture patterns from the start.

## Tech Stack
- Framework: Next.js 16 (App Router, JavaScript not TypeScript)
- Database: Supabase (PostgreSQL)
- ORM: Prisma
- Styling: Tailwind CSS
- Testing: Vitest
- Deployment: Vercel
- Version Control: GitHub

## Architecture Rules — Always Follow These
1. Every database query MUST be scoped by clientId
   - Never: prisma.member.findMany()
   - Always: prisma.member.findMany({ where: { clientId } })

2. Configuration-first design
   - Business rules (earn rates, tier thresholds) live in ClientConfig
   - Never hardcode these values in application code

3. Server Components by default
   - Use "use client" only when useState or interactivity is needed
   - Keep data fetching in Server Components

4. API routes for all data mutations
   - All POST, PUT, DELETE operations go through /api/ routes
   - Never mutate data directly from a Server Component

5. Database transactions for multi-step operations
   - Earn points + log = one transaction
   - Redeem + voucher + log = one transaction

6. Always validate on the API side
   - Never trust frontend validation alone
   - Zod for request body validation

## Database Models
- Client (merchant using the platform)
- ClientConfig (earn rates, tier thresholds, expiry rules per client)
- Member (end customer belonging to a client)
- Transaction (earn and re