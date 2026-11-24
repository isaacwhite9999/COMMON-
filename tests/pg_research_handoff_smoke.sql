begin;
grant usage on schema public, auth to authenticated, anon;
grant select on public.communities, public.memberships, public.discussions to authenticated;
grant insert on public.discussions to authenticated;

insert into auth.users(id, email, raw_user_meta_data) values
 ('84000000-0000-4000-8000-000000000001','handoff-owner@example.test','{"display_name":"Handoff owner"}'),
 ('84000002-0000-4000-8000-000000000002','handoff-member@example.test','{"display_name":"Handoff member"}'),
 ('84000003-0000-4000-8000-000000000003','handoff-observer@example.test','{"display_name":"Handoff observer"}');

insert into public.communities(id,slug,name,category,visibility,created_by) values
 ('84100000-0000-4000-8000-000000000001','handoff-private','Handoff private','markets','private','84000000-0000-4000-8000-000000000001'),
 ('84100000-0000-4000-8000-000000000002','handoff-public','Handoff public','markets','public','84000000-0000-4000-8000-000000000001');
insert into public.memberships (community_id,user_id) values
 ('84100000-0000-4000-8000-000000000001','84000002-0000-4000-8000-000000000002'),
 ('84100000-0000-4000-8000-000000000002','84000002-0000-4000-8000-000000000002');

do $$
begin
  if has_function_privilege('anon', 'public.publish_research_draft_v1(uuid,uuid,text,text)', 'EXECUTE') then
    raise exception 'Anonymous callers can publish';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub','84000002-0000-4000-8000-000000000002',true);
do $$
declare
  draft constant uuid := '84200000-0000-4000-8000-000000000001';
  private_circle constant uuid := '84100000-0000-4000-8000-000000000001';
  public_circle constant uuid := '84100000-0000-4000-8000-000000000002';
begin
  if public.publish_research_draft_v1(draft,private_circle,'Historical result','Simulation evidence only') <> draft
    or public.publish_research_draft_v1(draft,private_circle,'Historical result','Simulation evidence only') <> draft then
    raise exception 'Draft publication and retry did not return a stable ID';
  end if;
  if (select count(*) from public.discussions where id=draft
      and author_id=auth.uid() and community_id=private_circle) <> 1 then
    raise exception 'Duplicate or improperly scoped discussion';
  end if;
  begin
    perform public.publish_research_draft_v1(draft,private_circle,'Historical result','Modified evidence');
    raise exception 'Edited replay unexpectedly succeeded';
  exception when unique_violation then null; end;
  begin
    perform public.publish_research_draft_v1(gen_random_uuid(),public_circle,'Historical result','Simulation evidence only');
    raise exception 'The draft handoff accepted a public circle';
  exception when insufficient_privilege then null; end;
end;
$$;

select set_config('request.jwt.claim.sub','84000003-0000-4000-8000-000000000003',true);
do $$
begin
  begin
    perform public.publish_research_draft_v1(gen_random_uuid(),'84100000-0000-4000-8000-000000000001','Historical result','Simulation evidence only');
    raise exception 'A nonmember published to a private circle';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.discussions where id='84200000-0000-4000-8000-000000000001') then
    raise exception 'Private discussion visible to outsider';
  end if;
end;
$$;

reset role;
delete from public.memberships where community_id='84100000-0000-4000-8000-000000000001'
  and user_id='84000002-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','84000002-0000-4000-8000-000000000002',true);
do $$
begin
  begin
    perform public.publish_research_draft_v1(gen_random_uuid(),'84100000-0000-4000-8000-000000000001','Historical result','Simulation evidence only');
    raise exception 'A former member published to a private circle';
  exception when insufficient_privilege then null; end;
end;
$$;
rollback;
