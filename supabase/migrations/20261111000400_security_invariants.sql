-- SECURITY FOLLOW-UP for the live COMMON community.
-- Immutable ownership + association invariants, abuse-resistant reporting,
-- and symmetric block checks for direct messaging.
create or replace function public.enforce_community_record_integrity()
returns trigger language plpgsql security definer set search_path='' as $$
declare parent_group uuid; parent_parent uuid;
begin
 if tg_op='UPDATE' then
  if new.id<>old.id or new.community_id<>old.community_id
     or new.author_id<>old.author_id or new.created_at<>old.created_at then
   raise exception 'Record identity and community cannot be changed';
  end if;
 end if;
 if tg_table_name='discussions' and new.parent_id is not null then
  select d.community_id,d.parent_id into parent_group,parent_parent
  from public.discussions d where d.id=new.parent_id;
  if parent_group is null or parent_group<>new.community_id or parent_parent is not null
  then raise exception 'Reply must belong to a top-level post in the same community'; end if;
 end if;
 return new;
end; $$;
drop trigger if exists keep_discussion_context on public.discussions;
create trigger keep_discussion_context before insert or update on public.discussions
for each row execute function public.enforce_community_record_integrity();
drop trigger if exists keep_proposal_context on public.proposals;
create trigger keep_proposal_context before update on public.proposals
for each row execute function public.enforce_community_record_integrity();
drop trigger if exists keep_project_context on public.ownership_projects;
create trigger keep_project_context before update on public.ownership_projects
for each row execute function public.enforce_community_record_integrity();
drop trigger if exists keep_community_message_context on public.community_messages;
create trigger keep_community_message_context before update on public.community_messages
for each row execute function public.enforce_community_record_integrity();

create or replace function public.enforce_report_context()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.discussion_id is not null and not exists
  (select 1 from public.discussions d
    where d.id=new.discussion_id and d.community_id=new.community_id)
 then raise exception 'Discussion report community mismatch'; end if;
 if new.project_id is not null and not exists
  (select 1 from public.ownership_projects p
    where p.id=new.project_id and p.community_id=new.community_id)
 then raise exception 'Project report community mismatch'; end if;
 return new;
end; $$;
drop trigger if exists correct_report_context on public.content_reports;
create trigger correct_report_context before insert on public.content_reports
for each row execute function public.enforce_report_context();

create or replace function public.dm_block_exists(sender uuid,recipient uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.member_blocks b
   where (b.blocker_id=sender and b.blocked_id=recipient)
      or (b.blocker_id=recipient and b.blocked_id=sender));
$$;
create or replace function public.can_send_dm(recipient uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and auth.uid() <> recipient
   and exists(select 1 from public.profiles p where p.id=recipient and p.allow_direct_messages)
   and exists(select 1 from public.memberships a
     join public.memberships b on b.community_id=a.community_id
     where a.user_id=auth.uid() and b.user_id=recipient)
   and not public.dm_block_exists(auth.uid(),recipient);
$$;
revoke all on function public.dm_block_exists(uuid,uuid) from public,anon;
revoke all on function public.can_send_dm(uuid) from public,anon;
grant execute on function public.dm_block_exists(uuid,uuid) to authenticated;
grant execute on function public.can_send_dm(uuid) to authenticated;
drop policy if exists "DM participant can read" on public.direct_messages;
create policy "DM participant can read" on public.direct_messages for select to authenticated
using((sender_id=(select auth.uid()) or recipient_id=(select auth.uid()))
 and not public.dm_block_exists(sender_id,recipient_id));
drop policy if exists "only opted in mutual members can DM" on public.direct_messages;
create policy "only opted in mutual members can DM" on public.direct_messages for insert to authenticated
with check(sender_id=(select auth.uid()) and public.can_send_dm(recipient_id));

-- UPDATE policies for records with immutable author_id and community_id.
-- Moderators may make a content change only within their community.
drop policy if exists "authors edit discussions" on public.discussions;
create policy "authors edit discussions" on public.discussions for update to authenticated
using(author_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())))
with check(author_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())));
drop policy if exists "authors and moderators edit proposals" on public.proposals;
create policy "authors and moderators edit proposals" on public.proposals for update to authenticated
using(author_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())))
with check(author_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())));
drop policy if exists "chat author or moderator can soft delete" on public.community_messages;
create policy "chat author or moderator can soft delete" on public.community_messages for update to authenticated
using(author_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())))
with check(author_id=(select auth.uid()) or public.is_moderator(community_id,(select auth.uid())));
