-- Development schema draft. Apply only to disposable CI/staging until approved.
-- Manual external book records only; no deposits, transfer instructions, or custody.
create or replace function public.common_valid_journal(lines jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare l jsonb; d bigint:=0; c bigint:=0; n bigint; k text; keys text[]:=array[]::text[]; accounts text[]:=array[]::text[];
begin
 if jsonb_typeof(lines) is distinct from 'array' then return false; end if;
 if jsonb_array_length(lines) not between 2 and 12 then return false; end if;
 for l in select value from jsonb_array_elements(lines) loop
  if jsonb_typeof(l) is distinct from 'object' or not (l ?& array['account','side','cents']) then return false; end if;
  if (select count(*) from jsonb_object_keys(l))<>3 then return false; end if;
  if l->>'account' not in ('cash','investments','receivables','payables','capital','income','realized_gain','realized_loss','expenses') or l->>'account' is null then return false; end if;
  if l->>'side' not in ('debit','credit') or l->>'side' is null then return false; end if;
  if jsonb_typeof(l->'cents') is distinct from 'number' or (l->>'cents') !~ '^[0-9]{1,10}$' then return false; end if;
  n:=(l->>'cents')::bigint;if n not between 1 and 1000000000 then return false; end if;
  k:=(l->>'account')||'|'||(l->>'side');if k=any(keys) then return false; end if;
  keys:=array_append(keys,k);if not (l->>'account')=any(accounts) then accounts:=array_append(accounts,l->>'account');end if;
  if l->>'side'='debit' then d:=d+n;else c:=c+n;end if;
 end loop;
 return d=c and d between 1 and 1000000000 and cardinality(accounts)>=2;
end $$;
revoke all on function public.common_valid_journal(jsonb) from public,anon;
grant execute on function public.common_valid_journal(jsonb) to authenticated;
create table public.circle_external_journal(
 id uuid primary key default gen_random_uuid(),
 community_id uuid not null references public.communities(id) on delete restrict,
 author_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
 record_date date not null check(record_date>=date '1900-01-01'),
 source_ref text not null check(source_ref ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$'),
 lines jsonb not null check(public.common_valid_journal(lines)),
 reverses_id uuid unique references public.circle_external_journal(id) on delete restrict,
 created_at timestamptz not null default now(),
 unique(community_id,source_ref)
);
create index circle_external_journal_community_idx on public.circle_external_journal(community_id,record_date,created_at);
alter table public.circle_external_journal enable row level security;
revoke all on public.circle_external_journal from public,anon,authenticated;
grant select on public.circle_external_journal to authenticated;
grant insert(community_id,record_date,source_ref,lines,reverses_id) on public.circle_external_journal to authenticated;
create policy "private members read manually recorded journal"
 on public.circle_external_journal for select to authenticated
 using(public.is_member(community_id,(select auth.uid())) and exists(select 1 from public.communities c where c.id=community_id and c.visibility='private'));
create policy "private circle moderators record external entries"
 on public.circle_external_journal for insert to authenticated
 with check(author_id=(select auth.uid()) and public.is_moderator(community_id,(select auth.uid())) and exists(select 1 from public.communities c where c.id=community_id and c.visibility='private'));
create or replace function public.common_external_journal_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
declare original public.circle_external_journal%rowtype; expected jsonb;
begin
 if tg_op<>'INSERT' then raise exception 'Journal is append-only; post a reversing entry';end if;
 if new.record_date>current_date then raise exception 'Record completed external activity only';end if;
 if new.reverses_id is not null then
  select * into original from public.circle_external_journal where id=new.reverses_id and community_id=new.community_id;
  if not found or original.reverses_id is not null or new.record_date<original.record_date then raise exception 'Invalid reversal';end if;
  select jsonb_agg(jsonb_build_object('account',l->>'account','side',case when l->>'side'='debit' then 'credit' else 'debit' end,'cents',l->'cents') order by ord)
   into expected from jsonb_array_elements(original.lines) with ordinality as j(l,ord);
  if new.lines is distinct from expected then raise exception 'Reversal must exactly invert original entry';end if;
 end if;
 return new;
end $$;
revoke all on function public.common_external_journal_guard() from public,anon,authenticated;
create trigger common_external_journal_guard before insert or update or delete on public.circle_external_journal for each row execute function public.common_external_journal_guard();

-- Reports share the journal's member RLS. Draft only. No source provider or ownership claims.
create or replace function public.read_external_journal_statement(
 p_circle_id uuid, p_start_date date, p_end_date date
)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 result jsonb;
 evidence_limit constant integer := 10000;
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.communities c where c.id=p_circle_id and c.visibility='private'
   and public.is_member(c.id,(select auth.uid()))
 ) then
  raise insufficient_privilege using message='Private journal membership required';
 end if;
 if p_start_date is null or p_end_date is null
  or not isfinite(p_start_date) or not isfinite(p_end_date)
  or p_start_date<date '1900-01-01' or p_end_date>current_date
  or p_start_date>p_end_date or p_end_date-p_start_date>365 then
  raise invalid_parameter_value using message='Choose a valid journal period of up to 366 days';
 end if;

 -- Read one database snapshot, including opening entries before the reporting period.
 with evidence as materialized (
  select j.id,j.record_date,j.lines from public.circle_external_journal j
   where j.community_id=p_circle_id and j.record_date<=p_end_date
   order by j.record_date,j.created_at
   limit evidence_limit+1
 ), counts as (
  select count(*) as total,count(*) filter(where record_date>=p_start_date) as period
  from evidence
 ), catalog(account, debit_normal, position) as (
  values ('cash',true,1),('investments',true,2),('receivables',true,3),
   ('payables',false,4),('capital',false,5),('income',false,6),
   ('realized_gain',false,7),('realized_loss',true,8),('expenses',true,9)
 ), entries as (
  select evidence.record_date, line->>'account' as account, line->>'side' as side,
   (line->>'cents')::numeric as cents
  from evidence cross join lateral jsonb_array_elements(evidence.lines) as rows(line)
  where (select total from counts)<=evidence_limit
 ), balances as (
  select cat.account,cat.debit_normal,cat.position,
   coalesce(sum(case when (e.side='debit')=cat.debit_normal then e.cents else -e.cents end)
    filter(where e.record_date<p_start_date),0) as opening,
   coalesce(sum(e.cents) filter(where e.record_date>=p_start_date and e.side='debit'),0) as debits,
   coalesce(sum(e.cents) filter(where e.record_date>=p_start_date and e.side='credit'),0) as credits
  from catalog cat left join entries e on e.account=cat.account
  group by cat.account,cat.debit_normal,cat.position
 )
 select jsonb_build_object(
  'schema','common.external-journal-statement.v1',
  'circleId',p_circle_id,'currency','USD','startDate',p_start_date,'endDate',p_end_date,
  'generatedAt',statement_timestamp(),'evidenceCount',(select total from counts),
  'periodEntryCount',(select period from counts),
  'evidenceSha256',(
   select encode(sha256(convert_to(coalesce(
    jsonb_agg(jsonb_build_array(ev.id,ev.record_date,ev.lines) order by ev.id),'[]'::jsonb
   )::text,'UTF8')),'hex') from evidence ev where (select total from counts)<=evidence_limit
  ),
  'debitsCents',sum(b.debits)::text,'creditsCents',sum(b.credits)::text,
  'accounts',jsonb_agg(jsonb_build_object(
   'account',b.account,'normalSide',case when b.debit_normal then 'debit' else 'credit' end,
   'openingCents',b.opening::text,'debitsCents',b.debits::text,'creditsCents',b.credits::text,
   'closingCents',(b.opening+case when b.debit_normal then b.debits-b.credits else b.credits-b.debits end)::text
  ) order by b.position)
 ) into result from balances b;

 if (result->>'evidenceCount')::integer>evidence_limit then
  raise program_limit_exceeded using message='Journal exceeds this statement evidence limit. Choose an earlier end date.';
 end if;
 return result;
end $$;
revoke all on function public.read_external_journal_statement(uuid,date,date) from public,anon,authenticated;
grant execute on function public.read_external_journal_statement(uuid,date,date) to authenticated;
