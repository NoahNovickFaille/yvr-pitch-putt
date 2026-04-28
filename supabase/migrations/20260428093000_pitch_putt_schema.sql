create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  preferred_units text not null default 'strokes' check (preferred_units in ('strokes')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  city text not null,
  province text not null,
  hole_count int not null check (hole_count > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  hole_number int not null,
  par int not null check (par between 2 and 5),
  yardage int,
  asset_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (course_id, hole_number)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  notes text
);

create table if not exists public.round_players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  display_name text not null,
  sort_order int not null,
  is_owner boolean not null default false,
  unique (round_id, sort_order)
);

create table if not exists public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.round_players(id) on delete cascade,
  hole_id uuid not null references public.holes(id),
  strokes int not null check (strokes between 1 and 15),
  recorded_at timestamptz not null default timezone('utc', now()),
  unique (player_id, hole_id)
);

create index if not exists idx_rounds_owner_id on public.rounds(owner_id);
create index if not exists idx_round_players_round_id on public.round_players(round_id);
create index if not exists idx_hole_scores_round_id on public.hole_scores(round_id);
create index if not exists idx_holes_course_hole on public.holes(course_id, hole_number);

create or replace function public.handle_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_profile_updated on public.profiles;
create trigger on_profile_updated
before update on public.profiles
for each row
execute function public.handle_profile_updated_at();

create or replace function public.handle_user_created_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_user_created_profile();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.holes enable row level security;
alter table public.rounds enable row level security;
alter table public.round_players enable row level security;
alter table public.hole_scores enable row level security;

-- Public read for static metadata.
drop policy if exists "Courses are readable by authenticated users" on public.courses;
create policy "Courses are readable by authenticated users"
on public.courses
for select
to authenticated
using (true);

drop policy if exists "Holes are readable by authenticated users" on public.holes;
create policy "Holes are readable by authenticated users"
on public.holes
for select
to authenticated
using (true);

-- Profile self access.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Round ownership.
drop policy if exists "Users can CRUD their rounds" on public.rounds;
create policy "Users can CRUD their rounds"
on public.rounds
for all
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

-- Round player access through owned round.
drop policy if exists "Users can CRUD round players for owned rounds" on public.round_players;
create policy "Users can CRUD round players for owned rounds"
on public.round_players
for all
to authenticated
using (
  exists (
    select 1 from public.rounds r
    where r.id = round_players.round_id and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.rounds r
    where r.id = round_players.round_id and r.owner_id = auth.uid()
  )
);

-- Hole score access through owned round.
drop policy if exists "Users can CRUD hole scores for owned rounds" on public.hole_scores;
create policy "Users can CRUD hole scores for owned rounds"
on public.hole_scores
for all
to authenticated
using (
  exists (
    select 1 from public.rounds r
    where r.id = hole_scores.round_id and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.rounds r
    where r.id = hole_scores.round_id and r.owner_id = auth.uid()
  )
);
