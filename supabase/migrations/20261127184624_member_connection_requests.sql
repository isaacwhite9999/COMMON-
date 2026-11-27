begin;

create table public.member_connections (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  primary key (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

-- One bilateral relationship per pair, including concurrent crossed requests.
create unique index member_connections_pair_idx on public.member_connections (
  least(requester_id, recipient_id), greatest(requester_id, recipient_id)
);
create index member_connections_outgoing_idx on public.member_connections (requester_id, status, recipient_id);
create index member_connections_incoming_idx on public.member_connections (recipient_id, status, requester_id);

alter table public.member_connections enable row level security;
revoke all on public.member_connections from public, anon, authenticated;
grant select, insert, delete, update (status) on public.member_connections to authenticated;

create policy member_connections_read on public.member_connections
  for select to authenticated
  using (
    (select auth.uid()) in (requester_id, recipient_id)
    and not public.dm_block_exists(requester_id, recipient_id)
  );
create policy member_connections_request on public.member_connections
  for insert to authenticated
  with check (
    (select auth.uid()) = requester_id and status = 'pending'
    and not public.dm_block_exists(requester_id, recipient_id)
  );
create policy member_connections_accept on public.member_connections
  for update to authenticated
  using (
    (select auth.uid()) = recipient_id and status = 'pending'
    and not public.dm_block_exists(requester_id, recipient_id)
  )
  with check (
    (select auth.uid()) = recipient_id and status = 'accepted'
    and not public.dm_block_exists(requester_id, recipient_id)
  );
create policy member_connections_remove on public.member_connections
  for delete to authenticated
  using (
    (select auth.uid()) in (requester_id, recipient_id)
    and not public.dm_block_exists(requester_id, recipient_id)
  );

create function public.request_member_connection_v1(peer_id uuid)
returns void language sql security invoker set search_path='' as $$
  insert into public.member_connections (requester_id, recipient_id)
  values ((select auth.uid()), peer_id)
  on conflict do nothing;
$$;

create function public.respond_member_connection_v1(peer_id uuid, decision text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  case decision
    when 'accept' then
      update public.member_connections
      set status='accepted'
      where requester_id=peer_id and recipient_id=viewer and status='pending';
    when 'decline' then
      delete from public.member_connections
      where requester_id=peer_id and recipient_id=viewer and status='pending';
    when 'withdraw' then
      delete from public.member_connections
      where requester_id=viewer and recipient_id=peer_id and status='pending';
    when 'remove' then
      delete from public.member_connections
      where ((requester_id=viewer and recipient_id=peer_id)
          or (requester_id=peer_id and recipient_id=viewer)) and status='accepted';
    else
      raise exception 'Invalid connection action' using errcode = '22023';
  end case;
  return found;
end;
$$;

create function public.member_connection_state_v1(peer_id uuid)
returns text language sql stable security invoker set search_path='' as $$
  select case when public.dm_block_exists((select auth.uid()), peer_id) then 'blocked'
              else coalesce((
                select case
                  when c.status='accepted' then 'accepted'
                  when c.requester_id=(select auth.uid()) then 'outgoing'
                  else 'incoming'
                end
                from public.member_connections c
                where least(c.requester_id, c.recipient_id)=least((select auth.uid()), peer_id)
                  and greatest(c.requester_id, c.recipient_id)=greatest((select auth.uid()), peer_id)
              ), 'available')
         end;
$$;

create function public.member_connection_page_v1(
  connection_scope text, after_id uuid default null, page_size integer default 25
)
returns table(id uuid, display_name text, handle text)
language plpgsql stable security invoker
set search_path='' set plan_cache_mode=force_custom_plan as $$
declare
  viewer uuid := auth.uid();
  wanted_status text := case when connection_scope='accepted' then 'accepted' else 'pending' end;
begin
  if viewer is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if connection_scope is null or connection_scope not in ('incoming','outgoing','accepted')
     or page_size is null or page_size < 1 or page_size > 50 then
    raise exception 'Invalid connection scope or page size' using errcode = '22023';
  end if;
  return query
    with peers as (
      (select c.requester_id as peer_id from public.member_connections c
       where connection_scope in ('incoming','accepted') and c.recipient_id=viewer
         and c.status=wanted_status and (after_id is null or c.requester_id > after_id)
       order by c.requester_id limit page_size)
      union all
      (select c.recipient_id from public.member_connections c
       where connection_scope in ('outgoing','accepted') and c.requester_id=viewer
         and c.status=wanted_status and (after_id is null or c.recipient_id > after_id)
       order by c.recipient_id limit page_size)
    )
    select p.id, p.display_name, p.handle from peers
    join public.profiles p on p.id=peers.peer_id
    order by peers.peer_id limit page_size;
end;
$$;

revoke all on function public.request_member_connection_v1(uuid),
  public.respond_member_connection_v1(uuid,text), public.member_connection_state_v1(uuid),
  public.member_connection_page_v1(text,uuid,integer) from public, anon, authenticated;
grant execute on function public.request_member_connection_v1(uuid),
  public.respond_member_connection_v1(uuid,text), public.member_connection_state_v1(uuid),
  public.member_connection_page_v1(text,uuid,integer) to authenticated;

commit;
