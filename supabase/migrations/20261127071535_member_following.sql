begin;

create table public.member_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);

-- The primary key supports lookups and seeking by followed member.
create index member_follows_reverse_idx on public.member_follows(followed_id, follower_id);

alter table public.member_follows enable row level security;
revoke all on public.member_follows from public, anon, authenticated;
grant select, insert, delete on public.member_follows to authenticated;

create policy member_follows_read on public.member_follows
  for select to authenticated
  using (
    (select auth.uid()) in (follower_id, followed_id)
    and not public.dm_block_exists(follower_id, followed_id)
  );

create policy member_follows_insert on public.member_follows
  for insert to authenticated
  with check (
    (select auth.uid()) = follower_id
    and not public.dm_block_exists(follower_id, followed_id)
  );

create policy member_follows_delete on public.member_follows
  for delete to authenticated using ((select auth.uid()) = follower_id);

-- Extend the existing feed so all scopes share visibility and cursor semantics.
create or replace function public.discussion_feed_v1(
  feed_scope text,
  scope_id uuid default null,
  saved_ids uuid[] default null,
  before_time timestamptz default null,
  before_id uuid default null,
  page_size integer default 25
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  viewer uuid := auth.uid();
  result jsonb;
begin
  if viewer is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if feed_scope is null or feed_scope not in ('mine', 'discover', 'circle', 'member', 'saved', 'replies', 'following')
     or (feed_scope in ('circle', 'member', 'replies')) <> (scope_id is not null)
     or (feed_scope = 'saved') <> (saved_ids is not null)
     or coalesce(cardinality(saved_ids), 0) > 500
     or (before_time is null) <> (before_id is null)
     or (before_time is not null and not isfinite(before_time))
     or page_size is null or page_size < 1 or page_size > 50 then
    raise exception 'Invalid feed scope, cursor, or page size' using errcode = '22023';
  end if;

  -- A readable child alone does not grant access to a hidden parent. Both
  -- the parent and its community must pass the current caller's policies.
  if feed_scope = 'replies' and not exists (
    select 1 from public.discussions parent
    join public.communities circle on circle.id = parent.community_id
    where parent.id = scope_id
      and not public.dm_block_exists(viewer, parent.author_id)
  ) then
    return '{"items":[],"next":null}'::jsonb;
  end if;

  with candidates as materialized (
    select d.id, d.community_id, d.author_id, d.parent_id, d.title, d.body, d.created_at
      from public.discussions d
      where d.deleted_at is null
        and (
          (feed_scope = 'replies' and d.parent_id = scope_id)
          or (feed_scope <> 'replies' and d.parent_id is null)
        )
        and (d.created_at, d.id) < (
          coalesce(before_time, 'infinity'::timestamptz),
          coalesce(before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
        )
        and (
          (feed_scope = 'mine' and exists (
            select 1 from public.memberships m
            where m.user_id = viewer and m.community_id = d.community_id
          ))
          or (feed_scope = 'following' and exists (
            select 1 from public.member_follows f
            where f.follower_id = viewer and f.followed_id = d.author_id
          ))
          or feed_scope in ('discover', 'replies')
          or (feed_scope = 'circle' and d.community_id = scope_id)
          or (feed_scope = 'member' and d.author_id = scope_id)
          or (feed_scope = 'saved' and d.id = any(saved_ids))
        )
        and exists (
          select 1 from public.communities c
          where c.id = d.community_id and (feed_scope <> 'discover' or c.visibility = 'public')
        )
        and not public.dm_block_exists(viewer, d.author_id)
      order by d.created_at desc, d.id desc
      limit page_size + 1
  ), items as materialized (
    select * from candidates order by created_at desc, id desc limit page_size
  )
  select jsonb_build_object(
    'items', coalesce(jsonb_agg(
      to_jsonb(i) || jsonb_build_object(
        'author_name', author.display_name,
        'community_name', circle.name,
        'liked', case when feed_scope = 'replies' then false else exists (
          select 1 from public.discussion_likes l where l.discussion_id = i.id and l.user_id = viewer
        ) end,
        'likes_count', case when feed_scope = 'replies' then 0 else (
          select count(*) from (
            select 1 from public.discussion_likes l where l.discussion_id = i.id limit 100
          ) reactions
        ) end,
        'replies_count', case when feed_scope = 'replies' then 0 else (
          select count(*) from (
            select 1 from public.discussions reply
            where reply.parent_id = i.id and reply.deleted_at is null
              and not public.dm_block_exists(viewer, reply.author_id)
            limit 100
          ) replies
        ) end
      ) order by i.created_at desc, i.id desc
    ), '[]'::jsonb),
    'next', case when (select count(*) from candidates) > page_size then (
      select jsonb_build_object('before_time', last.created_at, 'before_id', last.id)
      from items last order by last.created_at, last.id limit 1
    ) end
  ) into result
  from items i
  join public.profiles author on author.id = i.author_id
  join public.communities circle on circle.id = i.community_id;

  return result;
end;
$$;

commit;
