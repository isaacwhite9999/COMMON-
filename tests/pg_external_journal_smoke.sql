-- Runs after the existing community smoke fixtures. All new data rolls back.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.circle_external_journal(community_id,record_date,source_ref,lines)
 values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date,'external-test-001','[{"account":"cash","side":"debit","cents":10000},{"account":"capital","side":"credit","cents":10000}]');
do $$begin
 if (select count(*) from public.circle_external_journal)<>1 then raise exception 'Owner journal read failed';end if;
 begin
  insert into public.circle_external_journal(community_id,record_date,source_ref,lines) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date,'unbalanced','[{"account":"cash","side":"debit","cents":10000},{"account":"capital","side":"credit","cents":9000}]');
  raise exception 'Unbalanced entry accepted';
 exception when check_violation then null;end;
 begin
  insert into public.circle_external_journal(community_id,record_date,source_ref,lines) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',current_date,'public-entry','[{"account":"cash","side":"debit","cents":10000},{"account":"capital","side":"credit","cents":10000}]');
  raise exception 'Public journal accepted';
 exception when insufficient_privilege then null;end;
 begin
  update public.circle_external_journal set source_ref='rewritten';
  raise exception 'Journal mutation accepted';
 exception when insufficient_privilege then null;end;
end$$;
insert into public.circle_external_journal(community_id,record_date,source_ref,lines,reverses_id)
 select community_id,current_date,'external-test-reversal','[{"account":"cash","side":"credit","cents":10000},{"account":"capital","side":"debit","cents":10000}]',id from public.circle_external_journal where source_ref='external-test-001';
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$begin
 if (select count(*) from public.circle_external_journal)<>2 then raise exception 'Member cannot read journal';end if;
 begin
  insert into public.circle_external_journal(community_id,record_date,source_ref,lines) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date,'member-write','[{"account":"cash","side":"debit","cents":100},{"account":"capital","side":"credit","cents":100}]');
  raise exception 'Non-moderator write accepted';
 exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$begin if (select count(*) from public.circle_external_journal)<>0 then raise exception 'Nonmember journal leak';end if;end$$;
rollback;

-- The reporting slice uses separate fixtures, period boundaries, and role checks.
begin;
-- The Auth stub needs the schema usage that Supabase supplies for authenticated callers.
grant usage on schema auth to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.circle_external_journal(community_id,record_date,source_ref,lines) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-10,'opening-fixture','[{"account":"cash","side":"debit","cents":10001},{"account":"capital","side":"credit","cents":10001}]'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-6,'investment-fixture','[{"account":"investments","side":"debit","cents":2002},{"account":"cash","side":"credit","cents":2002}]'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-3,'income-fixture','[{"account":"cash","side":"debit","cents":335},{"account":"income","side":"credit","cents":335}]'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date,'later-fixture','[{"account":"expenses","side":"debit","cents":499},{"account":"cash","side":"credit","cents":499}]');
insert into public.circle_external_journal(community_id,record_date,source_ref,lines,reverses_id)
 select community_id,current_date-3,'investment-reversal-fixture','[{"account":"investments","side":"credit","cents":2002},{"account":"cash","side":"debit","cents":2002}]',id
 from public.circle_external_journal where source_ref='investment-fixture';

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare
 snapshot jsonb;
 repeated jsonb;
 cash jsonb;
 capital jsonb;
begin
 snapshot:=public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-6,current_date-3);
 repeated:=public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-6,current_date-3);
 select value into cash from jsonb_array_elements(snapshot->'accounts') where value->>'account'='cash';
 select value into capital from jsonb_array_elements(snapshot->'accounts') where value->>'account'='capital';
 if snapshot->>'evidenceCount' is distinct from '4'
  or snapshot->>'periodEntryCount' is distinct from '3'
  or snapshot->>'debitsCents' is distinct from '4339'
  or snapshot->>'creditsCents' is distinct from '4339'
  or cash->>'openingCents' is distinct from '10001'
  or cash->>'debitsCents' is distinct from '2337'
  or cash->>'creditsCents' is distinct from '2002'
  or cash->>'closingCents' is distinct from '10336'
  or capital->>'closingCents' is distinct from '10001'
  or snapshot->>'evidenceSha256' !~ '^[a-f0-9]{64}$'
  or snapshot->>'evidenceSha256' is distinct from repeated->>'evidenceSha256'
 then raise exception 'Journal statement accounting or provenance failed: %', snapshot;end if;

 snapshot:=public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-20,current_date-19);
 if snapshot->>'evidenceCount' is distinct from '0' or snapshot->>'debitsCents' is distinct from '0'
  or jsonb_array_length(snapshot->'accounts')<>9
 then raise exception 'Empty statement failed: %',snapshot;end if;

 begin
  perform public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-366,current_date);
  raise exception 'Oversized period accepted';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date,current_date+1);
  raise exception 'Future statement accepted';
 exception when invalid_parameter_value then null;end;
 begin
  perform public.read_external_journal_statement('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',current_date,current_date);
  raise exception 'Public circle statement accepted';
 exception when insufficient_privilege then null;end;
end $$;

select public.leave_community('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
do $$begin
 begin
  perform public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-6,current_date-3);
  raise exception 'Former member retained statement access';
 exception when insufficient_privilege then null;end;
end$$;
set local role anon;
do $$begin
 begin
  perform public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-6,current_date-3);
  raise exception 'Anonymous report access';
 exception when insufficient_privilege then null;end;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare earlier text;
begin
 earlier:=public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-6,current_date-3)->>'evidenceSha256';
 insert into public.circle_external_journal(community_id,record_date,source_ref,lines)
  values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-5,'late-fixture',
   '[{"account":"expenses","side":"debit","cents":1},{"account":"cash","side":"credit","cents":1}]');
 if earlier is not distinct from
  public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date-6,current_date-3)->>'evidenceSha256'
 then raise exception 'Backdated evidence failed to invalidate report fingerprint';end if;
end$$;

insert into public.circle_external_journal(community_id,record_date,source_ref,lines)
 select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date,'limit-fixture-'||i,
  '[{"account":"cash","side":"debit","cents":1},{"account":"capital","side":"credit","cents":1}]'::jsonb
 from generate_series(1,10000) i;
do $$begin
 begin
  perform public.read_external_journal_statement('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',current_date,current_date);
  raise exception 'Journal statement returned a truncated or unbounded result';
 exception when program_limit_exceeded then null;end;
end$$;
rollback;
