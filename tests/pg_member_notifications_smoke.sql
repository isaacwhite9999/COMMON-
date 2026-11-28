-- SOCIAL-098 and in-app notification preferences. Fixtures roll back.
begin;
grant usage on schema public, auth to authenticated, anon;
grant select on public.profiles, public.direct_messages to authenticated;
grant insert on public.direct_messages, public.member_blocks to authenticated;
grant delete on public.member_blocks to authenticated;

insert into auth.users(id,email,raw_user_meta_data) values
 ('85300001-0000-4000-8000-000000000001','notices-a@example.test','{"display_name":"Notice Alice"}'),
 ('85300002-0000-4000-8000-000000000002','notices-b@example.test','{"display_name":"Notice Bob"}'),
 ('85300003-0000-4000-8000-000000000003','notices-c@example.test','{"display_name":"Notice Carol"}');
update public.profiles set allow_direct_messages=true where id in
 ('85300001-0000-4000-8000-000000000001','85300002-0000-4000-8000-000000000002','85300003-0000-4000-8000-000000000003');
insert into public.communities(id,slug,name,category,visibility,created_by) values
 ('85301000-0000-4000-8000-000000000001','notice-circle','Notice circle','markets','private','85300001-0000-4000-8000-000000000001');
insert into public.memberships(community_id,user_id) values
 ('85301000-0000-4000-8000-000000000001','85300002-0000-4000-8000-000000000002'),
 ('85301000-0000-4000-8000-000000000001','85300003-0000-4000-8000-000000000003');

set local role anon;
do $$
begin
  perform public.member_notification_page_v1('all');
  raise exception 'Signed-out member opened private inbox';
exception when insufficient_privilege then null;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','85300001-0000-4000-8000-000000000001',true);
insert into public.direct_messages(id,sender_id,recipient_id,body,created_at) values
 ('85302000-0000-4000-8000-000000000001',auth.uid(),'85300002-0000-4000-8000-000000000002','Private source text','2024-07-01T09:00Z'),
 ('85302000-0000-4000-8000-000000000002',auth.uid(),'85300002-0000-4000-8000-000000000002','Buy this memecoin immediately and make 100x returns','2024-07-01T09:01Z');
select public.request_member_connection_v1('85300002-0000-4000-8000-000000000002');
do $$
begin
  if public.member_notification_page_v1('all')->'items'<>'[]'::jsonb then
    raise exception 'Actor saw recipient notifications';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85300002-0000-4000-8000-000000000002',true);
do $$
declare
  page jsonb := public.member_notification_page_v1('all',page_size=>1);
  next_page jsonb;
  dm_notice uuid;
begin
  next_page:=public.member_notification_page_v1('all',
    before_time=>(page #>> '{next,before_time}')::timestamptz,
    before_id=>(page #>> '{next,before_id}')::uuid,page_size=>1);
  if page->'unread'<>'2'::jsonb or next_page->'next'<>'null'::jsonb
     or page #>> '{items,0,id}' = next_page #>> '{items,0,id}'
     or (page #>> '{items,0,kind}' = next_page #>> '{items,0,kind}')
     or page::text like '%Private source text%' or next_page::text like '%Private source text%'
     or (page #>> '{items,0,actor_name}') is distinct from 'Notice Alice' then
    raise exception 'Cursor, unread count, moderation visibility or data minimization failed: %, %',page,next_page;
  end if;
  select id into dm_notice from public.member_notifications where kind='direct_message';
  update public.member_notifications set is_read=true where id=dm_notice;
  if public.member_notification_page_v1('unread')->'unread'<>'1'::jsonb then
    raise exception 'Mark read did not update unread count';
  end if;
  update public.member_notifications set is_archived=true where id=dm_notice;
  if jsonb_array_length(public.member_notification_page_v1('archived')->'items')<>1
     or jsonb_array_length(public.member_notification_page_v1('all')->'items')<>1 then
    raise exception 'Archive did not move the notification out of the inbox';
  end if;
  update public.member_notifications set is_archived=false where id=dm_notice;
  if jsonb_array_length(public.member_notification_page_v1('all')->'items')<>2 then
    raise exception 'Restore did not return the notification';
  end if;
  if not public.respond_member_connection_v1('85300001-0000-4000-8000-000000000001','accept') then
    raise exception 'Could not respond to fixture request';
  end if;
  if public.member_notification_page_v1('all')->'unread'<>'0'::jsonb then
    raise exception 'Accepted request remains actionable';
  end if;
  perform public.set_member_notification_preferences_v1(false,false);
  perform public.set_member_notification_preferences_v1(false,true);
  if (select direct_messages or not connections from public.member_notification_preferences) then
    raise exception 'Preference persistence failed';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85300003-0000-4000-8000-000000000003',true);
insert into public.direct_messages(id,sender_id,recipient_id,body,created_at) values
 ('85302000-0000-4000-8000-000000000003',auth.uid(),'85300002-0000-4000-8000-000000000002','Do not notify','2024-07-01T09:02Z');
do $$
begin
  update public.member_notifications set is_read=true;
  if found or exists(select 1 from public.member_notification_preferences)
     or public.member_notification_page_v1('all')->'items'<>'[]'::jsonb then
    raise exception 'Unrelated member accessed another account';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85300001-0000-4000-8000-000000000001',true);
do $$
begin
  if (public.member_notification_page_v1('all') #>> '{items,0,kind}') is distinct from 'connection_accepted' then
    raise exception 'Requester did not receive acceptance event';
  end if;
  if not public.delete_chat_message_v1('direct','85302000-0000-4000-8000-000000000001') then
    raise exception 'Could not delete fixture message';
  end if;
end;
$$;
insert into public.member_blocks(blocker_id,blocked_id)
values (auth.uid(),'85300002-0000-4000-8000-000000000002');
do $$
begin
  if public.member_notification_page_v1('all')->'items'<>'[]'::jsonb then
    raise exception 'Block did not revoke access to connection notification';
  end if;
end;
$$;
select set_config('request.jwt.claim.sub','85300002-0000-4000-8000-000000000002',true);
do $$
begin
  if public.member_notification_page_v1('all')->'items'<>'[]'::jsonb then
    raise exception 'Deleted, blocked, moderated or suppressed event remains visible';
  end if;
end;
$$;
rollback;
