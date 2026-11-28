begin;

-- The existing opt-in boolean remains compatible with already saved profiles.
-- Only the account owner may read or change the additional restriction.
create table public.member_message_privacy (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  connections_only boolean not null
);
alter table public.member_message_privacy enable row level security;
revoke all on public.member_message_privacy from public, anon, authenticated;
grant select, insert, update (connections_only) on public.member_message_privacy to authenticated;
create policy message_privacy_read on public.member_message_privacy for select to authenticated
  using (user_id = (select auth.uid()));
create policy message_privacy_insert on public.member_message_privacy for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy message_privacy_update on public.member_message_privacy for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select (id, allow_direct_messages), update (allow_direct_messages)
  on public.profiles to authenticated;

create function public.set_message_audience_v1(audience text)
returns text language plpgsql security invoker set search_path='' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if audience is null or audience not in ('off', 'circles', 'connections') then
    raise exception 'Choose a valid message audience' using errcode='22023';
  end if;
  -- The profile row serializes concurrent saves. Both settings change in one transaction.
  update public.profiles set allow_direct_messages = audience <> 'off' where id=caller;
  if not found then raise exception 'Member profile unavailable' using errcode='42501'; end if;
  insert into public.member_message_privacy(user_id, connections_only)
    values (caller, audience='connections')
    on conflict (user_id) do update set connections_only=excluded.connections_only;
  return audience;
end;
$$;
revoke all on function public.set_message_audience_v1(text) from public, anon;
grant execute on function public.set_message_audience_v1(text) to authenticated;

-- Keep this existing RLS predicate scoped to the caller. Neither connection
-- status nor the recipient's preference row is returned to a potential sender.
create or replace function public.can_send_dm(recipient uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and auth.uid() <> recipient
    and exists(select 1 from public.profiles p where p.id=recipient and p.allow_direct_messages)
    and exists(select 1 from public.memberships a
      join public.memberships b on b.community_id=a.community_id
      where a.user_id=auth.uid() and b.user_id=recipient)
    and not public.dm_block_exists(auth.uid(),recipient)
    and (
      not exists(select 1 from public.member_message_privacy m
                 where m.user_id=recipient and m.connections_only)
      or exists(select 1 from public.member_connections c
                where c.status='accepted'
                  and least(c.requester_id,c.recipient_id)=least(auth.uid(),recipient)
                  and greatest(c.requester_id,c.recipient_id)=greatest(auth.uid(),recipient))
    );
$$;

create function public.available_message_recipients_v1(candidate_ids uuid[])
returns setof uuid language sql stable security invoker set search_path='' as $$
  select distinct candidate
  from unnest(candidate_ids[1:100]) as candidates(candidate)
  where public.can_send_dm(candidate);
$$;
revoke all on function public.available_message_recipients_v1(uuid[]) from public, anon;
grant execute on function public.available_message_recipients_v1(uuid[]) to authenticated;

commit;
