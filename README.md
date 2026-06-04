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

### Phase 3 — Automated grant scraping
- **Python scraper** in [`scraper/`](scraper/) (UNEP HTML, GlobalGiving JSON, Climateworks Playwright).
- **Fingerprint deduplication** via SHA-256 of `title|provider|url` before bulk insert.
- **GitHub Actions** workflow [`.github/workflows/scrape.yml`](.github/workflows/scrape.yml): Sundays 00:00 UTC + manual `workflow_dispatch`.

## Prerequisites

- Node.js 20+
- Python 3.11+ (for local scraper runs)
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

### 2. Run the Phase 3 migration

In the Supabase SQL editor, run:

[`supabase/migrations/20260604000000_phase3_scraper_fingerprint.sql`](supabase/migrations/20260604000000_phase3_scraper_fingerprint.sql)

This adds `grants.fingerprint` with a unique partial index for scraper deduplication.

### 3. Enable Auth

1. Supabase Dashboard → **Authentication** → **Providers** → enable **Email**.
2. Set **Site URL** to your app origin (e.g. `http://localhost:3000`).
3. Add **Redirect URLs**: `http://localhost:3000/auth/callback` (and production URL when deployed).

If embedding in a WordPress iframe cross-origin, you may need cookie `SameSite=None; Secure` in Supabase auth settings.

### 4. Base grants table

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

## Scraper (Phase 3)

Scraped grants are inserted with `status = 'pending'` and `source = 'scraper'`. Review and approve them in Supabase before they appear in the public directory.

### Local run

Create **`scraper/.env`** (or use root `.env.local`):

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

You can also use `NEXT_PUBLIC_SUPABASE_URL` (same value as the Next.js app). Use the project URL **without** a `/rest/v1` suffix.

**Use an isolated virtualenv** so scraper deps do not conflict with other global tools (`litellm`, `mcp`, etc.):

```powershell
cd scraper
.\setup.ps1
.\.venv\Scripts\Activate.ps1
python scraper.py
```

On macOS/Linux: `cd scraper && bash setup.sh && source .venv/bin/activate && python scraper.py`

`setup.ps1` / `setup.sh` install from `scraper/requirements.txt` (uses `supabase==2.10.0` + `httpx==0.27.0` so `create_client` works in CI and locally). Warnings about `litellm` / `mcp` only apply if you install into **global** Python — use `scraper/.venv` instead.

Optional overrides: `UNEP_URL` / `UNEP_URLS`, `GLOBALGIVING_API_URL`, `CLIMATEWORKS_URL` / `CLIMATEWORKS_URLS`.

Do not use `https://www.climateworks.org/grants/` — it redirects off-site. Defaults scrape `/programs/` and `/global-grantmaking/`.

UNEP uses Playwright when httpx is blocked (Cloudflare). Default sources: funding-and-partnerships and environment-fund pages.

### GitHub Actions

Repository secrets (Settings → Secrets and variables → Actions — **required**; the workflow fails immediately if either is missing):

| Secret | Value |
|--------|--------|
| `SUPABASE_URL` | Project URL (no `/rest/v1` suffix). You may use secret name `NEXT_PUBLIC_SUPABASE_URL` instead if you already defined it for the app. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key from Supabase Dashboard → Project Settings → API |

Workflow: [`.github/workflows/scrape.yml`](.github/workflows/scrape.yml) — weekly cron `0 0 * * 0` (Sunday midnight UTC) and manual dispatch.

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
scraper/                # Phase 3 Python scrapers + orchestrator
.github/workflows/      # scrape.yml weekly automation
```

## License

Private project (`"private": true` in `package.json`).
