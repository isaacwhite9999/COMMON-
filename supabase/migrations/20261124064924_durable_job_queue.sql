begin;

create role common_jobs_producer nologin;
create role common_jobs_worker nologin;

-- Internal SQL interface, outside the Supabase Data API.
create schema common_jobs;
revoke all on schema common_jobs from public, anon, authenticated;
grant usage on schema common_jobs to common_jobs_producer, common_jobs_worker;

create table common_jobs.queue_limits (
  kind text primary key,
  enabled boolean not null default true,
  max_active integer not null check (max_active between 1 and 10000),
  max_per_owner integer not null check (max_per_owner between 1 and max_active),
  max_per_circle integer not null check (max_per_circle between 1 and max_active),
  max_runtime_seconds integer not null check (max_runtime_seconds between 120 and 14400)
);

insert into common_jobs.queue_limits (
  kind, max_active, max_per_owner, max_per_circle, max_runtime_seconds
) values
  ('ai_research', 256, 4, 16, 1800),
  ('quantitative_calculation', 512, 8, 32, 3600),
  ('backtest', 512, 8, 32, 3600),
  ('market_data_ingestion', 512, 128, 128, 3600),
  ('sec_filing_ingestion', 512, 128, 128, 3600),
  ('data_normalization', 512, 128, 128, 3600),
  ('financial_report', 256, 4, 16, 1800),
  ('portfolio_calculation', 512, 8, 32, 3600),
  ('notification', 1024, 32, 128, 600),
  ('feed_processing', 512, 32, 128, 600),
  ('attachment_processing', 512, 8, 32, 1800),
  ('moderation', 512, 32, 128, 1800),
  ('transaction_reconciliation', 256, 8, 32, 1800),
  ('statement_generation', 256, 8, 32, 1800);

update common_jobs.queue_limits set enabled = false
  where kind in ('transaction_reconciliation', 'statement_generation');

create table common_jobs.jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null references common_jobs.queue_limits(kind),
  owner_id uuid not null,
  circle_id uuid,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 128),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 16384
  ),
  state text not null default 'queued' check (
    state in ('queued', 'running', 'succeeded', 'cancelled', 'dead')
  ),
  priority smallint not null check (priority between 0 and 3),
  scheduled_at timestamptz,
  available_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  max_attempts smallint not null check (max_attempts between 1 and 8),
  attempts smallint not null default 0 check (attempts between 0 and max_attempts),
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_deadline_at timestamptz,
  progress smallint not null default 0 check (progress between 0 and 100),
  cancel_requested_at timestamptz,
  completed_at timestamptz,
  result_ref uuid,
  error_code text check (error_code ~ '^[a-z][a-z0-9_]{0,47}$'),
  unique (kind, owner_id, idempotency_key),
  check (
    (state = 'running' and lease_token is not null and lease_expires_at is not null
      and attempt_deadline_at is not null and lease_expires_at <= attempt_deadline_at)
    or (state <> 'running' and lease_token is null and lease_expires_at is null
      and attempt_deadline_at is null)
  ),
  check ((state in ('succeeded', 'cancelled', 'dead')) = (completed_at is not null)),
  check (state = 'succeeded' or result_ref is null)
);
alter table common_jobs.queue_limits enable row level security;
alter table common_jobs.jobs enable row level security;
revoke all on all tables in schema common_jobs from public, anon, authenticated,
  common_jobs_producer, common_jobs_worker;

create index jobs_ready on common_jobs.jobs (kind, priority desc, available_at, id)
  where state = 'queued';
create index jobs_expired on common_jobs.jobs (kind, lease_expires_at, id)
  where state = 'running';
create index jobs_owner_active on common_jobs.jobs (kind, owner_id)
  where state in ('queued', 'running');
create index jobs_circle_active on common_jobs.jobs (kind, circle_id)
  where circle_id is not null and state in ('queued', 'running');

create function common_jobs.enqueue(
  p_kind text, p_owner_id uuid, p_idempotency_key text, p_payload jsonb,
  p_circle_id uuid default null, p_priority integer default 1,
  p_scheduled_at timestamptz default null, p_max_attempts integer default 4
) returns uuid
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  limits common_jobs.queue_limits%rowtype;
  existing common_jobs.jobs%rowtype;
  job_id uuid;
