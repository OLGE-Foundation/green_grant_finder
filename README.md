# Green Grant Finder

A Next.js app for discovering **approved** green funding opportunities. Users search and filter grants by sector, region, eligibility, and amount; bookmark grants when logged in; and receive weekly email digests. Grant providers can submit new listings for review.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Auth, Postgres, RLS)
- [Resend](https://resend.com/) (weekly digest emails)

## Features

### Phase 1 — Directory
- **Directory UI** with keyword search, sector / region / eligibility / amount filters, sort (deadline, amount, date added), and removable filter chips.
- **GET `/api/grants`** backed by Supabase: only `status = 'approved'`.
- **Grant cards** with funding range, description, tags, deadline urgency, application link, and star bookmark button.

### Phase 2 — User accounts & provider submissions
- **Email/password auth** (Supabase Auth) with `/login`, `/signup`, auth modal, and session refresh via middleware.
- **Bookmarks** persisted to `bookmarks` table; star toggle on grant cards.
- **`/saved`** — same search, filters, and sort as the main directory, scoped to bookmarked grants.
- **Alert preferences** on `/saved` for weekly digest sectors/regions.
- **`/submit`** — multi-step provider form; inserts grants with `status = 'pending'` and `source = 'provider'`.
- **Weekly digest cron** at `GET /api/cron/weekly-digest` (Resend).

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project
- (Optional) [Resend](https://resend.com/) account for email digests

## Getting started

```bash
npm install
```

Create **`.env.local`** in the project root:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key

# Server-only (required for provider submissions + weekly digest)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend (required for weekly digest emails)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Green Grant Finder <alerts@yourdomain.com>

# Cron protection (required for /api/cron/weekly-digest)
CRON_SECRET=your_random_secret
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

### 1. Run the Phase 2 migration

In the Supabase SQL editor, run:

[`supabase/migrations/20260522000000_phase2_user_features.sql`](supabase/migrations/20260522000000_phase2_user_features.sql)

This adds `bookmarks`, `alert_preferences`, `profiles`, and extends `grants` with `source`, `contact_email`, `additional_notes`, and `approved_at`.

### 2. Enable Auth

1. Supabase Dashboard → **Authentication** → **Providers** → enable **Email**.
2. Set **Site URL** to your app origin (e.g. `http://localhost:3000`).
3. Add **Redirect URLs**: `http://localhost:3000/auth/callback` (and production URL when deployed).

If embedding in a WordPress iframe cross-origin, you may need cookie `SameSite=None; Secure` in Supabase auth settings.

### 3. Base grants table

If starting fresh, create `grants` first (see migration comments in README Phase 1 section or the migration file). The API expects columns including `title`, `provider`, `description`, `sector`, `region`, `eligibility`, `amount_min`, `amount_max`, `deadline`, `url`, `status`, `created_at`.

## Database

| Table | Purpose |
|-------|---------|
| `grants` | All grant listings; public read when `status = 'approved'` |
| `bookmarks` | User ↔ grant saves |
| `alert_preferences` | Weekly digest settings per user |
| `profiles` | User email synced from `auth.users` |

Provider submissions are inserted server-side with the service role — no public insert policy on `grants`.

## API routes

| Route | Auth | Description |
|-------|------|-------------|
| `GET /api/grants` | Public | Approved grants with optional `sector`, `region`, `q` |
| `GET /api/grants/saved` | Required | Bookmarked approved grants (same query params) |
| `POST /api/grants/submit` | Public | Provider submission (validated server-side) |
| `GET /api/bookmarks` | Required | List bookmarked grant IDs |
| `POST /api/bookmarks` | Required | Toggle bookmark `{ grantId }` |
| `GET/PUT /api/alerts/preferences` | Required | Read/update digest preferences |
| `GET /api/cron/weekly-digest` | `Bearer CRON_SECRET` | Send weekly digest emails |

## Weekly digest

The cron route finds grants approved in the last 7 days and emails users who have alerts enabled, matching preferred sectors/regions (or sectors/regions from bookmarked grants when prefs are empty).

**Local test:**

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/weekly-digest
```

On Vercel, [`vercel.json`](vercel.json) schedules the job for Mondays at 09:00 UTC. Set `CRON_SECRET` in Vercel env vars; Vercel sends it automatically to cron invocations.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Project layout

```
app/
  api/                  # Grants, bookmarks, alerts, submit, cron
  auth/callback/        # Supabase OAuth/code exchange
  login/ signup/ saved/ submit/
  page.tsx              # Home directory
components/
  auth/                 # AuthProvider, AuthModal, AuthForm
  GrantFinder.tsx       # Main directory
  SavedGrants.tsx       # Saved grants page
  SubmitGrantForm.tsx   # Provider submission
lib/
  supabase/             # Browser, server, admin clients
  grants/               # Filters, constants, normalize
  email/                # Resend + weekly digest
  validation/           # Zod schemas
supabase/migrations/    # SQL migrations
```

## License

Private project (`"private": true` in `package.json`).
