-- COMMON community production hardening.
-- Minimize RPC privilege; keep only intentionally callable endpoints.
-- Deny arbitrary users from probing other people's membership or block relationships.
create or replace function public.is_member(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select uid is not null and uid = auth.uid() and exists(
    select 1 from public.memberships m
    where m.community_id = cid and m.user_id = auth.uid());
$$;
create or replace function public.is_moderator(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select uid is not null and uid = auth.uid() and exists(
    select 1 from public.memberships m where m.community_id=cid
    and m.user_id=auth.uid() and m.role in ('owner','moderator'));
$$;
create or replace function public.can_view_community(cid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(
   select 1 from public.communities c where c.id=cid
   and (c.visibility='public'
     or (uid is not null and uid=auth.uid() and public.is_member(cid,auth.uid())))
 );
$$;
create or replace function public.dm_block_exists(sender uuid, recipient uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null
   and auth.uid() in (sender,recipient)
   and exists(select 1 from public.member_blocks b where
     (b.blocker_id=sender and b.blocked_id=recipient)
     or (b.blocker_id=recipient and b.blocked_id=sender));
$$;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- Explicitly revoke that inherited access on all definer RPCs and triggers.
revoke all on function public.is_member(uuid,uuid) from public,anon,authenticated;
revoke all on function public.is_moderator(uuid,uuid) from public,anon,authenticated;
revoke all on function public.can_view_community(uuid,uuid) from public,anon,authenticated;
revoke all on function public.dm_block_exists(uuid,uuid) from public,anon,authenticated;
revoke all on function public.can_send_dm(uuid) from public,anon,authenticated;
revoke all on function public.proposal_tally(uuid) from public,anon,authenticated;
revoke all on function public.join_public_community(uuid) from public,anon,authenticated;
revoke all on function public.leave_community(uuid) from public,anon,authenticated;
revoke all on function public.create_private_invite(uuid,int) from public,anon,authenticated;
revoke all on function public.accept_private_invite(text) from public,anon,authenticated;
revoke all on function public.add_community_owner() from public,anon,authenticated;
revoke all on function public.new_user_profile() from public,anon,authenticated;
revoke all on function public.enforce_community_record_integrity() from public,anon,authenticated;
revoke all on function public.enforce_report_context() from public,anon,authenticated;
revoke all on function public.throttle_community_write() from public,anon,authenticated;

-- Legitimate authenticated member RPCs and RLS policy helper evaluation.
grant execute on function public.is_member(uuid,uuid) to authenticated;
grant execute on function public.is_moderator(uuid,uuid) to authenticated;
grant execute on function public.can_view_community(uuid,uuid) to authenticated,anon;
grant execute on function public.dm_block_exists(uuid,uuid) to authenticated;
grant execute on function public.can_send_dm(uuid) to authenticated;
grant execute on function public.proposal_tally(uuid) to authenticated;
grant execute on function public.join_public_community(uuid) to authenticated;
grant execute on function public.leave_community(uuid) to authenticated;
grant execute on function public.create_private_invite(uuid,int) to authenticated;
grant execute on function public.accept_private_invite(text) to authenticated;

-- Disallow raw anonymous Data API access to sensitive tables.
revoke all on table public.invites from anon,authenticated;
revoke all on table public.member_blocks from anon;
revoke all on table public.direct_messages from anon;
revoke all on table public.community_messages from anon;
revoke all on table public.memberships from anon;
revoke all on table public.proposal_votes from anon;
revoke all on table public.project_interest from anon;
revoke all on table public.content_reports from anon;
revoke all on table public.watchlist_items from anon;
revoke all on table public.discussion_likes from anon;

-- Membership changes are deliberately only exposed through validated RPCs.
revoke insert,update,delete on table public.memberships from authenticated;
-- Token hashes and use counters must only be visible to definer functions.
revoke all on table public.invites from authenticated;

-- A pending report can be marked reviewed by a group moderator. The
-- reporter retains no update right; a report's association is immutable.
create policy "group moderators review reported items"
on public.content_reports for update to authenticated
using(public.is_moderator(community_id,(select auth.uid())))
with check(public.is_moderator(community_id,(select auth.uid())));
create or replace function public.enforce_report_context()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if tg_op='UPDATE' and (
    new.id<>old.id or new.reporter_id<>old.reporter_id or
    new.community_id<>old.community_id or
    new.created_at<>old.created_at or
    new.discussion_id is distinct from old.discussion_id or
    new.project_id is distinct from old.project_id or
    new.reason<>old.reason or new.explanation<>old.explanation
 ) then raise exception 'Report contents cannot be reassigned'; end if;
 if new.discussion_id is not null and not exists(
   select 1 from public.discussions d
   where d.id=new.discussion_id and d.community_id=new.community_id
 ) then raise exception 'Discussion report community mismatch'; end if;
 if new.project_id is not null and not exists(
   select 1 from public.ownership_projects p
   where p.id=new.project_id and p.community_id=new.community_id
 ) then raise exception 'Project report community mismatch'; end if;
 return new;
end; $$;
drop trigger if exists correct_report_context on public.content_reports;
create trigger correct_report_context before insert or update on public.content_reports
for each row execute function public.enforce_report_context();

-- Explicitly retain non-invokable trigger functions even after replacement.
revoke all on function public.enforce_report_context() from public,anon,authenticated;
