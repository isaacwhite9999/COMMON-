begin;

alter table public.direct_messages add column deleted_at timestamptz;
alter table public.direct_messages add column deleted_by uuid references public.profiles(id) on delete set null;
alter table public.community_messages add column deleted_by uuid references public.profiles(id) on delete set null;

-- Keep existing author body corrections subject to moderation triggers. Only
-- the scoped deletion path can change deletion or identity metadata.
revoke update, delete on public.direct_messages, public.community_messages from public, anon, authenticated;
grant update (body) on public.community_messages to authenticated;
drop policy "chat author or moderator can soft delete" on public.community_messages;
create policy "chat authors can correct visible message bodies"
  on public.community_messages for update to authenticated
  using (author_id=(select auth.uid()) and deleted_at is null and public.is_member(community_id,(select auth.uid())))
  with check (author_id=(select auth.uid()) and deleted_at is null and public.is_member(community_id,(select auth.uid())));

alter policy "DM participant can read" on public.direct_messages using (
  deleted_at is null
  and (sender_id=(select auth.uid()) or recipient_id=(select auth.uid()))
  and not public.dm_block_exists(sender_id,recipient_id)
  and (private.moderation_visible('direct_message',id) or sender_id=(select auth.uid()))
);

-- Deleted messages are invisible to readers, so a narrowly scoped definer
-- performs the transition. Both message types use an existing UUID lookup.
create function private.delete_chat_message(message_kind text, message_id uuid)
returns boolean
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  case message_kind
    when 'direct' then
      update public.direct_messages
      set deleted_at=now(), deleted_by=actor
      where id=message_id and sender_id=actor and deleted_at is null;
    when 'circle' then
      update public.community_messages
      set deleted_at=now(), deleted_by=actor
      where id=message_id and deleted_at is null
        and public.is_member(community_id,actor)
        and (author_id=actor or public.is_moderator(community_id,actor));
    else
      raise exception 'Invalid chat message kind' using errcode='22023';
  end case;
  return found;
end;
$$;

create function public.delete_chat_message_v1(message_kind text, message_id uuid)
returns boolean language sql security invoker set search_path='' as $$
  select private.delete_chat_message(message_kind,message_id);
$$;
revoke all on function private.delete_chat_message(text,uuid), public.delete_chat_message_v1(text,uuid)
  from public, anon, authenticated;
grant execute on function private.delete_chat_message(text,uuid), public.delete_chat_message_v1(text,uuid)
  to authenticated;

commit;
