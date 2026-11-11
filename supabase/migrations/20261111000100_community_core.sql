-- COMMON COMMUNITY CORE | 2026-11-11
-- Real identity, groups, discussion, decisions and project exploration.
-- This schema DOES NOT accept money, investment commitments, bank details or orders.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (length(trim(display_name)) between 2 and 80),
  bio text not null default '' check (length(bio) <= 600),
  created_at timestamptz not null default now()
);
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,55}$'),
  name text not null check (length(trim(name)) between 4 and 100),
  description text not null default '' check (length(description) <= 2500),
  category text not null check (category in ('markets','housing','businesses','local','education')),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.memberships (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key (community_id,user_id)
);
create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  parent_id uuid references public.discussions(id),
  title text check (title is null or length(trim(title)) between 8 and 160),
  body text not null check (length(trim(body)) between 3 and 10000),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) between 8 and 160),
  rationale text not null check (length(trim(rationale)) between 30 and 15000),
  status text not null default 'open' check (status in ('open','closed','archived')),
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  constraint proposals_future_close check (closes_at is null or closes_at > created_at)
);
create table if not exists public.proposal_votes (
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  choice text not null check (choice in ('support','oppose','abstain')),
  updated_at timestamptz not null default now(),
  primary key (proposal_id,user_id)
);
create table if not exists public.ownership_projects (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) between 8 and 160),
  thesis text not null check (length(trim(thesis)) between 30 and 12000),
  category text not null check (category in ('public_company','housing','local_business','community_land','other')),
  stage text not null default 'idea' check (stage in ('idea','research','legal_review','external_execution')),
  created_at timestamptz not null default now()
);
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ownership_projects(id) on delete cascade,
  added_by uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) between 2 and 200),
  url text not null check (url ~ '^https://[^ ]{3,1900}$'),
  notes text not null default '' check (length(notes) <= 1200),
  created_at timestamptz not null default now()
);
create table if not exists public.project_interest (
  project_id uuid not null references public.ownership_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  intent text not null check (intent in ('follow','research','volunteer')),
  created_at timestamptz not null default now(),
  primary key (project_id,user_id)
);
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  community_id uuid not null references public.communities(id) on delete cascade,
  discussion_id uuid references public.discussions(id),
  project_id uuid references public.ownership_projects(id),
  reason text not null check (reason in ('spam','harassment','fraud','misinformation','other')),
  explanation text not null default '' check (length(explanation) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  created_at timestamptz not null default now(),
  constraint reported_one_item check (num_nonnulls(discussion_id,project_id)=1)
);
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  issued_by uuid not null references public.profiles(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  max_uses integer not null default 10 check(max_uses between 1 and 100),
  uses integer not null default 0 check(uses>=0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_discussions_feed on public.discussions(community_id,created_at desc);
create index if not exists idx_proposals_feed on public.proposals(community_id,created_at desc);
create index if not exists idx_projects_feed on public.ownership_projects(community_id,created_at desc);
create index if not exists idx_memberships_user on public.memberships(user_id);
create index if not exists idx_proposal_votes on public.proposal_votes(proposal_id);

-- SECURITY DEFINER read helper avoids recursive membership RLS.
create or replace function public.is_member(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m where m.community_id=cid and m.user_id=uid);
$$;
create or replace function public.is_moderator(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m
    where m.community_id=cid and m.user_id=uid and m.role in ('owner','moderator'));
$$;
create or replace function public.can_view_community(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.communities c where c.id=cid
    and (c.visibility='public' or public.is_member(cid,uid)));
$$;
revoke all on function public.is_member(uuid,uuid) from public;
revoke all on function public.is_moderator(uuid,uuid) from public;
revoke all on function public.can_view_community(uuid,uuid) from public;
grant execute on function public.is_member(uuid,uuid) to authenticated,anon;
grant execute on function public.is_moderator(uuid,uuid) to authenticated,anon;
grant execute on function public.can_view_community(uuid,uuid) to authenticated,anon;

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.memberships enable row level security;
alter table public.discussions enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_votes enable row level security;
alter table public.ownership_projects enable row level security;
alter table public.sources enable row level security;
alter table public.project_interest enable row level security;
alter table public.content_reports enable row level security;
alter table public.invites enable row level security;

create policy "profiles publicly visible" on public.profiles for select using(true);
create policy "profiles editable by owner" on public.profiles for update to authenticated
 using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy "public communities discoverable; private members only" on public.communities for select
 using(visibility='public' or public.is_member(id,(select auth.uid())));
create policy "member creates community" on public.communities for insert to authenticated
 with check(created_by=(select auth.uid()));
create policy "owner edits community" on public.communities for update to authenticated
 using(created_by=(select auth.uid())) with check(created_by=(select auth.uid()));
create policy "members of visible communities" on public.memberships for select
 using(public.can_view_community(community_id,(select auth.uid())));
-- Membership creation/deletion occurs in controlled functions only.
create policy "read group discussions" on public.discussions for select
 using(public.can_view_community(community_id,(select auth.uid())) and deleted_at is null);
create policy "members publish discussions" on public.discussions for insert to authenticated
 with check(author_id=(select auth.uid()) and public.is_member(community_id,(select auth.uid())));
create policy "authors edit discussions" on public.discussions for update to authenticated
 using(author_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())))
 with check(author_id=(select auth.uid()));
create policy "read group proposals" on public.proposals for select
 using(public.can_view_community(community_id,(select auth.uid())));
create policy "members publish proposals" on public.proposals for insert to authenticated
 with check(author_id=(select auth.uid()) and public.is_member(community_id,(select auth.uid())));
create policy "authors and moderators edit proposals" on public.proposals for update to authenticated
 using(author_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())))
 with check(author_id=(select auth.uid()));