begin
  if p_owner_id is null or p_idempotency_key is null
    or char_length(p_idempotency_key) not between 1 and 128
    or btrim(p_idempotency_key) = ''
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or octet_length(p_payload::text) > 16384
    or p_priority is null or p_priority not between 0 and 3
    or p_max_attempts is null or p_max_attempts not between 1 and 8
    or (p_scheduled_at is not null and
      (not isfinite(p_scheduled_at) or p_scheduled_at > clock_timestamp() + interval '30 days'))
  then
    raise exception 'invalid job request' using errcode = '22023';
  end if;

  -- Advance the admission row version so excess admissions cannot slip through
  -- snapshot isolation. A higher isolation caller may need to retry SQLSTATE 40001.
  update common_jobs.queue_limits
    set max_active = max_active
    where kind = p_kind
    returning * into limits;
  if not found then
    raise exception 'unknown job kind' using errcode = '22023';
  end if;

  select * into existing from common_jobs.jobs
    where kind = p_kind and owner_id = p_owner_id and idempotency_key = p_idempotency_key;
  if found then
    if existing.payload is distinct from p_payload or existing.circle_id is distinct from p_circle_id
      or existing.priority <> p_priority or existing.scheduled_at is distinct from p_scheduled_at
      or existing.max_attempts <> p_max_attempts
    then
      raise exception 'job idempotency key already used for a different request'
        using errcode = '23505';
    end if;
    return existing.id;
  end if;
  if not limits.enabled then
    raise exception 'job kind is disabled' using errcode = '55000';
  end if;

  if (select count(*) from common_jobs.jobs
        where kind = p_kind and state in ('queued', 'running')) >= limits.max_active
    or (select count(*) from common_jobs.jobs
        where kind = p_kind and owner_id = p_owner_id and state in ('queued', 'running'))
          >= limits.max_per_owner
    or (p_circle_id is not null and (select count(*) from common_jobs.jobs
        where kind = p_kind and circle_id = p_circle_id and state in ('queued', 'running'))
          >= limits.max_per_circle)
  then
    raise exception 'job queue admission limit reached' using errcode = 'P0001';
  end if;

  insert into common_jobs.jobs (
    kind, owner_id, circle_id, idempotency_key, payload, priority, scheduled_at,
    available_at, max_attempts
  ) values (
    p_kind, p_owner_id, p_circle_id, p_idempotency_key, p_payload, p_priority, p_scheduled_at,
    coalesce(p_scheduled_at, clock_timestamp()), p_max_attempts
  ) returning id into job_id;
  return job_id;
end;
$$;

create function common_jobs.retry_delay(p_attempts integer) returns interval
language sql volatile set search_path = pg_catalog, pg_temp as $$
  select make_interval(secs => least(300.0, 5.0 * power(2.0, p_attempts - 1))
    * (0.8 + random() * 0.2));
$$;

create function common_jobs.reap_expired(p_kind text, p_limit integer default 25) returns bigint
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  checked_at timestamptz := clock_timestamp();
  updated bigint;
begin
  if p_kind is null or p_limit is null or p_limit not between 1 and 100 then
    raise exception 'invalid queue recovery request' using errcode = '22023';
  end if;

  with expired as (
    select j.id from common_jobs.jobs j
    where j.kind = p_kind and j.state = 'running' and j.lease_expires_at <= checked_at
    order by j.lease_expires_at, j.id
    limit p_limit
    for update skip locked
  )
  update common_jobs.jobs j set
    state = case when j.cancel_requested_at is not null then 'cancelled'
                 when j.attempts = j.max_attempts then 'dead' else 'queued' end,
    completed_at = case when j.cancel_requested_at is not null or j.attempts = j.max_attempts
                        then checked_at end,
    available_at = case when j.cancel_requested_at is null and j.attempts < j.max_attempts
                        then checked_at + common_jobs.retry_delay(j.attempts)
                        else j.available_at end,
    error_code = case when j.cancel_requested_at is null then 'lease_expired' end,
    lease_token = null, lease_expires_at = null, attempt_deadline_at = null
  from expired
  where j.id = expired.id;

  get diagnostics updated = row_count;
  return updated;
end;
$$;

create function common_jobs.claim(p_kind text, p_lease_seconds integer default 30)
returns table (
  id uuid, owner_id uuid, circle_id uuid, payload jsonb, attempt smallint,
  lease_token uuid, lease_expires_at timestamptz, attempt_deadline_at timestamptz
)
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  checked_at timestamptz;
  deadline timestamptz;
  allowed boolean;
begin
  if p_kind is null or p_lease_seconds is null or p_lease_seconds not between 5 and 120 then
    raise exception 'invalid job claim' using errcode = '22023';
  end if;
  select clock_timestamp() + make_interval(secs => max_runtime_seconds), enabled
    into deadline, allowed from common_jobs.queue_limits where kind = p_kind;
  if not found then
    raise exception 'unknown job kind' using errcode = '22023';
  end if;

  if not allowed then
    return;
  end if;
  perform common_jobs.reap_expired(p_kind);
  checked_at := clock_timestamp();

  return query
  with candidate as (
    select j.id from common_jobs.jobs j
    where j.kind = p_kind and j.state = 'queued' and j.available_at <= checked_at
    order by j.priority desc, j.available_at, j.id
    limit 1
    for update skip locked
  )
  update common_jobs.jobs j set
    state = 'running', attempts = j.attempts + 1, progress = 0, error_code = null,
    lease_token = gen_random_uuid(),
    lease_expires_at = least(deadline, checked_at + make_interval(secs => p_lease_seconds)),
    attempt_deadline_at = deadline
  from candidate
  where j.id = candidate.id
  returning j.id, j.owner_id, j.circle_id, j.payload, j.attempts, j.lease_token,
    j.lease_expires_at, j.attempt_deadline_at;
