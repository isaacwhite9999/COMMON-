-- SOCIAL-020, SOCIAL-021. Synthetic accounts only, rolled back.
begin;
grant usage on schema public, auth to authenticated, anon;
grant select on public.profiles to authenticated;
grant insert on public.member_blocks to authenticated;

insert into auth.users(id,email,raw_user_meta_data) values
 ('85100001-0000-4000-8000-000000000001','connection-one@example.test','{"display_name":"Connection one"}'),
 ('85100002-0000-4000-8000-000000000002','connection-two@example.test','{"display_name":"Connection two"}'),
 ('85100003-0000-4000-8000-000000000003','connection-three@example.test','{"display_name":"Connection three"}');

set local role anon;
do $$
begin
  perform public.request_member_connection_v1('85100002-0000-4000-8000-000000000002');
  raise exception 'Signed-out request succeeded';
exception when insufficient_privilege then null;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','85100001-0000-4000-8000-000000000001',true);
do $$
declare
  peer constant uuid := '85100002-0000-4000-8000-000000000002';
begin
  begin
    insert into public.member_connections values (auth.uid(),peer,'accepted');
    raise exception 'Request created as already accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.member_connections values (peer,auth.uid(),'pending');
    raise exception 'Forged requester accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.request_member_connection_v1(auth.uid());
    raise exception 'Self-request accepted';
  exception when check_violation then null;
  end;
  perform public.request_member_connection_v1(peer);
  perform public.request_member_connection_v1(peer);
  if public.respond_member_connection_v1(peer,'accept')
     or public.respond_member_connection_v1(peer,'decline') then
    raise exception 'Requester accepted or declined their own request';
  end if;
  if (select array_agg(id) from public.member_connection_page_v1('outgoing')) is distinct from array[peer]
     or public.member_connection_state_v1(peer) <> 'outgoing' then
    raise exception 'Pending outgoing request missing or duplicated';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85100003-0000-4000-8000-000000000003',true);
do $$
begin
  if exists(select 1 from public.member_connections)
     or exists(select 1 from public.member_connection_page_v1('incoming'))
     or public.respond_member_connection_v1('85100001-0000-4000-8000-000000000001','accept') then
    raise exception 'Unrelated member saw or mutated a private request';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85100002-0000-4000-8000-000000000002',true);
do $$
declare
  peer constant uuid := '85100001-0000-4000-8000-000000000001';
begin
  perform public.request_member_connection_v1(peer);
  if (select array_agg(id) from public.member_connection_page_v1('incoming')) is distinct from array[peer]
     or public.member_connection_state_v1(peer) <> 'incoming'
     or exists(select 1 from public.member_connection_page_v1('outgoing')) then
    raise exception 'Crossed request reversed consent or duplicated the connection';
  end if;
  if not public.respond_member_connection_v1(peer,'decline') then
    raise exception 'Expected decline to succeed';
  end if;
  if public.member_connection_state_v1(peer) <> 'available' then
    raise exception 'Decline did not clear the incoming request';
  end if;
  perform public.request_member_connection_v1(peer);
  if not public.respond_member_connection_v1(peer,'withdraw') then
    raise exception 'Expected withdraw to succeed';
  end if;
  if public.member_connection_state_v1(peer) <> 'available' then
    raise exception 'Withdraw did not clear the outgoing request';
  end if;
  perform public.request_member_connection_v1(peer);
end;
$$;

select set_config('request.jwt.claim.sub','85100001-0000-4000-8000-000000000001',true);
do $$
declare
  peer constant uuid := '85100002-0000-4000-8000-000000000002';
begin
  if not public.respond_member_connection_v1(peer,'accept') then
    raise exception 'Recipient could not accept';
  end if;
  if public.respond_member_connection_v1(peer,'accept')
     or public.respond_member_connection_v1(peer,'decline')
     or public.member_connection_state_v1(peer) <> 'accepted'
     or (select array_agg(id) from public.member_connection_page_v1('accepted', page_size=>1)) is distinct from array[peer]
     or exists(select 1 from public.member_connection_page_v1('accepted', after_id=>peer)) then
    raise exception 'Accepted state or seek pagination incorrect';
  end if;
  if not public.respond_member_connection_v1(peer,'remove') then
    raise exception 'Expected removal to succeed';
  end if;
  if public.member_connection_state_v1(peer) <> 'available' then
    raise exception 'Removal did not clear connection';
  end if;
  perform public.request_member_connection_v1(peer);
end;
$$;

insert into public.member_blocks(blocker_id,blocked_id)
values ('85100001-0000-4000-8000-000000000001','85100002-0000-4000-8000-000000000002');
select set_config('request.jwt.claim.sub','85100002-0000-4000-8000-000000000002',true);
do $$
declare
  peer constant uuid := '85100001-0000-4000-8000-000000000001';
begin
  if exists(select 1 from public.member_connection_page_v1('incoming'))
     or public.member_connection_state_v1(peer) <> 'blocked'
     or public.respond_member_connection_v1(peer,'accept') then
    raise exception 'Block did not hide pending request and prohibit acceptance';
  end if;
  begin
    perform public.request_member_connection_v1(peer);
    raise exception 'Blocked request succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.member_connection_page_v1('incoming', page_size=>51);
    raise exception 'Oversized request page accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
rollback;
