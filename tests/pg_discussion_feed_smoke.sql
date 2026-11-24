-- Synthetic fixture only. All fixture rows, grants and trigger changes roll back.
begin;
grant usage on schema public, auth to authenticated, anon;
grant select on public.discussions, public.communities, public.profiles,
  public.memberships, public.member_blocks, public.discussion_likes to authenticated;
grant insert, delete on public.member_blocks to authenticated;

insert into auth.users(id, email, raw_user_meta_data) values
 ('71000000-0000-4000-8000-000000000001','feed-owner@example.test','{"display_name":"Feed owner"}'),
 ('71000002-0000-4000-8000-000000000002','feed-viewer@example.test','{"display_name":"Feed viewer"}'),
 ('71000003-0000-4000-8000-000000000003','feed-outsider@example.test','{"display_name":"Feed outsider"}');

insert into public.communities(id,slug,name,category,visibility,created_by) values
 ('72000000-0000-4000-8000-000000000001','feed-public','Feed public','markets','public','71000000-0000-4000-8000-000000000001'),
 ('72000000-0000-4000-8000-000000000002','feed-private','Feed private','markets','private','71000000-0000-4000-8000-000000000001');
insert into public.memberships (community_id,user_id) values
 ('72000000-0000-4000-8000-000000000001','71000002-0000-4000-8000-000000000002'),
 ('72000000-0000-4000-8000-000000000002','71000002-0000-4000-8000-000000000002');

