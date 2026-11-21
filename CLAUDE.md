# CLAUDE.md

This project's agent guidance lives in `AGENTS.md`. Read it before making changes.

@AGENTS.md

## Quick reminders

- Dev-only project. No deployment/Docker/CI. Do not add them.
- Next.js 16 App Router + React 19 + Tailwind v4 + Prisma 7 (driver adapter, URL in `prisma.config.ts`).
- Money = integer Rupiah. Use `lib/money.ts` helpers.
- Code/comments/docs in English; user-facing UI in Indonesian.
- Use server guards in `lib/auth.ts`; API routes check sessions themselves.
- Card PIN = 6 digits (separate from login password). Generated login password = `[a-z1-9]`.
- Purchases are rejected when they exceed the student's balance.
- Before finishing: `npm run build` and `npm run lint` must both pass.
