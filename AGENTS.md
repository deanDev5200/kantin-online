<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md - Kantin Canggih

Guidance for AI agents and developers working in this repository. Read this before making changes.

## What this project is

A **development-only** web app for e-money payments at a school Business Center (canteen), built around the school's 9 Grha (family) system. Users pay with 13.56 MHz RFID cards. No deployment, containerization, or production hardening is set up - do not add it unless explicitly asked.

## Source of truth

- **`README.md`** - install/run instructions, env vars, domain model, feature overview.
- **`prisma/schema.prisma`** - the data model. This is authoritative; do not invent fields or relations.
- **`lib/constants.ts`** - the Grha enum/labels, limits, cookie names, and other constants.
- **`lib/validation.ts`** - Zod schemas shared by forms and route handlers.

## Tech stack (non-obvious bits)

- **Next.js 16 (App Router)**, React 19, TypeScript, Tailwind CSS v4.
- **Prisma 7** with `@prisma/adapter-pg` driver adapter.
  - The datasource `url` is **NOT** in `schema.prisma` - it lives in `prisma.config.ts`.
  - `PrismaClient` is constructed with the adapter in `lib/db.ts` and `prisma/seed.ts`. Never construct a bare `new PrismaClient()`.
  - Client generation is `npx prisma generate` (Prisma 7). Do **not** upgrade to Prisma 8 - its workflow is different (contract-based) and will break this code.
- **Auth** is custom: HMAC-signed cookies via `node:crypto` in `lib/session.ts`. There is no NextAuth/OAuth. Two independent sessions: user (`kc_session`) and cashier (`kc_cashier`).
- **Validation** is Zod. Use `lib/validation.ts` schemas in both the form (React Hook Form + `@hookform/resolvers`) and the API route.

## Project conventions

### Language
- **All code, comments, identifiers, file names, commits, and developer-facing docs are English.**
- **User-facing UI text is Indonesian** (labels, errors, toasts, page copy). Do not translate UI to English.
- Code comments: only where the *why* is non-obvious. Do not narrate what the code does.

### Money
- Store money as **integer Rupiah** (no cents). Never use floats for money.
- Format with `formatRupiah` / parse with `parseRupiahInput` from `lib/money.ts`.

### Roles and access
- Roles: `STUDENT`, `STAFF` (Matta/Pitta), `ADMIN`.
- Server-side guards live in `lib/auth.ts`: `requireStudent`, `requireStaff`, `requireAdmin`, `requireSession`, `requireRole`. **Use these** in server components/pages; never re-implement role checks.
- API routes are not covered by those redirect helpers - they must check the session themselves and return `401`/`403` JSON. Follow the existing pattern: `const session = await getSession(); if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });`.
- The cashier area (`/bc/kasir`) uses a **separate** password gate (`getCashierSession`) and is **not** tied to a user account. The cashier cookie must be scoped to `path: "/"` so `/api/cashier/*` receives it.

### Grha rules
- Exactly **9** Grha, defined by the `Grha` enum and `GRHA_LIST` in `lib/constants.ts`. Never hardcode a different list.
- Each **Staff** belongs to exactly **1** Grha. Each Grha has **at most 2** Staff - enforced in `lib/account-creation.ts` and the admin user update route.
- Each **Student** belongs to exactly **1** Grha.
- Import/parsing compares Grha against the **uppercase enum values** (e.g. `"AIRSANYA"`), not title-case labels.

### Accounts
- Username generation: `lib/username.ts` - lowercase, strip non-alphanumerics, <= 20 chars (drop trailing words), numeric suffix on collision. Do not change without confirming with the project owner.
- Generated passwords: 6 chars from `[a-z1-9]` (`lib/password.ts`). Always hashed with bcrypt before storage.
- **Card PIN** is separate from login password: exactly **6 digits** (`/^[0-9]{6}$/`). It is masked everywhere and never logged.
- Passwords are stored hashed only. The **plaintext is shown exactly once** at create/reset time. Never add an endpoint or UI that reveals a stored password.

### Payment model (postpaid)
- A student's **balance** = total `Payment` amounts - total completed `Transaction` amounts.
- A purchase is rejected if `total > balance` (`app/api/cashier/pay/route.ts`, plus an early client check in the terminal).
- The **monthly spending limit** is a single **global** setting (`Setting` key `monthly_limit_rupiah`, managed in Admin -> Pengaturan), enforced per student at checkout. There is no per-student limit.
- Wrong card PIN increments `pinAttempts`; at 5 the card is auto-blocked with `cardBlockReason = "PIN_ATTEMPTS"`. Only the card owner or an admin may unblock.
- Monthly bills are settled per Grha via `MonthlySettlement` (unique per grha/year/month). **Only admin** marks a bill as paid (`/api/admin/settlements`); staff only view report status.

### API route conventions
- App Router route handlers under `app/api/**/route.ts`.
- Return `NextResponse.json(...)`; use correct status codes (400 validation, 401 auth, 403 forbidden, 404 missing, 409 conflict).
- Validate input with the matching Zod schema; return the first issue message as `error`.
- Recompute authoritative values server-side (totals, balances) - never trust client-provided amounts.

### Prisma usage
- Import the singleton: `import { prisma } from "@/lib/db"`. Do not create clients ad hoc.
- After schema changes: `npx prisma migrate dev --name <name>` then `npx prisma generate`.
- The seed lives in `prisma/seed.ts` and is wired via `prisma.config.ts` (`migrations.seed`). Run with `npx prisma db seed`.

### UI
- Global component classes are prefixed `kc-` in `app/globals.css` (`kc-card`, `kc-btn`, `kc-input`, `kc-table`, `kc-badge`, ...). Reuse them; prefer them over ad-hoc Tailwind for consistency.
- Shared primitives: `components/ui.tsx` (`Field`, `SubmitButton`, `Card`, `Badge`).
- Client components that call the API use `useRouter().refresh()` after mutations to refresh server-rendered data.

## Commands

```bash
npm run dev            # dev server
npm run build          # compile + typecheck + prerender (must pass)
npm run lint           # ESLint (must pass)
npx prisma migrate dev # apply schema changes
npx prisma db seed     # seed admin + cashier password
npx prisma studio      # inspect data
```

**Before finishing any task: run `npm run build` and `npm run lint` and make sure both pass.**

## Do not
- Do not add deployment config, Docker, CI/CD, or hosting setup.
- Do not upgrade Prisma to v8 or change the adapter setup.
- Do not change the Grha list or username/password generation rules without confirmation.
- Do not translate user-facing UI to English or code/comments to Indonesian.
- Do not re-add the experimental `cacheComponents` / `partialPrefetching` flags in `next.config.ts` (they break prerendering here).
- Do not expose or attempt to recover stored plaintext passwords.
