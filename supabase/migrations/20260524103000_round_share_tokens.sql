-- gen_random_bytes lives in pgcrypto (Supabase installs it in the extensions schema).
create extension if not exists pgcrypto with schema extensions;

-- Player slots can be linked to a real account after claiming a share link.
alter table public.round_players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_round_players_user_id on public.round_players(user_id);

create table if not exists public.round_share_tokens (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.round_players(id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '90 days'),
  claimed_at timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint round_share_tokens_claim_consistency check (
    (claimed_at is null and claimed_by_user_id is null)
    or (claimed_at is not null and claimed_by_user_id is not null)
  )
);

create index if not exists idx_round_share_tokens_round_id on public.round_share_tokens(round_id);
create index if not exists idx_round_share_tokens_player_id on public.round_share_tokens(player_id);

alter table public.round_share_tokens enable row level security;

-- Round owners manage share tokens for their rounds.
drop policy if exists "Owners can view share tokens for their rounds" on public.round_share_tokens;
create policy "Owners can view share tokens for their rounds"
on public.round_share_tokens
for select
to authenticated
using (
  exists (
    select 1 from public.rounds r
    where r.id = round_share_tokens.round_id and r.owner_id = auth.uid()
  )
);

-- Participant read access (see 20260524120000_fix_round_rls_recursion.sql on existing DBs).
create or replace function public.is_round_visible(p_round_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.rounds r
    where r.id = p_round_id
      and r.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.round_players rp
    where rp.round_id = p_round_id
      and rp.user_id = auth.uid()
  );
$$;

revoke all on function public.is_round_visible(uuid) from public;
grant execute on function public.is_round_visible(uuid) to authenticated;

drop policy if exists "Participants can view rounds they joined" on public.rounds;
create policy "Participants can view rounds they joined"
on public.rounds
for select
to authenticated
using (public.is_round_visible(id));

drop policy if exists "Participants can view players on joined rounds" on public.round_players;
create policy "Participants can view players on joined rounds"
on public.round_players
for select
to authenticated
using (public.is_round_visible(round_id));

drop policy if exists "Participants can view scores on joined rounds" on public.hole_scores;
create policy "Participants can view scores on joined rounds"
on public.hole_scores
for select
to authenticated
using (public.is_round_visible(round_id));

create or replace function public.create_round_share_token(p_round_id uuid, p_player_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_owner_id uuid;
  v_is_owner boolean;
  v_linked_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select r.owner_id
  into v_owner_id
  from public.rounds r
  where r.id = p_round_id;

  if v_owner_id is distinct from auth.uid() then
    raise exception 'Only the round owner can create share links';
  end if;

  select rp.is_owner, rp.user_id
  into v_is_owner, v_linked_user
  from public.round_players rp
  where rp.id = p_player_id and rp.round_id = p_round_id;

  if not found then
    raise exception 'Player not found on this round';
  end if;

  if v_is_owner then
    raise exception 'Cannot share the owner player slot';
  end if;

  if v_linked_user is not null then
    raise exception 'This player has already claimed their scorecard';
  end if;

  delete from public.round_share_tokens
  where round_id = p_round_id
    and player_id = p_player_id
    and claimed_at is null;

  insert into public.round_share_tokens (round_id, player_id, created_by)
  values (p_round_id, p_player_id, auth.uid())
  returning token into v_token;

  return v_token;
end;
$$;

create or replace function public.peek_round_share_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.round_share_tokens%rowtype;
  v_round public.rounds%rowtype;
  v_course_slug text;
  v_client_course_id text;
  v_players jsonb;
  v_hole_scores jsonb;
  v_status text;
  v_target_player jsonb;
begin
  select *
  into v_row
  from public.round_share_tokens
  where token = p_token;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_row.expires_at < timezone('utc', now()) then
    v_status := 'expired';
  elsif v_row.claimed_at is not null then
    v_status := 'claimed';
  else
    v_status := 'ready';
  end if;

  select r.*
  into v_round
  from public.rounds r
  where r.id = v_row.round_id;

  select c.slug
  into v_course_slug
  from public.courses c
  where c.id = v_round.course_id;

  select jsonb_agg(
    jsonb_build_object(
      'id', rp.id,
      'name', rp.display_name,
      'is_owner', rp.is_owner,
      'user_id', rp.user_id
    )
    order by rp.sort_order
  )
  into v_players
  from public.round_players rp
  where rp.round_id = v_row.round_id;

  select coalesce(
    jsonb_object_agg(scored.hole_number::text, scored.scores),
    '{}'::jsonb
  )
  into v_hole_scores
  from (
    select
      h.hole_number,
      jsonb_object_agg(hs.player_id::text, hs.strokes) as scores
    from public.hole_scores hs
    inner join public.holes h on h.id = hs.hole_id
    where hs.round_id = v_row.round_id
    group by h.hole_number
  ) scored;

  select jsonb_build_object(
    'id', rp.id,
    'name', rp.display_name,
    'is_owner', rp.is_owner
  )
  into v_target_player
  from public.round_players rp
  where rp.id = v_row.player_id;

  return jsonb_build_object(
    'status', v_status,
    'token', p_token,
    'expires_at', v_row.expires_at,
    'claimed_at', v_row.claimed_at,
    'round', jsonb_build_object(
      'id', v_round.id,
      'owner_id', v_round.owner_id,
      'course_slug', v_course_slug,
      'created_at', v_round.started_at,
      'completed_at', v_round.completed_at,
      'players', coalesce(v_players, '[]'::jsonb),
      'hole_scores', coalesce(v_hole_scores, '{}'::jsonb)
    ),
    'target_player', v_target_player
  );
end;
$$;

create or replace function public.claim_round_share_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.round_share_tokens%rowtype;
  v_existing_user uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_row
  from public.round_share_tokens
  where token = p_token
  for update;

  if not found then
    raise exception 'Invalid share link';
  end if;

  if v_row.expires_at < timezone('utc', now()) then
    raise exception 'This share link has expired';
  end if;

  if v_row.claimed_at is not null then
    if v_row.claimed_by_user_id = auth.uid() then
      return v_row.round_id;
    end if;
    raise exception 'This share link has already been claimed';
  end if;

  select rp.user_id
  into v_existing_user
  from public.round_players rp
  where rp.id = v_row.player_id
  for update;

  if v_existing_user is not null then
    raise exception 'This player slot has already been claimed';
  end if;

  update public.round_players
  set user_id = auth.uid()
  where id = v_row.player_id;

  update public.round_share_tokens
  set
    claimed_at = timezone('utc', now()),
    claimed_by_user_id = auth.uid()
  where id = v_row.id;

  return v_row.round_id;
end;
$$;

revoke all on function public.create_round_share_token(uuid, uuid) from public;
revoke all on function public.peek_round_share_token(text) from public;
revoke all on function public.claim_round_share_token(text) from public;

grant execute on function public.create_round_share_token(uuid, uuid) to authenticated;
grant execute on function public.peek_round_share_token(text) to anon, authenticated;
grant execute on function public.claim_round_share_token(text) to authenticated;
