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