end;
$$;

create function common_jobs.heartbeat(
  p_id uuid, p_lease_token uuid, p_progress integer, p_lease_seconds integer default 30
) returns boolean
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  job common_jobs.jobs%rowtype;
  checked_at timestamptz;
begin
  if p_progress is null or p_progress not between 0 and 99 or p_lease_seconds is null
    or p_lease_seconds not between 5 and 120
  then
    raise exception 'invalid job heartbeat' using errcode = '22023';
  end if;

  select * into job from common_jobs.jobs j
    where j.id = p_id and j.lease_token = p_lease_token and j.state = 'running'
    for update;
  checked_at := clock_timestamp();
  if not found or job.lease_expires_at <= checked_at or job.cancel_requested_at is not null then
    return false;
  end if;

  update common_jobs.jobs j set
    lease_expires_at = least(job.attempt_deadline_at,
      greatest(job.lease_expires_at, checked_at + make_interval(secs => p_lease_seconds))),
    progress = greatest(job.progress, p_progress)
  where j.id = job.id;
  return true;
end;
$$;

create function common_jobs.finish(
  p_id uuid, p_lease_token uuid, p_outcome text,
  p_result_ref uuid default null, p_error_code text default null
) returns boolean
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
declare
  job common_jobs.jobs%rowtype;
  checked_at timestamptz;
begin
  if p_outcome is null or p_outcome not in ('succeeded', 'retry', 'dead')
    or (p_outcome = 'succeeded' and p_error_code is not null)
    or (p_outcome <> 'succeeded' and (p_result_ref is not null
      or p_error_code is null or p_error_code !~ '^[a-z][a-z0-9_]{0,47}$'))
  then
    raise exception 'invalid job completion' using errcode = '22023';
  end if;

  select * into job from common_jobs.jobs j
    where j.id = p_id and j.lease_token = p_lease_token and j.state = 'running'
    for update;
  checked_at := clock_timestamp();
  if not found or job.lease_expires_at <= checked_at then
    return false;
  end if;

  update common_jobs.jobs j set
    state = case when job.cancel_requested_at is not null then 'cancelled'
                 when p_outcome = 'succeeded' then 'succeeded'
                 when p_outcome = 'retry' and job.attempts < job.max_attempts then 'queued'
                 else 'dead' end,
    completed_at = case when job.cancel_requested_at is not null
                         or p_outcome <> 'retry' or job.attempts = job.max_attempts
                        then checked_at end,
    available_at = case when job.cancel_requested_at is null
                         and p_outcome = 'retry' and job.attempts < job.max_attempts
                        then checked_at + common_jobs.retry_delay(job.attempts)
                        else j.available_at end,
    progress = case when job.cancel_requested_at is null and p_outcome = 'succeeded'
                    then 100 else j.progress end,
    result_ref = case when job.cancel_requested_at is null then p_result_ref end,
    error_code = case when job.cancel_requested_at is null then p_error_code end,
    lease_token = null, lease_expires_at = null, attempt_deadline_at = null
  where j.id = job.id;
  return true;
end;
$$;

create function common_jobs.cancel(p_owner_id uuid, p_id uuid) returns boolean
language plpgsql security definer set search_path = pg_catalog, pg_temp as $$
begin
  update common_jobs.jobs j set
    cancel_requested_at = coalesce(j.cancel_requested_at, clock_timestamp()),
    state = case when j.state = 'queued' then 'cancelled' else j.state end,
    completed_at = case when j.state = 'queued' then clock_timestamp() end,
    error_code = null
  where j.owner_id = p_owner_id and j.id = p_id and j.state in ('queued', 'running');
  return found;
end;
$$;

create function common_jobs.status(p_owner_id uuid, p_id uuid)
returns table (
  state text, progress smallint, attempts smallint, available_at timestamptz,
  cancel_requested_at timestamptz, completed_at timestamptz, result_ref uuid, error_code text
)
language sql stable security definer set search_path = pg_catalog, pg_temp as $$
  select j.state, j.progress, j.attempts, j.available_at, j.cancel_requested_at,
    j.completed_at, j.result_ref, j.error_code
  from common_jobs.jobs j where j.owner_id = p_owner_id and j.id = p_id;
$$;

revoke all on all functions in schema common_jobs from public, anon, authenticated;
grant execute on function
  common_jobs.enqueue(text, uuid, text, jsonb, uuid, integer, timestamptz, integer),
  common_jobs.status(uuid, uuid),
  common_jobs.cancel(uuid, uuid)
  to common_jobs_producer;
grant execute on function
  common_jobs.claim(text, integer),
  common_jobs.heartbeat(uuid, uuid, integer, integer),
  common_jobs.finish(uuid, uuid, text, uuid, text),
  common_jobs.reap_expired(text, integer)
  to common_jobs_worker;

commit;
