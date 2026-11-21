# Kantin Canggih

Sistem Pembayaran Business Center secara E-Money. A web application for managing cashless payments at the school Business Center (canteen) using 13.56 MHz RFID cards, organized around the school's 9 Grha (family) system.

> **Development only.** This project is intentionally set up for local development. No deployment, containerization, or production hardening is configured.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Running the App](#running-the-app)
8. [Default Accounts](#default-accounts)
9. [Project Structure](#project-structure)
10. [Domain Model](#domain-model)
11. [How It Works](#how-it-works)
12. [Available Scripts](#available-scripts)
13. [Notes & Known Limitations](#notes--known-limitations)

---

## Features

### Roles
- **Siswa (Student)** - view transaction history, set/change the RFID card PIN, block/unblock their own card, and change username/password.
- **Guru/Staff (Matta/Pitta)** - assigned to exactly one Grha. Record money collected from students, view per-student balances, and produce (read-only) monthly reports.
- **Admin** - manage all accounts (create, edit, delete, Excel import), assign Grha memberships, link RFID card UIDs to students, set the global monthly spending limit, mark monthly bills paid, and manage the shared cashier password.

### Cashier terminal (`/bc/kasir`)
- Password-gated (single shared password managed by admin).
- Build a cart item-by-item, then press **Bayar**.
- Student taps their RFID card (the reader acts as a keyboard and fills the UID field).
- Student enters their 6-digit numeric card PIN (masked).
- On success the transaction is recorded. After 5 wrong PIN attempts the card is automatically blocked.

### Business rules
- **Postpaid model:** students spend at the Business Center; the Matta/Pitta collects money and records payments. Balance = collected - spent.
- **Global monthly limit** (one setting for all students) enforced at checkout, configurable in Admin -> Pengaturan.
- **Card block reasons:** `MANUAL` (student/admin) or `PIN_ATTEMPTS` (automatic after 5 wrong PINs). Only the card owner or an admin may unblock.
- **Monthly settlement:** the **admin** marks each Grha's monthly bill as paid to the Business Center (Admin -> Tagihan). Staff only view report status. A month can only be settled after it ends, and a settled month whose total later changes can be adjusted.

### Audit logging
- Security audit + dispute trail, kept forever, viewable by admin at **Admin -> Log Aktivitas** (`/admin/logs`) with filters by action, actor, entity, and date.
- Every mutation and successful login/logout is recorded (append-only). Secrets (passwords, PINs, hashes) are never logged; card UIDs are stored only as last-4.
- The cashier has no user account, so its events are recorded with `CASHIER` as the actor plus the machine IP and timestamp.
- Failed login/PIN attempts are intentionally not logged; automatic card blocks are.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL |
| ORM | Prisma 7 (with `@prisma/adapter-pg` driver adapter) |
| Auth | Custom credentials auth (HMAC-signed cookie sessions) |
| Validation | Zod |
| Forms | React Hook Form + `@hookform/resolvers` |
| Password hashing | bcryptjs |
| Excel | SheetJS (`xlsx`) |
| Package manager | npm |

---

## Prerequisites

- **Node.js 20+** (Node 22 LTS recommended)
- **npm 10+**
- **PostgreSQL 14+** running locally

---

## Installation

### 1. Clone / open the project

```bash
cd kantin-canggih
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your environment file

Copy the example file and edit it:

```bash
cp .env.example .env
```

(On Windows PowerShell: `Copy-Item .env.example .env`)

### 4. Configure the database

Make sure PostgreSQL is running and create an empty database (the migration will create tables, but the database itself should exist - or use `prisma migrate dev` which can create it):

```sql
CREATE DATABASE kantin_canggih;
```

Update `DATABASE_URL` in `.env` with your credentials (see [Environment Variables](#environment-variables)).

### 5. Apply migrations

```bash
npx prisma migrate dev
```

This creates the schema and runs the seed automatically (seed is configured in `prisma.config.ts`).

If you need to run the seed manually:

```bash
npx prisma db seed
```

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

---

## Environment Variables

Defined in `.env` (see `.env.example`).

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://USER:PASSWORD@localhost:5432/kantin_canggih?schema=public` |
| `SESSION_SECRET` | Yes | Secret used to sign session cookies. Use a long random string (e.g. `openssl rand -hex 32`). |
| `CASHIER_INITIAL_PASSWORD` | Seed only | Initial cashier password written by the seed. Change it later from the admin UI. |
| `SEED_ADMIN_USERNAME` | Seed only | Username for the initial admin account. |
| `SEED_ADMIN_PASSWORD` | Seed only | Password for the initial admin account. |
| `SEED_ADMIN_FULLNAME` | Seed only | Display name for the initial admin. |

> **Security note for dev:** change the default seed passwords. `SESSION_SECRET` must be at least 16 characters.

---

## Database Setup

### Migrations

```bash
npx prisma migrate dev        # create + apply migrations (also seeds)
npx prisma migrate reset      # DROP everything, re-apply, re-seed
npx prisma db push            # push schema without a migration (prototyping)
```

### Inspect data

```bash
npx prisma studio
```

Opens a browser UI at `http://localhost:5555` to browse and edit rows.

### Prisma 7 note

This project uses **Prisma 7**, which removed `url` from the datasource block. The connection URL is provided via `prisma.config.ts` and the runtime uses the `@prisma/adapter-pg` driver adapter. Do not downgrade Prisma without revisiting `prisma.config.ts` and `lib/db.ts`.

---

## Running the App

```bash
npm run dev     # development (Turbopack)
npm run build   # production build (compile + typecheck check)
npm run start   # run the built app
npm run lint    # ESLint
```

---

## Default Accounts

Created by the seed (`prisma/seed.ts`):

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Cashier | _(page password)_ | `kasir123` at `/bc/kasir` |

> Override these via the `SEED_*` and `CASHIER_INITIAL_PASSWORD` environment variables before running the seed. **Change them in production-like use.**

There are **no** pre-seeded students or staff. Create them from **Admin -> Pengguna -> Tambah Pengguna** or via **Import Excel**.

---

## Project Structure

```
app/
  layout.tsx                  Root layout
  page.tsx                    Role-based redirect to the right dashboard
  globals.css                 Tailwind + component classes (kc-*)
  login/                      Login page
  siswa/                      Student area (history, card, account)
  staff/                      Matta/Pitta area (students, report, account)
  admin/                      Admin area (dashboard, users, import, grha, tagihan, logs, settings)
  bc/kasir/                   Cashier terminal (password-gated, separate from user auth)
  api/
    auth/                     login, logout
    account/                  self-service credential change
    student/card/             set PIN, block/unblock
    staff/                    record payment
    admin/                    users CRUD, reset password, import, template, students, settlements, cashier password, logs
    cashier/                  cashier login, card lookup, payment
components/                   UI + client components
lib/
  db.ts                       Prisma client (pg adapter)
  password.ts                 bcrypt helpers + random password generator
  username.ts                 Username generation rules
  session.ts                  HMAC-signed user & cashier cookies
  auth.ts                     Server-side guards (requireStudent, requireStaff, requireAdmin)
  validation.ts               Zod schemas
  account-creation.ts         Shared account creation (single + import)
  constants.ts                Grha list, labels, limits, cookie names
  money.ts                    Rupiah formatting/parsing
  settings.ts                 Global settings helpers (monthly limit)
  audit.ts                    Append-only audit logging
  logger.ts                   Structured server logger
prisma/
  schema.prisma               Data model
  seed.ts                     Initial admin + cashier password
  migrations/                 Migration history
prisma.config.ts              Prisma 7 config (datasource URL + seed)
```

---

## Domain Model

### Entities
- **User** - base account (`username`, `passwordHash`, `role`, `fullName`). One-to-one with `Student` or `Staff` depending on role.
- **Student** - `grha`, RFID `cardUid` (unique), `cardPinHash`, `cardStatus`, `cardBlockReason`, `pinAttempts`.
- **Staff** - `grha` (exactly one; max 2 staff per Grha).
- **Transaction** - a completed purchase with line items (`TransactionItem`).
- **Payment** - money recorded as collected by a Matta/Pitta from a student.
- **MonthlySettlement** - a Grha's monthly bill paid to the Business Center (unique per grha/year/month).
- **Setting** - key/value store (hashed cashier password and the global monthly limit).
- **AuditLog** - append-only security/dispute trail (actor, action, entity, metadata, IP, timestamp). Actor FK is `SetNull` so logs survive user deletion.

### The 9 Grha
`Airsanya, Daksina, Genya, Madhya, Nairiti, Pascima, Purwa, Uttara, Wayabhya`

### Account generation rules
- **Username:** full name lowercased, spaces and non-alphanumerics removed. If longer than 20 chars, trailing words are dropped until it fits. On collision, a numeric suffix is appended.
- **Password:** 6 random characters from `[a-z1-9]`.
- Passwords are only shown once at creation time.

---

## How It Works

### Authentication
- Two independent cookie sessions:
  - **User session** (`kc_session`) - HMAC-signed, 7-day TTL, httpOnly. Used by students, staff, admins.
  - **Cashier session** (`kc_cashier`) - HMAC-signed, 8-hour TTL, scoped to `/bc/kasir`.
- Sessions are signed with `SESSION_SECRET` using `node:crypto` - no external auth library.

### Checkout flow
1. Cashier adds items and presses **Bayar**.
2. The page waits for a card tap; the RFID reader writes the UID into a focused input and submits.
3. `/api/cashier/lookup` resolves the UID, checks card status and PIN existence, and returns the student's info.
4. Student enters their PIN on the numpad; `/api/cashier/pay` validates it server-side.
5. The server recomputes totals, enforces the balance and global monthly limit, records the transaction, and resets the attempt counter.
6. Wrong PIN increments `pinAttempts`; at 5 the card is blocked with reason `PIN_ATTEMPTS`.

### Reporting
- `/staff/laporan` aggregates the Grha's completed transactions by month, lists per-student totals, and allows the Matta/Pitta to mark a month as paid.
- Reports are printable via the browser (print CSS hides navigation).

---

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build (compiles + typechecks) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:push` | `prisma db push` |
| `npm run db:seed` | `prisma db seed` |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | `prisma migrate reset` |

---

## Notes & Known Limitations

- **Dev only.** No rate limiting, CSRF tokens, or production cookie hardening (cookies use `secure` only when `NODE_ENV=production`).
- **Card PIN** is a 6-digit numeric PIN (for numpad entry) and is separate from the login password. Login passwords are generated from `[a-z1-9]`.
- **Money is stored as integer Rupiah** (no cents) to avoid floating-point errors.
- **RFID UID format** depends on your reader. The app treats it as an opaque string; make sure the reader is configured as a keyboard emulator and appends Enter.
- The seed creates only the admin and cashier password. Students and staff must be added through the admin UI or Excel import.
- The Excel import expects columns: **Full Name**, **Role** (`Siswa` / `Matta/Pitta` / `Admin`), **Grha**. Download the template from the import page.
