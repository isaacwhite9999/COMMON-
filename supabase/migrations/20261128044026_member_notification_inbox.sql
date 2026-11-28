begin;

-- A request lifecycle needs a stable key so a removed connection cannot
-- resurrect a notification if the same pair reconnects.
alter table public.member_connections add column id uuid not null default gen_random_uuid() unique;

create table public.member_notification_preferences (
  member_id uuid primary key references public.profiles(id) on delete cascade,
  direct_messages boolean not null default true,
  connections boolean not null default true
);
alter table public.member_notification_preferences enable row level security;
revoke all on public.member_notification_preferences from public, anon, authenticated;
grant select, insert, update (direct_messages, connections) on public.member_notification_preferences to authenticated;
create policy member_controls_notification_preferences on public.member_notification_preferences
  for all to authenticated using (member_id=(select auth.uid())) with check (member_id=(select auth.uid()));

create table public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('direct_message','connection_request','connection_accepted')),
  message_id uuid references public.direct_messages(id) on delete cascade,
  connection_id uuid references public.member_connections(id) on delete cascade,
  created_at timestamptz not null default now(),
  is_read boolean not null default false,
  is_archived boolean not null default false,
  check (recipient_id <> actor_id),
  check ((kind='direct_message')=(message_id is not null) and (kind<>'direct_message')=(connection_id is not null))
);
create index member_notification_inbox_idx on public.member_notifications
  (recipient_id, is_archived, created_at desc, id desc);
create index member_notification_unread_idx on public.member_notifications
  (recipient_id, created_at desc, id desc) where not is_read and not is_archived;
create unique index member_notification_message_idx on public.member_notifications(message_id) where message_id is not null;
create unique index member_notification_connection_idx on public.member_notifications(connection_id, kind) where connection_id is not null;

alter table public.member_notifications enable row level security;
revoke all on public.member_notifications from public, anon, authenticated;
grant select, update (is_read,is_archived) on public.member_notifications to authenticated;

-- Reference checks honor the caller's current RLS on the source. The inbox
-- never contains a message body and cannot expose an unavailable source.
create policy member_can_read_own_visible_notifications on public.member_notifications
  for select to authenticated using (
    recipient_id=(select auth.uid())
    and ((kind='direct_message' and exists (
      select 1 from public.direct_messages d where d.id=message_id
    )) or (kind in ('connection_request','connection_accepted') and exists (
      select 1 from public.member_connections c where c.id=connection_id
        and c.status=case when kind='connection_request' then 'pending' else 'accepted' end
    )))
  );
create policy member_can_organize_own_notifications on public.member_notifications
  for update to authenticated using (recipient_id=(select auth.uid()))
  with check (recipient_id=(select auth.uid()));

create function private.enqueue_member_notification(
  member uuid, sender uuid, event_kind text, message uuid, connection uuid
)
returns void language sql security invoker set search_path='' as $$
  insert into public.member_notifications(recipient_id,actor_id,kind,message_id,connection_id)
  select member,sender,event_kind,message,connection
  where coalesce((
    select case when event_kind='direct_message' then p.direct_messages else p.connections end
    from public.member_notification_preferences p where p.member_id=member
  ),true)
  on conflict do nothing;
$$;

create function private.notify_member_direct_message()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.enqueue_member_notification(new.recipient_id,new.sender_id,'direct_message',new.id,null);
  return new;
end;
$$;

create function private.notify_member_connection()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    perform private.enqueue_member_notification(new.recipient_id,new.requester_id,'connection_request',null,new.id);
  elsif old.status='pending' and new.status='accepted' then
    perform private.enqueue_member_notification(new.requester_id,new.recipient_id,'connection_accepted',null,new.id);
  end if;
  return new;
end;
$$;

revoke all on function private.enqueue_member_notification(uuid,uuid,text,uuid,uuid),
  private.notify_member_direct_message(), private.notify_member_connection() from public, anon, authenticated;

create trigger member_notify_direct_message after insert on public.direct_messages
  for each row execute function private.notify_member_direct_message();
create trigger member_notify_connection after insert or update of status on public.member_connections
  for each row execute function private.notify_member_connection();

create function public.member_notification_page_v1(
  inbox_scope text, before_time timestamptz default null, before_id uuid default null,
  page_size integer default 25
)
returns jsonb language plpgsql stable security invoker
set search_path='' set plan_cache_mode=force_custom_plan as $$
declare
  viewer uuid := auth.uid();
  result jsonb;
begin
  if viewer is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if inbox_scope is null or inbox_scope not in ('all','unread','archived')
     or (before_time is null)<>(before_id is null)
     or (before_time is not null and not isfinite(before_time))
     or page_size is null or page_size < 1 or page_size > 50 then
    raise exception 'Invalid notification scope, cursor or page size' using errcode='22023';
  end if;
  with candidates as materialized (
    select n.id,n.kind,n.actor_id,n.created_at,n.is_read,n.is_archived
    from public.member_notifications n where n.recipient_id=viewer
      and n.is_archived=(inbox_scope='archived')
      and (inbox_scope<>'unread' or not n.is_read)
      and (before_time is null or (n.created_at,n.id)<(before_time,before_id))
    order by n.created_at desc,n.id desc limit page_size+1
  ), page_items as (
    select * from candidates order by created_at desc,id desc limit page_size
  )
  select jsonb_build_object(
    'items',coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('actor_name',p.display_name)
      order by i.created_at desc,i.id desc),'[]'::jsonb),
    'next',case when (select count(*) from candidates)>page_size then (
      select jsonb_build_object('before_time',last.created_at,'before_id',last.id)
      from page_items last order by last.created_at,last.id limit 1
    ) end,
    'unread', (select count(*) from (
      select 1 from public.member_notifications n
      where n.recipient_id=viewer and not n.is_read and not n.is_archived
      limit 100
    ) unread)
  ) into result
  from page_items i join public.profiles p on p.id=i.actor_id;
  return result;
end;
$$;

create function public.set_member_notification_preferences_v1(show_messages boolean, show_connections boolean)
returns void language sql security invoker set search_path='' as $$
  insert into public.member_notification_preferences(member_id,direct_messages,connections)
  values ((select auth.uid()),show_messages,show_connections)
  on conflict (member_id) do update
  set direct_messages=excluded.direct_messages,connections=excluded.connections;
$$;

revoke all on function public.set_member_notification_preferences_v1(boolean,boolean) from public, anon, authenticated;
grant execute on function public.set_member_notification_preferences_v1(boolean,boolean) to authenticated;
revoke all on function public.member_notification_page_v1(text,timestamptz,uuid,integer) from public, anon, authenticated;
grant execute on function public.member_notification_page_v1(text,timestamptz,uuid,integer) to authenticated;

commit;
