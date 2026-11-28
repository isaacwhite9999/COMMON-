begin;
grant usage on schema public,auth to authenticated,anon;
grant select on public.profiles,public.communities,public.proposals,public.memberships to authenticated;
insert into auth.users(id,email,raw_user_meta_data) values
 ('a2100000-0000-4000-8000-000000000001','memo-owner@example.test','{"display_name":"Memo reviewer"}'),
 ('a2100002-0000-4000-8000-000000000002','memo-author@example.test','{"display_name":"Memo author"}'),
 ('a2100003-0000-4000-8000-000000000003','memo-member@example.test','{"display_name":"Memo member"}'),
 ('a2100004-0000-4000-8000-000000000004','memo-outsider@example.test','{"display_name":"Memo outsider"}');
insert into public.communities(id,slug,name,category,visibility,created_by) values
 ('a2110000-0000-4000-8000-000000000001','memo-private','Memo private','markets','private','a2100000-0000-4000-8000-000000000001'),
 ('a2110000-0000-4000-8000-000000000002','memo-public','Memo public','markets','public','a2100002-0000-4000-8000-000000000002');
insert into public.memberships(community_id,user_id,role) values
 ('a2110000-0000-4000-8000-000000000001','a2100002-0000-4000-8000-000000000002','moderator'),
 ('a2110000-0000-4000-8000-000000000001','a2100003-0000-4000-8000-000000000003','member');
insert into public.proposals(id,community_id,author_id,title,rationale) values
 ('a2120000-0000-4000-8000-000000000001','a2110000-0000-4000-8000-000000000001','a2100002-0000-4000-8000-000000000002','Private accounting research','A nonbinding review of accounting disclosures and research sources.'),
 ('a2120000-0000-4000-8000-000000000002','a2110000-0000-4000-8000-000000000002','a2100002-0000-4000-8000-000000000002','Public accounting research','A nonbinding review of public accounting disclosures and research sources.');

set local role authenticated;
select set_config('request.jwt.claim.sub','a2100002-0000-4000-8000-000000000002',true);
do $$
begin
  begin
    insert into public.circle_governance_memos(proposal_id,community_id,author_id,thesis,diligence,risks,disclosures)
    values ('a2120000-0000-4000-8000-000000000002','a2110000-0000-4000-8000-000000000002',auth.uid(),
      'A strong research question for comparative accounting.',
      'Public filing support and published accounting policies.',
      'Limited sample period and disclosure gaps.','None declared.');
    raise exception 'Public circle memo was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.circle_governance_memos(proposal_id,community_id,author_id,thesis,diligence,risks,disclosures)
    values ('a2120000-0000-4000-8000-000000000001','a2110000-0000-4000-8000-000000000001',auth.uid(),
      'Meme coin presale with guaranteed 100x returns.',
      'Promotional information and other long claims.',
      'Limited sample period and disclosure gaps.','None declared.');
    raise exception 'Fraud signal bypassed the memo safety rules';
  exception when check_violation then null;
  end;
end;
$$;

insert into public.circle_governance_memos(proposal_id,community_id,author_id,thesis,diligence,risks,disclosures)
values ('a2120000-0000-4000-8000-000000000001','a2110000-0000-4000-8000-000000000001',auth.uid(),
 'Compare cash-flow classifications across the reporting periods.',
 'Use filed annual statements and published accounting policies.',
 'Limited sample period and disclosure gaps.','None declared.');
do $$
begin
  begin
    insert into public.circle_governance_reviews(proposal_id,author_id,disposition,rationale,independent)
    values ('a2120000-0000-4000-8000-000000000001',auth.uid(),
      'research_ready','Review contains useful research sources.',true);
    raise exception 'The moderator self-reviewed a memo';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub','a2100003-0000-4000-8000-000000000003',true);
do $$
begin
  if (select count(*) from public.circle_governance_memos)<>1 then
    raise exception 'Current member cannot read memo';
  end if;
  begin
    insert into public.circle_governance_reviews(proposal_id,author_id,disposition,rationale,independent)
    values ('a2120000-0000-4000-8000-000000000001',auth.uid(),
      'research_ready','Review contains useful research sources.',true);
    raise exception 'An ordinary member recorded a moderator review';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub','a2100000-0000-4000-8000-000000000001',true);
insert into public.circle_governance_reviews(proposal_id,author_id,disposition,rationale,independent)
values ('a2120000-0000-4000-8000-000000000001',auth.uid(),
 'changes_requested','Document how reclassifications affect comparability.',true);
do $$
begin
  begin
    insert into public.circle_governance_reviews(proposal_id,author_id,disposition,rationale,independent)
    values ('a2120000-0000-4000-8000-000000000001',auth.uid(),
      'research_ready','Review contains useful research sources.',true);
    raise exception 'A duplicate review was inserted';
  exception when unique_violation then null;
  end;
  begin
    update public.circle_governance_reviews set rationale='Mutated review rationale';
    if found then raise exception 'Decision audit history could be edited'; end if;
  exception when insufficient_privilege then null;
  end;
  if (select status from public.proposals where id='a2120000-0000-4000-8000-000000000001')<>'open' then
    raise exception 'Memo review altered the underlying poll';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub','a2100004-0000-4000-8000-000000000004',true);
do $$
begin
  if exists(select 1 from public.circle_governance_memos) or exists(select 1 from public.circle_governance_reviews) then
    raise exception 'Private governance records leaked to an outsider';
  end if;
end;
$$;
select set_config('request.jwt.claim.sub','a2100003-0000-4000-8000-000000000003',true);
do $$
begin
  if (select count(*) from public.circle_governance_reviews)<>1 then
    raise exception 'Authorized circle member cannot read independent review';
  end if;
  perform public.leave_community('a2110000-0000-4000-8000-000000000001');
  if exists(select 1 from public.circle_governance_memos) or exists(select 1 from public.circle_governance_reviews) then
    raise exception 'Revoked member retained read access';
  end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
  if exists(select 1 from public.circle_governance_memos) or
     exists(select 1 from public.circle_governance_reviews) then
    raise exception 'Anonymous can read governance records';
  end if;
exception when insufficient_privilege then null;
end;
$$;
reset role;
rollback;
