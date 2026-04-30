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
- Comment every section of generated code

## What We Are Building
A multi-client CRM loyalty platform as a learning project.
The system manages members, points, tiers, vouchers, and
transactions across multiple independent merchant clients.

Designed with production architecture patterns from the start.
This is a POC to demonstrate that new merchant onboarding
can be a database insert — not a development project.

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

## Schema Rules
- Every table that belongs to a client MUST have
  clientId as a direct field — no exceptions
- Never rely on joins through memberId to infer clientId
- clientId must be present on: Member, Transaction,
  Voucher, and any future tables created
- This enables direct client-scoped queries without joins
- All queries on these tables must include clientId
  in the WHERE clause (Architecture Rule #1)
- Member email uniqueness is per client: @@unique([clientId, email])
- IDs use cuid() strings — never auto-increment integers

## After Any Schema Change — Always Run
1. npx prisma migrate dev
2. npx prisma generate
3. Restart npm run dev

## Seed Data
- Demo client: Demo Coffee Shop (cuid string ID — read from DB)
- Members: Walter Yu (Gold, 1400pts), John Tan (Silver, 320pts)
- Never hardcode clientId — always read from database

## Architecture Rules — Always Follow These
1. Every database query MUST be scoped by clientId
   - Never: prisma.member.findMany()
   - Always: prisma.member.findMany({ where: { clientId } })
   - Member fetch must scope by BOTH memberId AND clientId:
     prisma.member.findFirst({ where: { id: memberId, clientId } })

2. Configuration-first design
   - Business rules (earn rates, tier thresholds) live in ClientConfig
   - Never hardcode business rule values in application code
   - Current scope: Bronze/Silver/Gold tiers only — no Platinum

3. Server Components by default
   - Use "use client" only when useState or interactivity is needed
   - Keep data fetching in Server Components

4. API routes for all data mutations
   - All POST, PUT, DELETE operations go through /api/ routes
   - Never mutate data directly from a Server Component

5. Database transactions for multi-step operations
   - Earn points + log transaction = one atomic $transaction
   - Redeem + voucher + log transaction = one atomic $transaction
   - Creating client + config = sequential $transaction
     (client first, then config using the new client.id)

6. Always validate on the API side
   - Never trust frontend validation alone — both layers required
   - Validate at UI for speed, validate at API for safety
   - Use res.ok to detect errors, not just catch block

## Layer Architecture — Always Follow
- Route layer: HTTP only — validate inputs, call service, return response
- Service layer: Business logic — reads ClientConfig, calls lib, runs DB ops
- Lib layer: Pure functions — no DB, no API (calculatePoints, canRedeem, assignTier)
- Database layer: Prisma queries — always scoped by clientId

## File Structure
- app/api/ → API routes (route.js files)
- app/admin/ → Admin UI pages
- app/components/ → Reusable UI components
- app/context/ → React Context (ClientContext.js)
- services/ → Business logic services
- lib/ → Pure logic functions
- __tests__/ → Vitest unit tests

## Points Engine — Current Scope
- calculatePoints(spendAmount, earnRate) — in lib/
- canRedeem(memberPoints, requiredPoints, expiryDate) — in lib/
- assignTier(points, tierSilver, tierGold) — in lib/
- earnRate comes from ClientConfig — never hardcoded
- Tier assignment: Bronze/Silver/Gold based on points balance
- No promotional rules, time windows, or multipliers yet

## API Response Conventions
- GET success → 200
- POST that creates → 201
- PUT/PATCH success → 200
- DELETE success → 204
- Validation failure → 400
- Duplicate record → 409
- Not found → 404
- Unexpected error → 500
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
- Always console.error the real error before returning 500

## File Conventions
- All files use .js not .tsx or .ts
- No TypeScript — JavaScript only throughout
- Components go in app/components/
- Pure logic functions go in lib/
- Tests go in __tests__/ and end in .test.js

## Styling Rules
- Tailwind CSS only — no inline styles, no CSS modules
- Dark theme throughout — bg-gray-900 surface, bg-gray-950 background
- No external component libraries — Tailwind only

## Routing Conventions
- / → Dashboard (client-aware via ClientContext)
- /members → Members list
- /members/[id] → Member detail
- /members/new → Registration form
- /admin → Admin dashboard (all clients)
- /admin/clients/new → Create client
- /admin/clients/[id] → Client detail
- /admin/clients/[id]/config → Config editor
- /api/members → GET all, POST create
- /api/members/[id] → GET one
- /api/transactions → POST earn points
- /api/redeem → POST redeem voucher
- /api/clients → GET all, POST create
- /api/clients/[id] → GET one
- /api/clients/[id]/config → PUT update config

## Testing Rules
- Pure logic functions in lib/ must have unit tests
- Tests follow Arrange-Act-Assert pattern
- Always test: happy path, boundary condition, error case
- Never test UI styling or static content
- Run npx vitest run before every commit
- Current test suite: 25 tests passing across 4 files