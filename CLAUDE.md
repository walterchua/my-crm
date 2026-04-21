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

## Tech Stack — Always Use These
- Framework: Next.js 16 (App Router, JavaScript not TypeScript)
- Database: Supabase (PostgreSQL, Singapore region)
- ORM: Prisma 5.22.0
- Styling: Tailwind CSS
- Testing: Vitest
- Deployment: Vercel
- Version Control: GitHub

## Project Location
- Local: C:\Projects\my-crm
- GitHub: github.com/walterchua/my-crm
- Database: Supabase project mykxhdflzjutsxuhrbga

## Database Schema
- Schema file: prisma/schema.prisma
- Always read this file before writing any Prisma queries
- 5 models: Client, ClientConfig, Member, Transaction, Voucher
- Every query must be scoped by clientId — never unscoped 
- Always read prisma/schema.prisma before writing any code.

## Seed Data
- Demo client: Demo Coffee Shop (cuid string ID — read from DB)
- Members: Walter Yu (Gold, 1250pts), John Tan (Silver, 320pts)
- Never hardcode clientId — always read from database or env

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
   - Use res.ok to detect errors, not just catch block

## API Response Conventions
- GET success → always 200
- POST that creates a record → always 201
- DELETE success → always 204
- PUT/PATCH success → always 200
- Validation failure → always 400
- Duplicate record → always 409
- Not found → always 404
- Unexpected error → always 500
- Never return 200 for a POST that creates — always 201

## Prisma Error Handling
- P2002 unique constraint → 409
- P2025 record not found → 404
- P2003 foreign key fail → 400
- Unknown Prisma error → 500

## API Response Shape
- Errors always return: { error: "human readable message" }
- Success always returns the created/updated record
- Never return raw Prisma errors to the user
- Always log real errors with console.error before returning 500

## File Conventions
- All files use .js not .tsx or .ts
- Components go in app/components/
- Pure logic functions go in lib/
- Tests go in __tests__/ and end in .test.js
- No TypeScript — JavaScript only throughout

## Styling Rules
- Tailwind CSS only — no inline styles, no CSS modules
- Dark theme throughout — bg-gray-900 surface, bg-gray-950 page background
- No external component libraries — build from scratch with Tailwind

## Routing Conventions
- / → Dashboard
- /members → Members list
- /members/new → Registration form
- /members/[id] → Member detail
- /api/members → GET all, POST create
- /api/members/[id] → GET one, PUT update, DELETE

## Testing Rules
- Pure logic functions in lib/ must have unit tests
- Tests follow Arrange-Act-Assert pattern
- Always test: happy path, boundary condition, error case
- Never test UI styling or static content
- Run npx vitest run before every commit