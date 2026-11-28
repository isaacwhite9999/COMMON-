begin;

create table public.canvas_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index canvas_documents_owner_updated on public.canvas_documents (owner_id, updated_at desc, id desc);

create table public.canvas_revisions (
  document_id uuid not null,
  owner_id uuid not null,
  revision integer not null check (revision > 0),
  source_digest text not null check (source_digest ~ '^[0-9a-f]{64}$'),
  spec jsonb not null,
  created_at timestamptz not null default now(),
  primary key (document_id, revision),
  foreign key (document_id, owner_id) references public.canvas_documents (id, owner_id) on delete cascade
);

alter table public.canvas_documents enable row level security;
alter table public.canvas_revisions enable row level security;
revoke all on public.canvas_documents, public.canvas_revisions from public, anon, authenticated;
grant select on public.canvas_documents, public.canvas_revisions to authenticated;
create policy canvas_own_documents on public.canvas_documents for select to authenticated
  using (owner_id = (select auth.uid()));
create policy canvas_own_revisions on public.canvas_revisions for select to authenticated
  using (owner_id = (select auth.uid()));

create function private.valid_canvas_spec(payload jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  required_fields text[];
  field_name text;
  availability jsonb;
  instant text;
begin
  if payload is null or pg_catalog.octet_length(payload::text) > 3000
    or pg_catalog.jsonb_typeof(payload) <> 'object'
    or payload->'version' is distinct from '1'::jsonb
    or pg_catalog.jsonb_typeof(payload->'chart') is distinct from 'string'
    or pg_catalog.jsonb_typeof(payload->'title') is distinct from 'string'
    or pg_catalog.length(pg_catalog.btrim(payload->>'title')) not between 1 and 120 then return false;
  end if;
  required_fields := case payload->>'chart'
    when 'line' then array['x','y'] when 'scatter' then array['x','y'] when 'waterfall' then array['x','y']
    when 'histogram' then array['y'] when 'box' then array['y'] when 'violin' then array['y']
    when 'candlestick' then array['x','open','high','low','close']
    when 'heatmap' then array['x','y','z'] when 'contour' then array['x','y','z']
    when 'surface' then array['x','y','z'] end;
  if required_fields is null or exists (select 1 from pg_catalog.jsonb_object_keys(payload) as key
    where key <> all (required_fields || array['chart','version','title','availability'])) then return false;
  end if;
  foreach field_name in array required_fields loop
    if pg_catalog.jsonb_typeof(payload->field_name) is distinct from 'string'
      or pg_catalog.length(pg_catalog.btrim(payload->>field_name)) not between 1 and 100 then return false;
    end if;
  end loop;
  if payload ? 'availability' then
    availability := payload->'availability';
    instant := availability->>'asOf';
    if pg_catalog.jsonb_typeof(availability) is distinct from 'object'
      or pg_catalog.jsonb_typeof(availability->'field') is distinct from 'string'
      or pg_catalog.length(pg_catalog.btrim(availability->>'field')) not between 1 and 100
      or pg_catalog.jsonb_typeof(availability->'asOf') is distinct from 'string'
      or instant !~ '^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d{3})?Z$' then return false;
    end if;
    if availability - array['asOf','field'] <> '{}'::jsonb then return false; end if;
    perform instant::timestamptz;
  end if;
  return true;
exception when invalid_datetime_format or datetime_field_overflow then
  return false;
end;
$$;

-- The only write path enforces quotas, ownership and compare-and-swap.
create function private.save_canvas_document(target uuid, expected integer, digest text, payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
  identifier uuid;
  next_revision integer;
begin
  if viewer is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if digest is null or digest !~ '^[0-9a-f]{64}$' or not private.valid_canvas_spec(payload)
    or expected is null or expected < 0 or (target is null) <> (expected = 0) then
    raise exception 'Invalid Canvas document or specification' using errcode = '22023';
  end if;
  if target is null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('canvas/' || viewer::text, 0));
    if (select count(*) from public.canvas_documents where owner_id = viewer) >= 30 then
      raise exception 'Canvas account document limit reached' using errcode = '54000';
    end if;
    insert into public.canvas_documents(owner_id, title, revision)
      values(viewer, payload->>'title', 1) returning id into identifier;
    next_revision := 1;
  else
    update public.canvas_documents set title = payload->>'title', revision = revision + 1, updated_at = now()
      where id = target and owner_id = viewer and revision = expected returning id, revision into identifier, next_revision;
    if identifier is null then
      raise exception 'Canvas document is unavailable or changed' using errcode = '40001';
    end if;
  end if;
  insert into public.canvas_revisions(document_id, owner_id, revision, source_digest, spec)
    values(identifier, viewer, next_revision, digest, payload);
  delete from public.canvas_revisions where document_id = identifier and revision <= next_revision - 10;
  return identifier;
end;
$$;

create function private.delete_canvas_document(target uuid, expected integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.canvas_documents where id = target and owner_id = viewer and revision = expected;
  return found;
end;
$$;

create function public.save_canvas_document_v1(target uuid, expected integer, digest text, payload jsonb)
returns uuid language sql security invoker set search_path = '' as $$
  select private.save_canvas_document(target, expected, digest, payload);
$$;
create function public.delete_canvas_document_v1(target uuid, expected integer)
returns boolean language sql security invoker set search_path = '' as $$
  select private.delete_canvas_document(target, expected);
$$;

revoke all on function private.valid_canvas_spec(jsonb),
  private.save_canvas_document(uuid, integer, text, jsonb), private.delete_canvas_document(uuid, integer),
  public.save_canvas_document_v1(uuid, integer, text, jsonb), public.delete_canvas_document_v1(uuid, integer)
  from public, anon, authenticated;
grant execute on function private.save_canvas_document(uuid, integer, text, jsonb),
  private.delete_canvas_document(uuid, integer), public.save_canvas_document_v1(uuid, integer, text, jsonb),
  public.delete_canvas_document_v1(uuid, integer) to authenticated;
commit;
