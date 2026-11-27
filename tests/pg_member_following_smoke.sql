-- SOCIAL-019, SOCIAL-025, SOCIAL-026, SOCIAL-034. All fixture changes roll back.
begin;
grant usage on schema public, auth to authenticated, anon;
grant select on public.discussions, public.communities, public.profiles,
  public.memberships, public.member_blocks, public.discussion_likes to authenticated;
grant insert on public.member_blocks to authenticated;

insert into auth.users(id,email,raw_user_meta_data) values
 ('85000000-0000-4000-8000-000000000001','follow-reader@example.test','{"display_name":"Follow reader"}'),
 ('85000002-0000-4000-8000-000000000002','follow-author@example.test','{"display_name":"Follow author"}'),
 ('85000003-0000-4000-8000-000000000003','follow-outsider@example.test','{"display_name":"Follow outsider"}');

insert into public.communities(id,slug,name,category,visibility,created_by) values
 ('85001000-0000-4000-8000-000000000001','follow-public','Follow public','markets','public','85000002-0000-4000-8000-000000000002'),
 ('85001000-0000-4000-8000-000000000002','follow-private','Follow private','markets','private','85000002-0000-4000-8000-000000000002');

insert into public.discussions(id,community_id,author_id,title,body,created_at) values
 ('85002000-0000-4000-8000-000000000001','85001000-0000-4000-8000-000000000001','85000002-0000-4000-8000-000000000002','Public first','Public research notice','2024-07-01T09:30Z'),
 ('85002000-0000-4000-8000-000000000002','85001000-0000-4000-8000-000000000001','85000002-0000-4000-8000-000000000002','Public second','Public research notice','2024-07-01T09:30Z'),
 ('85002000-0000-4000-8000-000000000003','85001000-0000-4000-8000-000000000002','85000002-0000-4000-8000-000000000002','Private research','Private research notice','2024-07-01T09:30Z');

set local role anon;
do $$
begin
  execute 'select follower_id from public.member_follows';
  raise exception 'Signed-out relationship read succeeded as %, privileges %', current_user, has_table_privilege(current_user, 'public.member_follows', 'SELECT');
exception when insufficient_privilege then null;
end;
$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','85000000-0000-4000-8000-000000000001',true);

do $$
declare
  viewer constant uuid := auth.uid();
  author constant uuid := '85000002-0000-4000-8000-000000000002';
  outsider constant uuid := '85000003-0000-4000-8000-000000000003';
  first_page jsonb;
  second_page jsonb;
begin
  if public.discussion_feed_v1('following')->'items' <> '[]'::jsonb then
    raise exception 'Following feed contains unrelated authors';
  end if;
  begin
    insert into public.member_follows values (outsider, author);
    raise exception 'Forged owner accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.member_follows values (viewer, viewer);
    raise exception 'Self-follow accepted';
  exception when check_violation then null;
  end;
  insert into public.member_follows values (viewer, author) on conflict do nothing;
  insert into public.member_follows values (viewer, author) on conflict do nothing;
  if (select count(*) from public.member_follows where follower_id=viewer) <> 1 then
    raise exception 'Idempotent following failed';
  end if;
  first_page := public.discussion_feed_v1('following',page_size=>1);
  second_page := public.discussion_feed_v1('following',page_size=>1,
    before_time=>(first_page #>> '{next,before_time}')::timestamptz,
    before_id=>(first_page #>> '{next,before_id}')::uuid);
  if first_page #>> '{items,0,id}' is distinct from '85002000-0000-4000-8000-000000000002'
    or second_page #>> '{items,0,id}' is distinct from '85002000-0000-4000-8000-000000000001'
    or second_page->'next' <> 'null'::jsonb then
    raise exception 'Following timeline exposed a private item or lost a cursor tie';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85000003-0000-4000-8000-000000000003',true);
do $$
begin
  if exists(select 1 from public.member_follows) then
    raise exception 'Third party saw a relationship';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','85000002-0000-4000-8000-000000000002',true);
do $$
begin
  if (select count(*) from public.member_follows where followed_id=auth.uid()) <> 1 then
    raise exception 'Followed member cannot see their own follower';
  end if;
  delete from public.member_follows where followed_id=auth.uid();
  if not exists(select 1 from public.member_follows where followed_id=auth.uid()) then
    raise exception 'Followed member deleted another member''s edge';
  end if;
end;
$$;

insert into public.member_blocks(blocker_id,blocked_id)
values ('85000002-0000-4000-8000-000000000002','85000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','85000000-0000-4000-8000-000000000001',true);
do $$
begin
  if exists(select 1 from public.member_follows) or public.discussion_feed_v1('following')->'items' <> '[]'::jsonb then
    raise exception 'Incoming block did not revoke relationship and feed access';
  end if;
  begin
    insert into public.member_follows values (auth.uid(),'85000002-0000-4000-8000-000000000002')
      on conflict do nothing;
    raise exception 'Blocked follow accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
delete from public.member_blocks where blocker_id='85000002-0000-4000-8000-000000000002'
  and blocked_id='85000000-0000-4000-8000-000000000001';
set local role authenticated;
delete from public.member_follows where follower_id=auth.uid() and followed_id='85000002-0000-4000-8000-000000000002';
do $$
begin
  if exists(select 1 from public.member_follows) or public.discussion_feed_v1('following')->'items' <> '[]'::jsonb then
    raise exception 'Unfollow did not remove relationship and feed items';
  end if;
end;
$$;
rollback;
