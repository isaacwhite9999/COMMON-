begin;

-- These records apply to research review in private circles. They carry no
-- legal voting, execution or financial authorization semantics.
create table public.circle_governance_memos (
  proposal_id uuid primary key references public.proposals(id) on delete cascade,
  community_id uuid not null references public.communities(id),
  author_id uuid not null references public.profiles(id),
  thesis text not null check (length(btrim(thesis)) between 30 and 3000),
  diligence text not null check (length(btrim(diligence)) between 30 and 5000),
  risks text not null check (length(btrim(risks)) between 20 and 3000),
  disclosures text not null check (length(btrim(disclosures)) between 4 and 1000),
  created_at timestamptz not null default now()
);
create index circle_governance_memos_circle_idx on public.circle_governance_memos(community_id);

create table public.circle_governance_reviews (
  proposal_id uuid not null references public.circle_governance_memos(proposal_id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  disposition text not null check (disposition in ('research_ready','changes_requested')),
  rationale text not null check (length(btrim(rationale)) between 15 and 2000),
  independent boolean not null check (independent),
  created_at timestamptz not null default now(),
  primary key (proposal_id,author_id)
);
create index circle_governance_reviews_recent_idx
  on public.circle_governance_reviews(proposal_id,created_at desc,author_id);

alter table public.circle_governance_memos enable row level security;
alter table public.circle_governance_reviews enable row level security;
revoke all on public.circle_governance_memos, public.circle_governance_reviews from public,anon,authenticated;
grant select on public.circle_governance_memos,public.circle_governance_reviews to authenticated;
grant insert (proposal_id,community_id,author_id,thesis,diligence,risks,disclosures)
  on public.circle_governance_memos to authenticated;
grant insert (proposal_id,author_id,disposition,rationale,independent)
  on public.circle_governance_reviews to authenticated;

create policy circle_memos_read_current_members on public.circle_governance_memos
  for select to authenticated using (
    public.is_member(community_id,(select auth.uid()))
    and exists (
      select 1 from public.proposals p join public.communities c on c.id=p.community_id
      where p.id=circle_governance_memos.proposal_id and p.community_id=circle_governance_memos.community_id and c.visibility='private'
    )
  );
create policy circle_memos_create_proposal_author on public.circle_governance_memos
  for insert to authenticated with check (
    author_id=(select auth.uid())
    and public.is_member(community_id,(select auth.uid()))
    and exists (
      select 1 from public.proposals p join public.communities c on c.id=p.community_id
      where p.id=proposal_id and p.community_id=circle_governance_memos.community_id
        and p.author_id=circle_governance_memos.author_id and c.visibility='private'
    )
  );

create policy circle_reviews_read_current_members on public.circle_governance_reviews
  for select to authenticated using (
    exists (select 1 from public.circle_governance_memos m where m.proposal_id=circle_governance_reviews.proposal_id)
  );
create policy circle_reviews_create_independent_moderator on public.circle_governance_reviews
  for insert to authenticated with check (
    author_id=(select auth.uid()) and independent and exists (
      select 1 from public.circle_governance_memos m where m.proposal_id=circle_governance_reviews.proposal_id
        and m.author_id<>(select auth.uid()) and public.is_moderator(m.community_id,(select auth.uid()))
    )
  );

-- Unlike an editable discussion, a recorded memo or review has no in-app
-- amendment path. Reject content caught by the existing safety rules before
-- inserting it. The moderation queue remains available for community posts.
create function private.check_governance_content()
returns trigger language plpgsql security definer set search_path=''
as $$
declare row_data jsonb := to_jsonb(new);
begin
  if cardinality(private.fraud_signals(concat_ws(' ',row_data->>'thesis',
     row_data->>'diligence',row_data->>'risks',row_data->>'disclosures',row_data->>'rationale'))) > 0 then
    raise exception 'The text matches investment safety rules. Revise it before recording.' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_governance_content() from public,anon,authenticated;

create trigger common_enforce_circle_memos before insert on public.circle_governance_memos
  for each row execute function private.enforce_account_posting();
create trigger common_enforce_circle_reviews before insert on public.circle_governance_reviews
  for each row execute function private.enforce_account_posting();
create trigger common_check_circle_memos before insert on public.circle_governance_memos
  for each row execute function private.check_governance_content();
create trigger common_check_circle_reviews before insert on public.circle_governance_reviews
  for each row execute function private.check_governance_content();

commit;
