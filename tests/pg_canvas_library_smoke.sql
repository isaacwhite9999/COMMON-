begin;
insert into auth.users(id,email) values
  ('94900000-0000-4000-8000-000000000001','canvas-owner@example.test'),
  ('94910000-0000-4000-8000-000000000002','canvas-other@example.test');
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','94900000-0000-4000-8000-000000000001',true);

do $$
declare
  document uuid;
  valid jsonb := '{"version":1,"chart":"line","title":"Canvas fixture","x":"Date","y":"Close","availability":{"field":"Published","asOf":"2025-01-01T15:00:00Z"}}';
  digest text := repeat('a', 64);
  number integer;
begin
  document := public.save_canvas_document_v1(null, 0, digest, valid);
  perform set_config('common.test_canvas_id',document::text,true);
  assert (select title = 'Canvas fixture' from public.canvas_documents where id = document);
  begin
    perform public.save_canvas_document_v1(document, 1, digest, valid || '{"url":"https://example.test"}');
    raise exception 'Unexpected member write';
  exception when invalid_parameter_value then null;
  end;
  begin
    update public.canvas_documents set title = 'Bypass';
    raise exception 'Unexpected member write';
  exception when insufficient_privilege then null;
  end;
  for number in 1..11 loop
    perform public.save_canvas_document_v1(document, number, digest, valid);
  end loop;
  assert (select count(*) = 10 and min(revision) = 3 from public.canvas_revisions where document_id = document);
  begin
    perform public.save_canvas_document_v1(document, 1, digest, valid);
    raise exception 'Stale revision succeeded';
  exception when serialization_failure then null;
  end;
  assert not public.delete_canvas_document_v1(document, 1);
end $$;

select set_config('request.jwt.claim.sub','94910000-0000-4000-8000-000000000002',true);
do $$
declare document uuid := current_setting('common.test_canvas_id')::uuid;
begin
  assert not exists(select 1 from public.canvas_documents where id = document);
  assert not exists(select 1 from public.canvas_revisions where document_id = document);
  assert not public.delete_canvas_document_v1(document, 12);
  begin
    perform public.save_canvas_document_v1(document, 12, repeat('a',64), '{"version":1,"chart":"histogram","title":"Other","y":"Field"}');
    raise exception 'Unrelated revision succeeded';
  exception when serialization_failure then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','94900000-0000-4000-8000-000000000001',true);
do $$
declare document uuid := current_setting('common.test_canvas_id')::uuid;
begin
  assert public.delete_canvas_document_v1(document, 12);
  assert not exists(select 1 from public.canvas_revisions where document_id = document);
  for n in 1..30 loop
    perform public.save_canvas_document_v1(null, 0, repeat('a',64),
      '{"version":1,"chart":"histogram","title":"Quota fixture","y":"Field"}');
  end loop;
  begin
    perform public.save_canvas_document_v1(null, 0, repeat('a',64),
      '{"version":1,"chart":"histogram","title":"Overflow","y":"Field"}');
    raise exception 'A 31st document was accepted';
  exception when program_limit_exceeded then null;
  end;
  assert (select count(*) = 30 from public.canvas_documents);
end $$;
reset role;
set local role anon;
do $$
begin
  assert not has_table_privilege(current_user, 'public.canvas_documents', 'SELECT');
  assert not has_function_privilege(current_user, 'public.save_canvas_document_v1(uuid,integer,text,jsonb)', 'EXECUTE');
end $$;
rollback;
