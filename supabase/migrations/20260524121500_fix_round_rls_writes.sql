-- hole_scores / round_players INSERT policies subquery rounds, which re-evaluates
-- participant SELECT policies (is_round_visible) and can recurse on "rounds".
-- Use security-definer helpers with row_security disabled for ownership checks.

create or replace function public.is_round_owned_by_auth(p_round_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.rounds r
    where r.id = p_round_id
      and r.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_round_owned_by_auth(uuid) from public;
grant execute on function public.is_round_owned_by_auth(uuid) to authenticated;

create or replace function public.is_round_visible(p_round_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select public.is_round_owned_by_auth(p_round_id)
  or exists (
    select 1
    from public.round_players rp
    where rp.round_id = p_round_id
      and rp.user_id = auth.uid()
  );
$$;

drop policy if exists "Users can CRUD round players for owned rounds" on public.round_players;
create policy "Users can CRUD round players for owned rounds"
on public.round_players
for all
to authenticated
using (public.is_round_owned_by_auth(round_id))
with check (public.is_round_owned_by_auth(round_id));

drop policy if exists "Users can CRUD hole scores for owned rounds" on public.hole_scores;
create policy "Users can CRUD hole scores for owned rounds"
on public.hole_scores
for all
to authenticated
using (public.is_round_owned_by_auth(round_id))
with check (public.is_round_owned_by_auth(round_id));

drop policy if exists "Owners can view share tokens for their rounds" on public.round_share_tokens;
create policy "Owners can view share tokens for their rounds"
on public.round_share_tokens
for select
to authenticated
using (public.is_round_owned_by_auth(round_id));
