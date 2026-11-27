begin;

-- A versioned draft slot per member. An empty slot retains its revision to
-- prevent an offline device from resurrecting a discarded or published draft.
create table public.discussion_drafts (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  circle_id uuid references public.communities(id) on delete set null,
  title text not null check (length(title) <= 160),
  body text not null check (length(body) <= 10000),
  revision bigint not null check (revision between 1 and 9007199254740991),
  last_published_id uuid,
  updated_at timestamptz not null default now()
);

create index discussion_drafts_circle_idx on public.discussion_drafts (circle_id)
  where circle_id is not null;

alter table public.discussion_drafts enable row level security;
revoke all on public.discussion_drafts from public, anon, authenticated;
grant select, insert, update on public.discussion_drafts to authenticated;
create policy discussion_drafts_read_own on public.discussion_drafts
  for select to authenticated using (owner_id = (select auth.uid()));
create policy discussion_drafts_create_own on public.discussion_drafts
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and (
      circle_id is null or public.is_member(circle_id, (select auth.uid()))
    )
  );
create policy discussion_drafts_change_own on public.discussion_drafts
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid()) and (
      circle_id is null or public.is_member(circle_id, (select auth.uid()))
    )
  );

create function public.read_discussion_draft_v1()
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select to_jsonb(d) from public.discussion_drafts d where d.owner_id = (select auth.uid());
$$;

create function public.save_discussion_draft_v1(
  expected_revision bigint, target_circle uuid, draft_title text, draft_body text
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  saved public.discussion_drafts;
begin
  if viewer is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if expected_revision is null or expected_revision < 0 or draft_title is null
     or draft_body is null or length(draft_title) > 160 or length(draft_body) > 10000 then
    raise exception 'Invalid draft content or revision' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.discussion_drafts (owner_id, circle_id, title, body, revision)
    values (viewer, target_circle, draft_title, draft_body, 1)
    on conflict (owner_id) do nothing
    returning * into saved;
  else
    update public.discussion_drafts d set circle_id = target_circle, title = draft_title,
      body = draft_body, revision = d.revision + 1, updated_at = now()
    where d.owner_id = viewer and d.revision = expected_revision
    returning * into saved;
  end if;
  if saved.owner_id is null then
    raise exception 'Draft revision changed' using errcode = '40001';
  end if;
  return to_jsonb(saved);
end;
$$;

create function public.publish_discussion_draft_v1(expected_revision bigint, submission_id uuid)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  current_draft public.discussion_drafts;
begin
  if viewer is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if submission_id is null or expected_revision is null or expected_revision < 1 then
    raise exception 'Invalid draft revision or submission' using errcode = '22023';
  end if;
  select * into current_draft from public.discussion_drafts
  where owner_id = viewer for update;

  -- A lost network response can retry the exact submission without repeating
  -- insertion triggers or publishing a later draft.
  if current_draft.last_published_id = submission_id and exists (
    select 1 from public.discussions where id = submission_id and author_id = viewer
  ) then return submission_id; end if;

  if current_draft.revision is distinct from expected_revision then
    raise exception 'Draft revision changed' using errcode = '40001';
  end if;
  if not exists (
    select 1 from public.memberships m
    where m.user_id = viewer and m.community_id = current_draft.circle_id
  ) then
    raise exception 'Current circle membership required' using errcode = '42501';
  end if;
  if length(btrim(current_draft.title)) not between 8 and 160
     or length(btrim(current_draft.body)) not between 3 and 10000 then
    raise exception 'Invalid discussion title or body' using errcode = '22023';
  end if;
  insert into public.discussions(id, community_id, author_id, title, body)
  values (submission_id, current_draft.circle_id, viewer,
    btrim(current_draft.title), btrim(current_draft.body));
  update public.discussion_drafts set circle_id = null, title = '', body = '',
    revision = revision + 1, last_published_id = submission_id, updated_at = now()
  where owner_id = viewer;
  return submission_id;
end;
$$;

revoke all on function public.read_discussion_draft_v1(),
  public.save_discussion_draft_v1(bigint, uuid, text, text),
  public.publish_discussion_draft_v1(bigint, uuid) from public, anon, authenticated;
grant execute on function public.read_discussion_draft_v1(),
  public.save_discussion_draft_v1(bigint, uuid, text, text),
  public.publish_discussion_draft_v1(bigint, uuid) to authenticated;

commit;
