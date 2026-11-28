-- SOCIAL-180 / PLATFORM-012. Isolated identity and circle fixtures.
begin;
grant usage on schema public, auth to authenticated, anon;
grant select, insert on public.direct_messages to authenticated;
insert into auth.users(id,email) values
 ('85240001-0000-4000-8000-000000000001','privacy-recipient@example.test'),
 ('85240011-0000-4000-8000-000000000002','privacy-sender@example.test'),
 ('85240012-0000-4000-8000-000000000003','privacy-outsider@example.test');
insert into public.communities(id,slug,name,category,visibility,created_by) values
 ('85240002-0000-4000-8000-000000000001','privacy-fixture','Privacy fixture','markets','private','85240001-0000-4000-8000-000000000001');
insert into public.memberships(community_id,user_id) values
 ('85240002-0000-4000-8000-000000000001','85240011-0000-4000-8000-000000000002');

set local role anon;
do $$
begin
 perform public.set_message_audience_v1('circles');
 raise exception 'Signed-out settings write was permitted';
exception when insufficient_privilege then null;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','85240011-0000-4000-8000-000000000002',true);
do $$
begin
 if public.can_send_dm('85240001-0000-4000-8000-000000000001') then
  raise exception 'New profiles did not default to direct messages off';
 end if;
end $$;
reset role;
-- A member who opted in before the migration retains shared-circle behavior.
update public.profiles set allow_direct_messages=true where id='85240001-0000-4000-8000-000000000001';
set local role authenticated;
do $$
begin
 if not public.can_send_dm('85240001-0000-4000-8000-000000000001') then
  raise exception 'Existing shared-circle consent was lost';
 end if;
end $$;
select set_config('request.jwt.claim.sub','85240001-0000-4000-8000-000000000001',true);
select public.set_message_audience_v1('connections');
do $$
begin
 if not exists(select 1 from public.member_message_privacy where connections_only) then
  raise exception 'Account could not read its saved preference';
 end if;
 begin
  perform public.set_message_audience_v1('everyone');
  raise exception 'Invalid audience accepted';
 exception when invalid_parameter_value then null;
 end;
end $$;
reset role;
insert into public.member_connections(requester_id,recipient_id,status) values
 ('85240011-0000-4000-8000-000000000002','85240001-0000-4000-8000-000000000001','pending'),
 ('85240012-0000-4000-8000-000000000003','85240001-0000-4000-8000-000000000001','accepted');

set local role authenticated;
select set_config('request.jwt.claim.sub','85240011-0000-4000-8000-000000000002',true);
do $$
declare recipient constant uuid := '85240001-0000-4000-8000-000000000001';
begin
 if exists (select 1 from public.member_message_privacy where user_id=recipient) then
  raise exception 'Recipient preference disclosed to another account';
 end if;
 begin
  insert into public.member_message_privacy(user_id,connections_only) values (recipient,false)
    on conflict (user_id) do update set connections_only=excluded.connections_only;
  raise exception 'Overwrote another member preference';
 exception when insufficient_privilege then null;
 end;
 if exists(select 1 from public.available_message_recipients_v1(array[recipient])) then
  raise exception 'Pending connection qualified as a recipient';
 end if;
 begin
  insert into public.direct_messages(sender_id,recipient_id,body) values(auth.uid(),recipient,'Pending connection');
  raise exception 'DM RLS allowed a pending connection to send';
 exception when insufficient_privilege then null;
 end;
end $$;

select set_config('request.jwt.claim.sub','85240012-0000-4000-8000-000000000003',true);
do $$
begin
 if public.can_send_dm('85240001-0000-4000-8000-000000000001') then
  raise exception 'An accepted connection bypassed shared-circle requirements';
 end if;
end $$;
reset role;
update public.member_connections set status='accepted' where requester_id='85240011-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub','85240011-0000-4000-8000-000000000002',true);
do $$
declare recipient constant uuid := '85240001-0000-4000-8000-000000000001';
begin
 if (select count(*) from public.available_message_recipients_v1(array[recipient,recipient]))<>1 then
  raise exception 'Available-recipient lookup failed to identify an accepted connection';
 end if;
 insert into public.direct_messages(sender_id,recipient_id,body) values(auth.uid(),recipient,'Authorized fixture message');
end $$;

select set_config('request.jwt.claim.sub','85240001-0000-4000-8000-000000000001',true);
select public.set_message_audience_v1('off');
select set_config('request.jwt.claim.sub','85240011-0000-4000-8000-000000000002',true);
do $$
declare recipient constant uuid := '85240001-0000-4000-8000-000000000001';
begin
 if public.can_send_dm(recipient) or not exists (
   select 1 from public.direct_messages where recipient_id=recipient and body='Authorized fixture message'
 ) then raise exception 'Opting out did not correctly preserve authorized history and revoke new messages'; end if;
end $$;
select set_config('request.jwt.claim.sub','85240001-0000-4000-8000-000000000001',true);
select public.set_message_audience_v1('connections');
reset role;
delete from public.member_connections where requester_id='85240011-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','85240011-0000-4000-8000-000000000002',true);
do $$
begin
 if public.can_send_dm('85240001-0000-4000-8000-000000000001') then
  raise exception 'Removed connection kept permission to start new messages';
 end if;
end $$;
select set_config('request.jwt.claim.sub','85240001-0000-4000-8000-000000000001',true);
select public.set_message_audience_v1('circles');
reset role;
insert into public.member_blocks(blocker_id,blocked_id) values
 ('85240001-0000-4000-8000-000000000001','85240011-0000-4000-8000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub','85240011-0000-4000-8000-000000000002',true);
do $$
begin
 if public.can_send_dm('85240001-0000-4000-8000-000000000001') then
  raise exception 'Message preferences bypassed blocking';
 end if;
end $$;
reset role;
rollback;
select 'PASS message privacy: default, existing consent, private preference, invalid input, accepted connection, shared circle, block and opt-out history' as result;
