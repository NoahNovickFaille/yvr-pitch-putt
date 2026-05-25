create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.round_share_tokens
    set claimed_at = null, claimed_by_user_id = null
    where claimed_by_user_id = v_user_id;

  delete from public.round_share_tokens where created_by = v_user_id;
  delete from public.hole_scores where round_id in (
    select id from public.rounds where owner_id = v_user_id
  );
  delete from public.round_players where round_id in (
    select id from public.rounds where owner_id = v_user_id
  );
  delete from public.rounds where owner_id = v_user_id;

  update public.round_players set user_id = null where user_id = v_user_id;

  delete from public.profiles where id = v_user_id;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
