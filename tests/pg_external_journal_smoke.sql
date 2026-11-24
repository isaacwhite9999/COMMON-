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
