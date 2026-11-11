-- COMMON SOCIAL MODULES | requires initial community_core migration.
-- Run only in a Supabase project after reviewing and testing role isolation.
create table if not exists public.post_reactions (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(discussion_id,user_id)
);
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check(length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists public.direct_conversations(
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists public.direct_participants(
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create table if not exists public.direct_messages(
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check(length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table if not exists public.user_watchlists(
  user_id uuid not null references public.profiles(id) on delete cascade,
  ticker text not null check(ticker ~ '^[A-Z][A-Z0-9.-]{0,10}$'),
  created_at timestamptz not null default now(),
  primary key(user_id,ticker)
);
create table if not exists public.notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  category text not null check(category in ('invite','reply','mention','proposal','announcement')),
  headline text not null check(length(headline) between 4 and 160),
  link_path text check(link_path is null or (link_path ~ '^/[a-zA-Z0-9/_-]{1,300}$')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_group_messages on public.group_messages(community_id,created_at desc);
create index if not exists idx_direct_messages on public.direct_messages(conversation_id,created_at desc);
create index if not exists idx_notifications on public.notifications(user_id,created_at desc);
create index if not exists idx_reactions_discussion on public.post_reactions(discussion_id);

alter table public.post_reactions enable row level security;
alter table public.group_messages enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.direct_participants enable row level security;
alter table public.direct_messages enable row level security;
alter table public.user_watchlists enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_direct_participant(cid uuid,uid uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.direct_participants p
 where p.conversation_id=cid and p.user_id=uid);
$$;
revoke all on function public.is_direct_participant(uuid,uuid) from public;
grant execute on function public.is_direct_participant(uuid,uuid) to authenticated;
create policy "member can read reactions" on public.post_reactions for select to authenticated
 using(exists(select 1 from public.discussions d where d.id=discussion_id
 and public.can_view_community(d.community_id,auth.uid())));
create policy "member can like one discussion" on public.post_reactions for insert to authenticated
 with check(user_id=auth.uid() and exists(select 1 from public.discussions d
 where d.id=discussion_id and public.is_member(d.community_id,auth.uid()) and d.deleted_at is null));
create policy "own reaction remove" on public.post_reactions for delete to authenticated
 using(user_id=auth.uid());
create policy "group members can read chat" on public.group_messages for select to authenticated
 using(public.is_member(community_id,auth.uid()) and deleted_at is null);
create policy "group members can send chat" on public.group_messages for insert to authenticated
 with check(sender_id=auth.uid() and public.is_member(community_id,auth.uid()) and deleted_at is null);
create policy "direct conversations visible to participants" on public.direct_conversations for select to authenticated
 using(public.is_direct_participant(id,auth.uid()));
create policy "participants visible to participants" on public.direct_participants for select to authenticated
 using(public.is_direct_participant(conversation_id,auth.uid()));
create policy "direct chat visible to participants" on public.direct_messages for select to authenticated
 using(public.is_direct_participant(conversation_id,auth.uid()) and deleted_at is null);
create policy "direct chat send by participant" on public.direct_messages for insert to authenticated
 with check(sender_id=auth.uid() and public.is_direct_participant(conversation_id,auth.uid()) and deleted_at is null);
create policy "read own watchlist" on public.user_watchlists for select to authenticated
 using(user_id=auth.uid());
create policy "add own watchlist" on public.user_watchlists for insert to authenticated
 with check(user_id=auth.uid());
create policy "remove own watchlist" on public.user_watchlists for delete to authenticated
 using(user_id=auth.uid());
create policy "read own alerts" on public.notifications for select to authenticated
 using(user_id=auth.uid());
create policy "mark alerts read" on public.notifications for update to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Only a privileged function can create a direct conversation and its participant rows.
create or replace function public.open_direct_conversation(other_user uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing uuid;
begin
 if auth.uid() is null or other_user is null or other_user=auth.uid() then
  raise exception 'Invalid participant';
 end if;
 if not exists(select 1 from public.profiles where id=other_user) then
  raise exception 'User unavailable';
 end if;
 select c.id into existing from public.direct_conversations c
 where exists(select 1 from public.direct_participants x where x.conversation_id=c.id and x.user_id=auth.uid())
   and exists(select 1 from public.direct_participants y where y.conversation_id=c.id and y.user_id=other_user)
   and (select count(*) from public.direct_participants z where z.conversation_id=c.id)=2
 order by c.created_at asc limit 1;
 if existing is not null then return existing; end if;
 insert into public.direct_conversations(created_by) values(auth.uid()) returning id into existing;
 insert into public.direct_participants(conversation_id,user_id) values(existing,auth.uid()),(existing,other_user);
 return existing;
end; $$;
revoke all on function public.open_direct_conversation(uuid) from public,anon;
grant execute on function public.open_direct_conversation(uuid) to authenticated;

-- Prevent replies in the wrong community and never permit reply nesting loops.
create or replace function public.validate_discussion_parent()
returns trigger language plpgsql security definer set search_path='' as $$
declare parent_community uuid;
begin
 if new.parent_id is not null then
  if new.id=new.parent_id then raise exception 'Cannot reply to self'; end if;
  select community_id into parent_community from public.discussions where id=new.parent_id and deleted_at is null;
  if parent_community is null or parent_community <> new.community_id then
    raise exception 'Reply must belong to the same community';
  end if;
 end if;
 return new;
end; $$;
drop trigger if exists common_validate_discussion_parent on public.discussions;
create trigger common_validate_discussion_parent before insert or update on public.discussions
 for each row execute function public.validate_discussion_parent();

-- Real-time replication: enable only after reviewing traffic, quotas, and member privacy.
-- Private group channels must be authenticated and membership-scoped.