insert into public.discussions (id,community_id,author_id,parent_id,title,body,created_at)
select
  ('73000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  case when n < 6 then '72000000-0000-4000-8000-000000000002'::uuid
       else '72000000-0000-4000-8000-000000000001'::uuid end,
  '71000000-0000-4000-8000-000000000001'::uuid,
  null,
  'Research fixture ' || n,
  'Research about financial statements',
  '2024-06-01T00:00:00.123456Z'::timestamptz
from generate_series(1,9) n;
insert into public.discussions (id,community_id,author_id,parent_id,body,created_at)
values ('73000000-0000-4000-8000-000000000010','72000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000005',
  'Reply fixture with an earnings source','2024-06-02T00:00:00Z');
insert into public.discussions (id,community_id,author_id,title,body,created_at)
values ('73000000-0000-4000-8000-000000000011','72000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001','Moderation fixture for promotion',
  'Meme coin presale with guaranteed 100x returns','2024-06-03T00:00:00Z');
insert into public.discussion_likes (discussion_id,user_id)
values ('73000000-0000-4000-8000-000000000005','71000002-0000-4000-8000-000000000002');

set local role anon;
do $$
begin
  perform public.discussion_feed_v1('discover');
  raise exception 'Anonymous RPC executed';
exception when insufficient_privilege then null;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000002-0000-4000-8000-000000000002', true);
do $$
declare
  circle uuid := '72000000-0000-4000-8000-000000000002';
  post uuid := '73000000-0000-4000-8000-000000000005';
  first_page jsonb;
  second_page jsonb;
  saved_page jsonb;
  discovered jsonb;
begin
  first_page := public.discussion_feed_v1('circle',circle,page_size=>2);
  if jsonb_array_length(first_page->'items') <> 2 or first_page #>> '{items,0,id}' <> post::text
     or first_page #>> '{items,0,liked}' <> 'true' or first_page #>> '{items,0,likes_count}' <> '1'
     or first_page #>> '{items,0,replies_count}' <> '1'
     or first_page #>> '{items,0,author_name}' <> 'Feed owner' then
    raise exception 'First page, aggregates or projection incorrect: %', first_page;
  end if;
  second_page := public.discussion_feed_v1('circle',circle,page_size=>2,
    before_time=>(first_page #>> '{next,before_time}')::timestamptz,
    before_id=>(first_page #>> '{next,before_id}')::uuid);
  if second_page #>> '{items,0,id}' <> '73000000-0000-4000-8000-000000000003'
     or second_page #>> '{items,1,id}' <> '73000000-0000-4000-8000-000000000002' then
    raise exception 'Timestamp tie was skipped or repeated: %', second_page;
  end if;
  saved_page := public.discussion_feed_v1('saved',saved_ids=>array[post]);
  if saved_page #>> '{items,0,id}' <> post::text or saved_page->'next' <> 'null'::jsonb then
    raise exception 'Saved page did not read its exact authorized id';
  end if;
  -- Other smoke suites populate public circles first in CI. Check only this
  -- fixture's rows within a cursor range that includes the quarantined post.
  discovered := public.discussion_feed_v1('discover',
    before_time=>'2024-06-04T00:00:00Z',
    before_id=>'ffffffff-ffff-ffff-ffff-ffffffffffff');
  if jsonb_array_length(public.discussion_feed_v1('mine')->'items') <> 9
     or (select count(*) from jsonb_array_elements(discovered->'items') item
         where item->>'author_id'='71000000-0000-4000-8000-000000000001') <> 4
     or jsonb_array_length(public.discussion_feed_v1('replies',post)->'items') <> 1 then
    raise exception 'Timeline scope or moderation is incorrect';
  end if;
  begin
    perform public.discussion_feed_v1('circle',circle,before_time=>now());
    raise exception 'Partial cursor accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.discussion_feed_v1('discover', page_size=>51);
    raise exception 'Oversized page accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.discussion_feed_v1('saved',saved_ids=>array_fill(post,array[501]));
    raise exception 'Oversized saved list accepted';
  exception when invalid_parameter_value then null;
  end;
  perform public.leave_community(circle);
  if jsonb_array_length(public.discussion_feed_v1('circle',circle)->'items') <> 0
     or jsonb_array_length(public.discussion_feed_v1('saved',saved_ids=>array[post])->'items') <> 0
     or jsonb_array_length(public.discussion_feed_v1('replies',post)->'items') <> 0
     or jsonb_array_length(public.discussion_feed_v1('member','71000000-0000-4000-8000-000000000001')->'items') <> 4 then
    raise exception 'Revoked membership still sees private posts or replies';
  end if;
end;
$$;

insert into public.member_blocks(blocker_id,blocked_id) values
 ('71000002-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001');
do $$
begin
  if jsonb_array_length(public.discussion_feed_v1(
     'member','71000000-0000-4000-8000-000000000001')->'items') <> 0 then
    raise exception 'Blocked member appears on viewer timeline';
  end if;
end;
$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000003-0000-4000-8000-000000000003', true);
do $$
begin
  if jsonb_array_length(public.discussion_feed_v1('circle','72000000-0000-4000-8000-000000000002')->'items') <> 0 then
    raise exception 'Unrelated member can read private circle';
  end if;
end;
$$;
reset role;

-- Populate separate synthetic circles with enough rows to exercise deep seeks.
insert into public.communities (id,slug,name,category,visibility,created_by)
select md5('feed benchmark circle '||n)::uuid,'feed-benchmark-'||n,'Feed benchmark '||n,'markets','public',
 '71000000-0000-4000-8000-000000000001'::uuid
from generate_series(1,40) n;
alter table public.discussions disable trigger common_discussions_throttle;
insert into public.discussions (id,community_id,author_id,title,body,created_at)
select md5('feed benchmark post '||n)::uuid, md5('feed benchmark circle '||(n % 40 + 1))::uuid,
 '71000000-0000-4000-8000-000000000001'::uuid,'Feed benchmark post',
 'Source-backed synthetic financial research fixture.',
 '2023-06-01T00:00:00Z'::timestamptz - make_interval(secs => n)
from generate_series(1,20000) n;
alter table public.discussions enable trigger common_discussions_throttle;
analyze public.discussions;
analyze public.communities;

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000003-0000-4000-8000-000000000003', true);
-- Record the authorized index seek and the full RPC latency including enrichment.
explain (analyze,buffers)
select d.id,d.created_at from public.discussions d
where d.community_id=md5('feed benchmark circle 1')::uuid
  and d.parent_id is null and d.deleted_at is null
  and (d.created_at,d.id)<('2023-05-31T21:13:20Z'::timestamptz,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
order by d.created_at desc,d.id desc limit 26;
explain (analyze,buffers)
select public.discussion_feed_v1('circle',md5('feed benchmark circle 1')::uuid,
  before_time=>'2023-05-31T21:13:20Z',before_id=>'ffffffff-ffff-ffff-ffff-ffffffffffff');
do $$
begin
  if jsonb_array_length(public.discussion_feed_v1('circle',md5('feed benchmark circle 1')::uuid,
    before_time=>'2023-05-31T21:13:20Z',before_id=>'ffffffff-ffff-ffff-ffff-ffffffffffff')->'items') <> 25 then
    raise exception 'Benchmark seek did not return exactly one page';
  end if;
end;
$$;
reset role;
rollback;
