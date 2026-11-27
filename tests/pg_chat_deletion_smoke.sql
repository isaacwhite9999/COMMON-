-- SOCIAL-092. All test fixture changes roll back.
begin;
grant usage on schema public, auth to authenticated, anon;
grant select on public.community_messages, public.direct_messages to authenticated;

insert into auth.users(id,email,raw_user_meta_data) values
 ('85200001-0000-4000-8000-000000000001','chat-owner@example.test','{"display_name":"Chat owner"}'),
 ('85200002-0000-4000-8000-000000000002','chat-author@example.test','{"display_name":"Chat author"}'),
 ('85200003-0000-4000-8000-000000000003','chat-reader@example.test','{"display_name":"Chat reader"}'),
 ('85200004-0000-4000-8000-000000000004','chat-former@example.test','{"display_name":"Chat former member"}');
insert into public.communities(id,slug,name,category,visibility,created_by) values
 ('85201000-0000-4000-8000-000000000001','private-chat-fixture','Private chat fixture','markets','private','85200001-0000-4000-8000-000000000001');
insert into public.memberships(community_id,user_id) values
 ('85201000-0000-4000-8000-000000000001','85200002-0000-4000-8000-000000000002'),
 ('85201000-0000-4000-8000-000000000001','85200003-0000-4000-8000-000000000003');
update public.profiles set allow_direct_messages=true
where id in ('85200002-0000-4000-8000-000000000002','85200003-0000-4000-8000-000000000003');
insert into public.direct_messages(id,sender_id,recipient_id,body) values
 ('85202000-0000-4000-8000-000000000001','85200002-0000-4000-8000-000000000002','85200003-0000-4000-8000-000000000003','Direct fixture message');
insert into public.community_messages(id,community_id,author_id,body,created_at) values
 ('85203000-0000-4000-8000-000000000001','85201000-0000-4000-8000-000000000001','85200002-0000-4000-8000-000000000002','Circle author fixture','2024-07-01T09:31Z'),
 ('85203000-0000-4000-8000-000000000002','85201000-0000-4000-8000-000000000001','85200002-0000-4000-8000-000000000002','Circle moderator fixture','2024-07-01T09:32Z'),
 ('85203000-0000-4000-8000-000000000003','85201000-0000-4000-8000-000000000001','85200004-0000-4000-8000-000000000004','Former member fixture','2024-07-01T09:33Z');

set local role anon;
do $$
begin
  perform public.delete_chat_message_v1('direct','85202000-0000-4000-8000-000000000001');
  raise exception 'Signed-out deletion was allowed';
exception when insufficient_privilege then null;
end;
$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','85200003-0000-4000-8000-000000000003',true);
do $$
declare
  dm constant uuid := '85202000-0000-4000-8000-000000000001';
  group_message constant uuid := '85203000-0000-4000-8000-000000000001';
begin
  if not exists(select 1 from public.direct_messages where id=dm)
     or not exists(select 1 from public.community_messages where id=group_message) then
    raise exception 'Reader cannot see existing messages';
  end if;
  if public.delete_chat_message_v1('direct',dm) or public.delete_chat_message_v1('circle',group_message) then
    raise exception 'Reader deleted another member''s message';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85200004-0000-4000-8000-000000000004',true);
do $$
begin
  if public.delete_chat_message_v1('circle','85203000-0000-4000-8000-000000000003')
     or public.delete_chat_message_v1('direct','85202000-0000-4000-8000-000000000001') then
    raise exception 'Former member deleted private chat content';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85200002-0000-4000-8000-000000000002',true);
do $$
declare
  dm constant uuid := '85202000-0000-4000-8000-000000000001';
  group_message constant uuid := '85203000-0000-4000-8000-000000000001';
begin
  begin
    update public.community_messages set deleted_at=now() where id=group_message;
    raise exception 'Authors can change deletion metadata outside the scoped API';
  exception when insufficient_privilege then null;
  end;
  if not public.delete_chat_message_v1('direct',dm) or not public.delete_chat_message_v1('circle',group_message) then
    raise exception 'Author could not delete their own messages';
  end if;
  if public.delete_chat_message_v1('direct',dm) or public.delete_chat_message_v1('circle',group_message) then
    raise exception 'Repeat deletion changed the tombstone';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85200001-0000-4000-8000-000000000001',true);
do $$
begin
  if not public.delete_chat_message_v1('circle','85203000-0000-4000-8000-000000000002') then
    raise exception 'Circle moderator could not delete circle content';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85200003-0000-4000-8000-000000000003',true);
do $$
begin
  if exists(select 1 from public.direct_messages where id='85202000-0000-4000-8000-000000000001')
     or exists(select 1 from public.community_messages where id in
         ('85203000-0000-4000-8000-000000000001','85203000-0000-4000-8000-000000000002')) then
    raise exception 'Reader still sees deleted messages';
  end if;
end;
$$;

reset role;
do $$
begin
  if not exists(select 1 from public.direct_messages
    where id='85202000-0000-4000-8000-000000000001' and deleted_at is not null
      and deleted_by='85200002-0000-4000-8000-000000000002' and body='Direct fixture message')
    or not exists(select 1 from public.community_messages
    where id='85203000-0000-4000-8000-000000000002' and deleted_at is not null
      and deleted_by='85200001-0000-4000-8000-000000000001' and body='Circle moderator fixture') then
    raise exception 'Authorized tombstone lost deletion attribution or modified the original';
  end if;
end;
$$;
rollback;
