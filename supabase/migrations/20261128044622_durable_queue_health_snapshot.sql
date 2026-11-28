begin;

create role common_jobs_observer nologin;
grant usage on schema common_jobs to common_jobs_observer;
revoke all on all tables in schema common_jobs from common_jobs_observer;

-- Keep the recent terminal window independent of retained idempotency history.
create index jobs_terminal_recent on common_jobs.jobs (kind, completed_at desc, id desc)
  include (state) where completed_at is not null;

create function common_jobs.queue_health()
returns table (
  observed_at timestamptz,
  kind text,
  enabled boolean,
  admission_limit integer,
  ready bigint,
  delayed bigint,
  running bigint,
  expired_leases bigint,
  cancellations_pending bigint,
  oldest_ready_seconds bigint,
  succeeded_last_hour bigint,
  dead_last_hour bigint,
  cancelled_last_hour bigint,
  terminal_sample_capped boolean
)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select statement_timestamp(), q.kind, q.enabled, q.max_active,
    active.ready, active.delayed, active.running, active.expired_leases,
    active.cancellations_pending, active.oldest_ready_seconds,
    terminal.succeeded, terminal.dead, terminal.cancelled, terminal.capped
  from common_jobs.queue_limits q
  cross join lateral (
    select count(*) filter (where j.state='queued' and j.available_at<=statement_timestamp()) as ready,
      count(*) filter (where j.state='queued' and j.available_at>statement_timestamp()) as delayed,
      count(*) filter (where j.state='running') as running,
      count(*) filter (where j.state='running' and j.lease_expires_at<=statement_timestamp()) as expired_leases,
      count(*) filter (where j.state='running' and j.cancel_requested_at is not null) as cancellations_pending,
      floor(extract(epoch from statement_timestamp()-min(j.available_at) filter (
        where j.state='queued' and j.available_at<=statement_timestamp()
      )))::bigint as oldest_ready_seconds
    from common_jobs.jobs j
    where j.kind=q.kind and j.state in ('queued','running')
  ) active
  cross join lateral (
    select count(*) filter (where sampled.state='succeeded') as succeeded,
      count(*) filter (where sampled.state='dead') as dead,
      count(*) filter (where sampled.state='cancelled') as cancelled,
      count(*)=1000 as capped
    from (
      select j.state from common_jobs.jobs j
      where j.kind=q.kind
        and j.completed_at>statement_timestamp()-interval '1 hour'
        and j.completed_at<=statement_timestamp()
      order by j.completed_at desc,j.id desc
      limit 1000
    ) sampled
  ) terminal
  order by q.kind;
$$;

revoke all on function common_jobs.queue_health()
  from public, anon, authenticated, common_jobs_producer, common_jobs_worker;
grant execute on function common_jobs.queue_health() to common_jobs_observer;

commit;
