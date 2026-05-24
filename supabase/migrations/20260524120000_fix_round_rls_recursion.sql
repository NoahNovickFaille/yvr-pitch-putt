-- Break RLS cycles between rounds <-> round_players introduced by participant policies.
-- Policies that subquery each other cause: infinite recursion detected in policy for relation.

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
drop policy if exists "Participants can view players on joined rounds" on public.round_players;
drop policy if exists "Participants can view scores on joined rounds" on public.hole_scores;

create policy "Participants can view rounds they joined"
on public.rounds
for select
to authenticated
using (public.is_round_visible(id));

create policy "Participants can view players on joined rounds"
on public.round_players
for select
to authenticated
using (public.is_round_visible(round_id));

create policy "Participants can view scores on joined rounds"
on public.hole_scores
for select
to authenticated
using (public.is_round_visible(round_id));
