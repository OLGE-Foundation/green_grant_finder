# Green Grant Finder

A Next.js app for discovering **approved** green funding opportunities. Users search and filter grants by sector, region, eligibility, and amount; results are loaded from **Supabase** via a small API route.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Supabase JS](https://supabase.com/docs/reference/javascript/introduction) (`@supabase/supabase-js`)

## Features

- **Directory UI** with keyword search, sector / region / eligibility / amount filters, sort (deadline, amount, date added), and removable filter chips.
- **GET `/api/grants`** backed by Supabase: only `status = 'approved'`, optional `sector` / `region` (array `.contains`), optional `q` (ILIKE on `title`, `description`, `provider`), ordered by `deadline` ascending.
- **Grant cards** with funding range, description, tags, deadline urgency, optional application link, and a save button (disabled until you wire `isLoggedIn` in `GrantFinder.tsx`).

## Prerequisites

- Node.js 20+ (matches `@types/node` in the project)
- A [Supabase](https://supabase.com/) project with a `grants` table (see below)

## Getting started

```bash
npm install
```

Create **`.env.local`** in the project root (this file is gitignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

Optional server-only aliases (read by the API route if the `NEXT_PUBLIC_*` names are not set):

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_anon_public_key
```

### Supabase URL

Use `https://<project-ref>.supabase.co` in the env var — **not** `…/rest/v1/…`. The client adds `/rest/v1`; duplicating it breaks requests. The API strips a trailing `/rest/v1` if present, but the env value should still be the bare project URL.

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

The API queries **`public.grants`**. Column expectations:

| Column | Notes |
|--------|--------|
| `id` | `uuid` (or compatible string primary key) |
| `status` | Text; API filters `approved` |
| `title`, `deadline`, `created_at` | Used for display and sorting |
| `sector`, `region`, `eligibility` | **`text[]`** (required for `.contains` filters from the API) |
| `provider` or `provider_name` | Search + display |
| `description` or `short_description` | Search + display |
| `amount_min` / `amount_max` and/or `funding_amount_min` / `funding_amount_max` | Display and client-side amount filter |
| `url` or `application_url` | Optional “Apply” link on cards |

Example table and a minimal RLS policy for public read of approved rows:

```sql
create table public.grants (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft',
  title text not null,
  provider text,
  description text,
  amount_min numeric,
  amount_max numeric,
  sector text[] default '{}',
  region text[] default '{}',
  eligibility text[] default '{}',
  deadline timestamptz,
  url text,
  created_at timestamptz not null default now()
);

alter table public.grants enable row level security;

create policy "Public read approved grants"
  on public.grants for select
  to anon, authenticated
  using (status = 'approved');
```

Adjust names and types to match your real schema; grant `select` on the table to `anon` if you use the anon key.

## API

### `GET /api/grants`

| Query | Behavior |
|-------|-----------|
| `sector` | `.contains('sector', [value])` — value must exist in the row’s `sector` array |
| `region` | `.contains('region', [value])` |
| `q` | ILIKE search across `title`, `description`, `provider` |

Response: JSON array of rows, or JSON error object with `error`, and when available `code`, `details`, `hint`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server (after `build`) |
| `npm run lint` | ESLint |

## Project layout

```
app/
  api/grants/route.ts   # Sup-backed grants API
  layout.tsx            # Root layout (fonts)
  page.tsx              # Home (background + GrantFinder)
  globals.css           # Tailwind + global motion tokens
components/
  GrantFinder.tsx       # Filters, search, list, data fetching
  GrantCard.tsx         # Individual grant card
types/
  grant.ts              # TypeScript shape for a grant row
```

## License

Private project (`"private": true` in `package.json`). Add a license file if you open-source the repo.
