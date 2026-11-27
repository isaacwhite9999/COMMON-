begin;

create function public.publish_research_draft_v1(
  draft_id uuid, circle_id uuid, discussion_title text, discussion_body text
) returns uuid
language plpgsql security invoker set search_path = pg_catalog, pg_temp
as $$
declare
  member_id uuid := auth.uid();
  recorded_id uuid;
begin
  if member_id is null or not exists (
    select 1 from public.communities c
    join public.memberships m on m.community_id = c.id
    where c.id = circle_id and c.visibility = 'private' and m.user_id = member_id
  ) then
    raise exception 'Current private circle membership required' using errcode = '42501';
  end if;

  if draft_id is null or discussion_title is null or length(btrim(discussion_title)) not between 8 and 160
    or discussion_body is null or length(btrim(discussion_body)) not between 3 and 10000 then
    raise exception 'Invalid discussion title or summary' using errcode = '22023';
  end if;

  -- Serialize identical draft IDs and check for an existing submission before
  -- running insertion triggers, including the ordinary discussion write throttle.
  perform pg_advisory_xact_lock(hashtextextended(draft_id::text, 0));
  if exists (select 1 from public.discussions d where d.id = draft_id) then
    if exists (
      select 1 from public.discussions d
      where d.id = draft_id and d.community_id = circle_id and d.author_id = member_id
        and d.parent_id is null and d.deleted_at is null
        and d.title = btrim(discussion_title) and d.body = btrim(discussion_body)
    ) then return draft_id; end if;
  else
    insert into public.discussions (id, community_id, author_id, title, body)
    values (draft_id, circle_id, member_id, btrim(discussion_title), btrim(discussion_body))
    on conflict (id) do nothing
    returning id into recorded_id;

    if recorded_id is not null then return recorded_id; end if;
  end if;

  raise exception 'Research draft could not be matched to a previous submission' using errcode = '23505';
end;
$$;

revoke all on function public.publish_research_draft_v1(uuid, uuid, text, text) from public, anon;
grant execute on function public.publish_research_draft_v1(uuid, uuid, text, text) to authenticated;

commit;