create policy "read only own vote" on public.proposal_votes for select to authenticated
 using(user_id=(select auth.uid()));
create policy "vote on open community proposals" on public.proposal_votes for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(
 select 1 from public.proposals p where p.id=proposal_id and p.status='open'
 and (p.closes_at is null or p.closes_at>now()) and public.is_member(p.community_id,(select auth.uid()))));
create policy "change vote on open proposal" on public.proposal_votes for update to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and exists(
 select 1 from public.proposals p where p.id=proposal_id and p.status='open'
 and (p.closes_at is null or p.closes_at>now()) and public.is_member(p.community_id,(select auth.uid()))));
create policy "read research projects" on public.ownership_projects for select
 using(public.can_view_community(community_id,(select auth.uid())));
create policy "members create research projects" on public.ownership_projects for insert to authenticated
 with check(author_id=(select auth.uid()) and public.is_member(community_id,(select auth.uid())));
create policy "authors edit research projects" on public.ownership_projects for update to authenticated
 using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
create policy "read research sources" on public.sources for select
 using(exists(select 1 from public.ownership_projects p where p.id=project_id
 and public.can_view_community(p.community_id,(select auth.uid()))));
create policy "members attach sources" on public.sources for insert to authenticated
 with check(added_by=(select auth.uid()) and exists(select 1 from public.ownership_projects p
 where p.id=project_id and public.is_member(p.community_id,(select auth.uid()))));
create policy "members see project interest" on public.project_interest for select to authenticated
 using(exists(select 1 from public.ownership_projects p where p.id=project_id
 and public.is_member(p.community_id,(select auth.uid()))));
create policy "members register nonfinancial interest" on public.project_interest for insert to authenticated
 with check(user_id=(select auth.uid()) and exists(select 1 from public.ownership_projects p
 where p.id=project_id and public.is_member(p.community_id,(select auth.uid()))));
create policy "member removes own interest" on public.project_interest for delete to authenticated
 using(user_id=(select auth.uid()));
create policy "reports readable by reporter or moderator" on public.content_reports for select to authenticated
 using(reporter_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())));
create policy "members report content" on public.content_reports for insert to authenticated
 with check(reporter_id=(select auth.uid()) and public.is_member(community_id,(select auth.uid())));
-- Invites are deliberately inaccessible via direct queries; RPCs below enforce token checks.

-- Automatically provision a minimal profile on signup. No email is exposed publicly.
create or replace function public.new_user_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,handle,display_name)
 values(new.id,'member_'||substr(replace(new.id::text,'-',''),1,17),
   coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'display_name'),80),''),'COMMON member'));
 return new;
end; $$;
drop trigger if exists on_auth_user_created_common on auth.users;
create trigger on_auth_user_created_common after insert on auth.users
 for each row execute function public.new_user_profile();

create or replace function public.add_community_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.memberships(community_id,user_id,role) values(new.id,new.created_by,'owner');
 return new;
end; $$;
drop trigger if exists on_common_community_created on public.communities;
create trigger on_common_community_created after insert on public.communities
 for each row execute function public.add_community_owner();

create or replace function public.join_public_community(cid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not exists(select 1 from public.communities where id=cid and visibility='public') then
  raise exception 'Community unavailable'; end if;
 insert into public.memberships(community_id,user_id,role) values(cid,auth.uid(),'member')
 on conflict(community_id,user_id) do nothing;
end; $$;
revoke all on function public.join_public_community(uuid) from public,anon;
grant execute on function public.join_public_community(uuid) to authenticated;

create or replace function public.create_private_invite(cid uuid, permitted_uses int default 10)
returns text language plpgsql security definer set search_path = '' as $$
declare token text;
begin
 if auth.uid() is null or not public.is_moderator(cid,auth.uid()) then raise exception 'Not authorized'; end if;
 if permitted_uses<1 or permitted_uses>100 then raise exception 'Invalid invite limit'; end if;
 token:=encode(extensions.gen_random_bytes(24),'hex');
 insert into public.invites(community_id,issued_by,token_hash,expires_at,max_uses)
 values(cid,auth.uid(),encode(extensions.digest(token,'sha256'),'hex'),now()+interval '7 days',permitted_uses);
 return token;
end; $$;
revoke all on function public.create_private_invite(uuid,int) from public,anon;
grant execute on function public.create_private_invite(uuid,int) to authenticated;

create or replace function public.accept_private_invite(token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invite_rec public.invites%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if token !~ '^[a-f0-9]{48}$' then raise exception 'Invalid invite'; end if;
 select * into invite_rec from public.invites
 where token_hash=encode(extensions.digest(token,'sha256'),'hex')
 and revoked_at is null and expires_at>now() and uses<max_uses for update;
 if not found then raise exception 'Invite unavailable'; end if;
 if exists(select 1 from public.memberships
   where community_id=invite_rec.community_id and user_id=auth.uid()) then
  return invite_rec.community_id;
 end if;
 insert into public.memberships(community_id,user_id,role)
 values(invite_rec.community_id,auth.uid(),'member');
 update public.invites set uses=uses+1 where id=invite_rec.id;
 return invite_rec.community_id;
end; $$;
revoke all on function public.accept_private_invite(text) from public,anon;
grant execute on function public.accept_private_invite(text) to authenticated;

create or replace function public.proposal_tally(pid uuid)
returns table(choice text, tally bigint) language sql stable security definer set search_path = '' as $$
 select v.choice,count(*) from public.proposal_votes v
 join public.proposals p on p.id=v.proposal_id
 where v.proposal_id=pid and public.can_view_community(p.community_id,auth.uid())
 group by v.choice;
$$;
revoke all on function public.proposal_tally(uuid) from public;
grant execute on function public.proposal_tally(uuid) to authenticated,anon;
