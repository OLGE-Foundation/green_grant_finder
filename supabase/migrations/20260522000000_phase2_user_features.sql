-- Phase 2: bookmarks, alert preferences, provider submissions, digest support

-- Extend grants table
alter table public.grants
  add column if not exists source text default 'seed',
  add column if not exists contact_email text,
  add column if not exists additional_notes text,
  add column if not exists approved_at timestamptz;

-- Backfill approved_at for existing approved grants
update public.grants
set approved_at = coalesce(approved_at, created_at)
where status = 'approved' and approved_at is null;

-- Set approved_at when status changes to approved
create or replace function public.set_grant_approved_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' and (old.status is distinct from 'approved') then
    new.approved_at = coalesce(new.approved_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists grants_set_approved_at on public.grants;
create trigger grants_set_approved_at
  before update on public.grants
  for each row
  execute function public.set_grant_approved_at();

-- Profiles (optional, synced from auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Bookmarks
create table if not exists public.bookmarks (
  user_id uuid not null references auth.users on delete cascade,
  grant_id uuid not null references public.grants on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, grant_id)
);

create index if not exists bookmarks_user_id_idx on public.bookmarks (user_id);
create index if not exists bookmarks_grant_id_idx on public.bookmarks (grant_id);

alter table public.bookmarks enable row level security;

create policy "Users manage own bookmarks"
  on public.bookmarks for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Alert preferences for weekly digest
create table if not exists public.alert_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  enabled boolean not null default true,
  sectors text[] not null default '{}',
  regions text[] not null default '{}',
  last_digest_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alert_preferences enable row level security;

create policy "Users read own alert preferences"
  on public.alert_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users insert own alert preferences"
  on public.alert_preferences for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users update own alert preferences"
  on public.alert_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-create alert preferences on signup
create or replace function public.handle_new_user_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.alert_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_preferences on auth.users;
create trigger on_auth_user_created_preferences
  after insert on auth.users
  for each row
  execute function public.handle_new_user_preferences();
