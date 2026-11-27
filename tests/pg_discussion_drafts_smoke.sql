begin;
grant usage on schema public, auth to authenticated, anon;
grant select on public.communities, public.memberships, public.discussions to authenticated;
grant insert on public.discussions to authenticated;
insert into auth.users(id,email,raw_user_meta_data) values
 ('ad200000-0000-4000-8000-000000000001','draft-owner@example.test','{"display_name":"Draft owner"}'),
 ('ad200002-0000-4000-8000-000000000002','draft-other@example.test','{"display_name":"Draft other"}');
insert into public.communities(id,slug,name,category,visibility,created_by)
values ('ad201000-0000-4000-8000-000000000001','draft-circle','Draft Circle','markets','private',
 'ad200002-0000-4000-8000-000000000002');
insert into public.memberships (community_id,user_id)
values ('ad201000-0000-4000-8000-000000000001','ad200000-0000-4000-8000-000000000001');

set local role anon;
do $$
begin
  perform public.read_discussion_draft_v1();
  raise exception 'Anonymous draft access was granted';
exception when insufficient_privilege then null;
end;
$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ad200000-0000-4000-8000-000000000001', true);
do $$
declare
  circle uuid := 'ad201000-0000-4000-8000-000000000001';
  submitted uuid := 'ad202000-0000-4000-8000-000000000001';
  saved jsonb;
begin
  if public.read_discussion_draft_v1() is not null then raise exception 'New owner has a draft'; end if;
  begin
    perform public.save_discussion_draft_v1(0,gen_random_uuid(),'Unknown circle','');
    raise exception 'A draft accepted a destination outside current memberships';
  exception when insufficient_privilege then null;
  end;
  saved := public.save_discussion_draft_v1(0,circle,'Partial','');
  if saved->>'revision' <> '1' or saved->>'title' <> 'Partial'
    or public.read_discussion_draft_v1()->>'title' <> 'Partial' then
    raise exception 'Partial draft did not survive the request';
  end if;
  begin
    perform public.save_discussion_draft_v1(0,circle,'Stale device','stale text');
    raise exception 'A stale device overwrote the draft';
  exception when serialization_failure then null;
  end;
  begin
    perform public.publish_discussion_draft_v1(1,submitted);
    raise exception 'Incomplete draft was published';
  exception when invalid_parameter_value then null;
  end;
  saved := public.save_discussion_draft_v1(1,circle,'Member research draft','Text with supporting evidence.');
  if saved->>'revision' <> '2' then raise exception 'Draft revision did not advance'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'ad200002-0000-4000-8000-000000000002', true);
do $$
begin
  if public.read_discussion_draft_v1() is not null
    or (select count(*) from public.discussion_drafts)<>0 then
    raise exception 'Another member can read the unpublished draft';
  end if;
  update public.discussion_drafts set body='unauthorized change'
  where owner_id='ad200000-0000-4000-8000-000000000001';
  if found then raise exception 'Another member can change the draft'; end if;
  begin
    perform public.publish_discussion_draft_v1(2,'ad202000-0000-4000-8000-000000000001');
    raise exception 'Another member can publish the draft';
  exception when serialization_failure then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'ad200000-0000-4000-8000-000000000001', true);
do $$
declare
  circle uuid := 'ad201000-0000-4000-8000-000000000001';
  submitted uuid := 'ad202000-0000-4000-8000-000000000001';
  saved jsonb;
begin
  if public.publish_discussion_draft_v1(2,submitted) <> submitted
     or public.publish_discussion_draft_v1(2,submitted) <> submitted then
    raise exception 'Publish or idempotent retry returned the wrong discussion';
  end if;
  saved := public.read_discussion_draft_v1();
  if saved->>'revision' <> '3' or saved->>'body' <> '' or saved->>'last_published_id' <> submitted::text then
    raise exception 'Publish did not clear the slot atomically';
  end if;
  if (select count(*) from public.discussions where id=submitted and body='Text with supporting evidence.') <> 1 then
    raise exception 'Expected one published discussion';
  end if;
  perform public.save_discussion_draft_v1(3,circle,'Draft after publishing','Must retain after rejection.');
  perform public.leave_community(circle);
  begin
    perform public.publish_discussion_draft_v1(4,'ad202000-0000-4000-8000-000000000002');
    raise exception 'Former member published a draft';
  exception when insufficient_privilege then null;
  end;
  if public.read_discussion_draft_v1()->>'body' <> 'Must retain after rejection.' then
    raise exception 'Publication failure cleared the draft';
  end if;
  perform public.save_discussion_draft_v1(4,null,'','');
  begin
    perform public.save_discussion_draft_v1(4,circle,'Offline old draft','Obsolete draft after discarding.');
    raise exception 'An offline device resurrected a discarded draft';
  exception when serialization_failure then null;
  end;
end;
$$;
reset role;
rollback;
