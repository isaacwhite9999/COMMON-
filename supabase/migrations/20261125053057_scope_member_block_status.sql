begin;

-- Participant scope is required for direct calls and all current visibility policies.
create or replace function public.dm_block_exists(sender uuid, recipient uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select coalesce((select auth.uid()) in (sender, recipient), false)
    and exists (
      select 1 from public.member_blocks b
      where (b.blocker_id=sender and b.blocked_id=recipient)
         or (b.blocker_id=recipient and b.blocked_id=sender)
    );
$$;
revoke all on function public.dm_block_exists(uuid,uuid) from public,anon,authenticated;
grant execute on function public.dm_block_exists(uuid,uuid) to authenticated;

commit;
