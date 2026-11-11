-- COMMON: member interactions, message privacy, and community controls.
-- Requires migration 20261111000100_community_core.sql.
create table if not exists public.discussion_likes (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(discussion_id,user_id)
);
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check(length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists community_messages_feed_idx on public.community_messages(community_id,created_at desc);
create table if not exists public.member_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id),
  constraint cannot_block_self check(blocker_id<>blocked_id)
);
alter table public.profiles add column if not exists allow_direct_messages boolean not null default false;
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  body text not null check(length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  constraint no_message_to_self check(sender_id<>recipient_id)
);
create index if not exists direct_messages_to_idx on public.direct_messages(recipient_id,created_at desc);
create index if not exists direct_messages_from_idx on public.direct_messages(sender_id,created_at desc);

alter table public.discussion_likes enable row level security;
alter table public.community_messages enable row level security;
alter table public.member_blocks enable row level security;
alter table public.direct_messages enable row level security;

create policy "see discussion reactions in visible groups"
on public.discussion_likes for select to authenticated
using(exists(select 1 from public.discussions d where d.id=discussion_id
 and public.can_view_community(d.community_id,(select auth.uid())) and d.deleted_at is null));
create policy "like discussions as member" on public.discussion_likes for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.discussions d
 where d.id=discussion_id and d.deleted_at is null and public.is_member(d.community_id,(select auth.uid()))));
create policy "remove own likes" on public.discussion_likes for delete to authenticated
using(user_id=(select auth.uid()));
create policy "group members can read chat" on public.community_messages for select to authenticated
using(public.is_member(community_id,(select auth.uid())) and deleted_at is null);
create policy "group members can write chat" on public.community_messages for insert to authenticated
with check(author_id=(select auth.uid()) and public.is_member(community_id,(select auth.uid())));
create policy "chat author or moderator can soft delete" on public.community_messages for update to authenticated
using(author_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())))
with check(author_id=(select auth.uid()));
create policy "see own blocking list" on public.member_blocks for select to authenticated
using(blocker_id=(select auth.uid()));
create policy "block another user" on public.member_blocks for insert to authenticated
with check(blocker_id=(select auth.uid()));
create policy "unblock user" on public.member_blocks for delete to authenticated
using(blocker_id=(select auth.uid()));
create policy "DM participant can read" on public.direct_messages for select to authenticated
using((sender_id=(select auth.uid()) or recipient_id=(select auth.uid())) and
 not exists(select 1 from public.member_blocks b where
 (b.blocker_id=(select auth.uid()) and b.blocked_id=case when sender_id=(select auth.uid()) then recipient_id else sender_id end)));
-- DM recipients must opt in, both parties share a community, and neither has blocked the other.
create policy "only opted in mutual members can DM"
on public.direct_messages for insert to authenticated
with check(sender_id=(select auth.uid())
 and exists(select 1 from public.profiles p where p.id=recipient_id and p.allow_direct_messages=true)
 and exists(select 1 from public.memberships a join public.memberships b
 on a.community_id=b.community_id where a.user_id=sender_id and b.user_id=recipient_id)
 and not exists(select 1 from public.member_blocks b where
 (b.blocker_id=sender_id and b.blocked_id=recipient_id)
 or (b.blocker_id=recipient_id and b.blocked_id=sender_id)));

-- SECURITY DEFINER functions with only the caller identity (not arbitrary user ids)
-- keep membership changes and rate-sensitive actions in the database.
create or replace function public.leave_community(cid uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if exists(select 1 from public.memberships where community_id=cid
  and user_id=auth.uid() and role='owner') then
   raise exception 'Transfer community ownership before leaving'; end if;
 delete from public.memberships where community_id=cid and user_id=auth.uid();
end; $$;
revoke all on function public.leave_community(uuid) from public,anon;
grant execute on function public.leave_community(uuid) to authenticated;

-- Restrict abuse with a per-author minimum interval. Each policy is server-side.
create or replace function public.throttle_community_write()
returns trigger language plpgsql security definer set search_path='' as $$
declare last_time timestamptz; interval_required interval;
begin
 if tg_table_name='community_messages' then
  interval_required:=interval '2 seconds';
  select max(created_at) into last_time from public.community_messages where author_id=new.author_id;
 elsif tg_table_name='discussions' then
  interval_required:=interval '10 seconds';
  select max(created_at) into last_time from public.discussions where author_id=new.author_id;
 else return new; end if;
 if last_time is not null and last_time>now()-interval_required then
  raise exception 'Please wait before posting again';
 end if;
 return new;
end; $$;
drop trigger if exists common_messages_throttle on public.community_messages;
create trigger common_messages_throttle before insert on public.community_messages
for each row execute function public.throttle_community_write();
drop trigger if exists common_discussions_throttle on public.discussions;
create trigger common_discussions_throttle before insert on public.discussions
for each row execute function public.throttle_community_write();

-- Messages can be read through realtime subscriptions, but explicit publication
-- enablement is left to the project owner after RLS integration tests.
