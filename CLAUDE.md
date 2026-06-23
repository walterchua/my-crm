# VIBING101 — Project Context

## Who Walter Is
Product Owner with deep loyalty/CRM domain expertise learning vibecoding
as self-development. Not a developer by background. Always explain what
you are building and why before writing code. Use simple language.
Comment every section of code generated. Tell me when there are multiple
approaches and recommend one. Flag anything that could be a security concern.

## The Learning Project
Multi-client CRM loyalty platform — my-crm
Location: C:\Projects\my-crm
GitHub: github.com/walterchua/my-crm
Database: Supabase PostgreSQL (Singapore region, project mykxhdflzjutsxuhrbga)

## Tech Stack
Next.js 16 (App Router, JavaScript not TypeScript) · Prisma 5.22.0 ·
Supabase · Tailwind CSS · Vitest · Vercel · GitHub Actions

## Current Phase
Phase 6 — Production Hardening (Week 18 of 20)

## Completed Builds
- Build 1  — Nav, members page, registration form, member detail, unit tests
- Build 2  — Earn points API (POST /api/transactions)
- Build 3  — Redemption flow (POST /api/redemptions, voucher creation)
- Build 4  — Admin UI + client config editor
- Build 5  — Full Vitest test suite (25 tests: earn, redeem, enroll, tier)
- Build 6  — GitHub Actions CI pipeline (runs on every push to main)
- Build 7  — Vercel deployment (auto-deploy on push to main)
- Build 8  — Onboarding engine (POST /api/onboarding/import)
- Build 10 — Authentication + full app protection + health check banner

## Remaining Builds
- Build 11 — DB indexes, Sentry error tracking
- Build 12 — Final POC demo

## Database Schema — 6 Tables
Client, ClientConfig, Member, Transaction, Voucher, User

## Schema Rules
- Every table belonging to a client MUST have clientId as a direct field
- Never rely on joins through memberId to infer clientId
- Member email uniqueness is per client: @@unique([clientId, email])
- IDs use cuid() strings — never auto-increment integers
- After any schema change: npx prisma migrate dev → npx prisma generate → restart npm run dev

## Architecture Rules — Always Follow
1. Every query scoped by clientId — never unscoped Prisma queries
   - Never: prisma.member.findMany()
   - Always: prisma.member.findMany({ where: { clientId } })
2. Configuration-first — rules in ClientConfig, never hardcoded
   - Business rules (earn rates, tier thresholds) live in ClientConfig
   - Current scope: Bronze/Silver/Gold tiers only — no Platinum
3. Server Components by default — "use client" only when useState or
   interactivity is needed
4. API routes for all mutations — POST PUT DELETE through /api/
5. DB transactions for multi-step operations — prisma.$transaction()
6. Always validate on API side — never trust frontend alone
   - Validate at UI for speed, validate at API for safety

## Layer Architecture
- Route layer: HTTP only — validate inputs, call service, return response
- Service layer: Business logic — reads ClientConfig, calls lib, runs DB ops
- Lib layer: Pure functions — no DB, no API (calculatePoints, canRedeem, assignTier)
- Database layer: Prisma queries — always scoped by clientId

## Authentication
- NextAuth with CredentialsProvider
- JWT session strategy, 8 hour expiry
- User table in database with bcrypt hashed passwords
- All routes protected by proxy.js middleware (Next.js 16 convention)
- Public routes: /login, /api/auth/*, /api/health only
- Client-side fetches must include: { credentials: 'include' }
- useEffect data fetches must wait for status === 'authenticated'

## File Structure
- app/api/          → API routes (route.js files)
- app/admin/        → Admin UI pages
- app/login/        → Login page
- app/components/   → Reusable UI components (Nav.js, NavWrapper.js)
- app/context/      → React Context (ClientContext.js)
- services/         → Business logic services (onboardingService.js etc)
- lib/              → Pure logic functions
- __tests__/        → Vitest unit and integration tests
- prisma/           → Schema and migrations
- proxy.js          → Next.js 16 middleware (route protection)

## Key API Endpoints
GET  /api/clients
GET  /api/members?clientId=
POST /api/members
POST /api/transactions
POST /api/redemptions
POST /api/onboarding/import
GET  /api/health
POST /api/auth/register    ← first user only, returns 403 if user exists
POST /api/auth/[...nextauth]

## API Response Conventions
- GET success → 200
- POST that creates → 201
- Validation failure → 400
- Duplicate record → 409
- Not found → 404
- Unauthorized → 401
- Forbidden → 403
- Unexpected error → 500
- Errors always return: { error: "human readable message" }
- Never return raw Prisma errors to the user

## Prisma Error Handling
- P2002 unique constraint → 409
- P2025 record not found → 404
- P2003 foreign key fail → 400
- Unknown Prisma error → 500

## Points Engine — Current Scope
- calculatePoints(spendAmount, earnRate) — in lib/
- canRedeem(memberPoints, requiredPoints, expiryDate) — in lib/
- assignTier(points, tierSilver, tierGold) — in lib/
- earnRate comes from ClientConfig — never hardcoded
- Tier: Bronze/Silver/Gold based on points balance

## Testing Rules
- Pure logic functions in lib/ must have unit tests
- Tests follow Arrange-Act-Assert pattern
- Always test: happy path, boundary condition, error case
- Run npx vitest run before every commit
- Unit tests (npm test) — run in CI/CD on every push
- Integration tests (npm run test:int) — run locally before pushing

## File Conventions
- All files use .js not .tsx or .ts — JavaScript only
- Components go in app/components/
- Pure logic functions go in lib/
- Tests go in __tests__/ and end in .test.js

## Styling Rules
- Tailwind CSS only — no inline styles, no CSS modules
- Dark theme throughout — bg-gray-900 surface, bg-gray-950 background
- No external component libraries

## Known Issues — Out of Scope for POC
- Tier assignment uses pointsBalance not lifetimePoints
- No tier cycle tracking or downgrade logic
- No duplicate redemption guard
- pointsExpiryDate not yet wired into redemptionService
- No rate limiting yet (post-POC)
- No Supabase row-level security yet (post-POC)

## Business Context
Walter's company runs a loyalty SaaS powering hundreds of retail and F&B
merchants. Current monolith is unmaintainable — 3 month delivery timelines
losing deals at presales. This project is a POC for the company rebuild.
Configuration-first design solves the delivery problem — new merchant
onboarding becomes a database insert, not a development project.
Target demo: new client live in under 30 minutes, zero code changes.