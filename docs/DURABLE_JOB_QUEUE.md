# Durable PostgreSQL jobs

The internal SQL interface owns scheduling and lease state. A producer and a worker can run on different hosts using the same database. Each worker pool claims one registered kind at a time and can scale independently. PostgreSQL 16 is the only infrastructure required for this slice.

## Service interface

| Caller | Function | Result |
| --- | --- | --- |
| Authorized domain producer | `common_jobs.enqueue(kind, owner_id, idempotency_key, payload, circle_id?, priority?, scheduled_at?, max_attempts?)` | Job UUID. Repeating the same request returns the original UUID, including after completion. A different request with the same key returns SQLSTATE `23505`. |
| Authorized domain producer | `common_jobs.status(owner_id, id)`, `common_jobs.cancel(owner_id, id)` | Status or zero rows. Cancellation returns whether a queued or running job matched. |
| Worker | `common_jobs.claim(kind, lease_seconds?)` | Zero or one job, its opaque lease token, the attempt number and the absolute attempt deadline. |
| Worker | `common_jobs.heartbeat(id, lease_token, progress, lease_seconds?)` | `false` signals loss of lease or a cancellation request. Progress is monotonic per attempt. |
| Worker | `common_jobs.finish(id, lease_token, outcome, result_ref?, error_code?)` | `false` means lease invalid or expired. Outcomes are `succeeded`, `retry` and `dead`. Cancellation takes precedence over the worker's outcome. |
| Worker | `common_jobs.reap_expired(kind, limit?)` | Number reaped. Run periodically for owned kinds even when claim traffic stops. |
| Queue observer | `common_jobs.queue_health()` | Aggregate per-kind backlog, processing, lease and completion snapshot. |

The `common_jobs` schema is private. Migrations require a role with `CREATEROLE`. Provision individual trusted database logins with membership in `common_jobs_producer` or `common_jobs_worker` and set tight connection, statement and lock timeouts. There are no grants to browser roles, and the service roles have no direct table access. Producer logins must authorize project, owner and circle scopes using the normal domain service before calling the queue. A producer chooses internal system UUIDs for system work without a member identity. Job metadata can include bounded, versioned artifact references, with a 16 KiB bound on the serialized payload. Keep datasets, secrets and confidential documents in their authorized stores. Worker credentials can read payloads across enabled kinds, so reserve this initial role for trusted internal handlers on a shared trust boundary. Restricted workloads require their own credential and storage boundary before activation.

## Execution, capacity and recovery

- Submit inside the transaction that records a domain change when needed. The enqueue and business state commit together and the worker cannot claim an uncommitted row. A cross-system publisher must additionally track external receipt and deduplication, which this SQL interface does not provide.
- Claim and commit before executing work. Use a bounded worker pool, 5–120 second leases and heartbeats well inside the lease interval. While working, stop promptly after a rejected heartbeat. Keep progress numeric and use sanitized error codes in place of stack traces.
- A lease token fences queue writes. Dispatch is at least once. Use a durable handler-side idempotency key and recheck authorization before publishing results or making any side effect. Artifact access is enforced by the artifact's owner domain.
- Work runs in priority order with timestamp and UUID tie-breakers. Ready claims and lease recovery use partial indexes and `FOR UPDATE SKIP LOCKED`. Reaping or a transient failure schedules bounded exponential retry with jitter. Final failures remain queryable in the `dead` state. Use a new idempotency key for an explicitly approved replay.
- Admission bounds queued plus running jobs per kind, per owner and per circle within a kind. `P0001` with message `job queue admission limit reached` is backpressure. Translate it into an explicit retry response and avoid immediate retry loops. A per-kind row lock serializes admission. Keep producer transactions short, retry `40001` at the transaction boundary, and benchmark admission contention before increasing limits. Jobs across different kinds can be admitted independently. When a transaction enqueues several kinds, acquire them in stable kind order.
- Running jobs hold capacity after cancellation until acknowledgement or lease expiry. A time-bounded reaper can process 1–100 expired rows per call. Terminal rows preserve idempotency history, so production rollout needs a retention and deduplication policy before storage can be pruned safely.
- The reconciliation and statement kinds are seeded disabled. The queue cannot dispatch them until a later gated migration. This slice deploys no workers, provider credentials, financial actions or arbitrary code execution. Existing browser compute and gated agents continue through their existing paths.

## Queue health and recovery

An approved operator uses a dedicated database login with membership in `common_jobs_observer`. Grant that role separately from producer and worker roles. It can call `common_jobs.queue_health()` and has no access to job records, domain identifiers, payloads, results, lease tokens or mutations. The snapshot also shows empty and disabled kinds.

Use an approved PostgreSQL service profile for the observer login and your environment's existing credential and TLS configuration. The command uses the pinned PostgreSQL driver from `requirements.txt`, a read-only transaction, a five-second statement timeout and JSON output.

```sh
PGSERVICE=common-queue-observer python scripts/queue_health.py
```

- Compare `ready + delayed + running` with `admission_limit`. `ready` covers jobs eligible at the snapshot timestamp. `delayed` covers scheduled starts and retry delays. `oldest_ready_seconds` measures time since the oldest ready job became eligible and is null for zero ready jobs.
- `expired_leases` and `cancellations_pending` are subsets of `running` and can overlap. A sustained increase in expired leases can indicate unavailable workers, failed heartbeats or resource contention. Check the responsible worker deployment and its existing logs before acting.
- The completion breakdown covers the last hour. It reads up to the newest 1,000 terminal jobs per kind. If `terminal_sample_capped` is true, the three counts describe the sampled jobs and can undercount the window. Monitor trends with timestamped snapshots.
- If authorized to recover a queue, use a separate worker credential and call `select common_jobs.reap_expired('ai_research',25);` for that worker's owned kind. Repeat in bounded batches while the reaper returns work, then collect a fresh observer snapshot. Expired rows can retry, cancel or move to dead according to their existing state and attempts. Recovery retains existing lease fencing and idempotency behavior.
- For sustained dead jobs, investigate the corresponding handler. Approve replay through the domain producer and use a new idempotency key only after checking downstream effects. Keep disabled financial kinds gated. This workflow requires no service activation or scheduled polling.

## Verification

Use fresh disposable PostgreSQL 16 with a database named `common_jobs_test` on `127.0.0.1`. Set `PGPORT`, `PGUSER` and `PGPASSWORD` for that instance, install `psycopg[binary]==3.3.9`, and run `python tests/pg_jobs_integration.py`. The suite applies both queue migrations, rejects unauthorized role calls, exercises lifecycle and failure recovery, and verifies concurrent idempotency, admission bounds and duplicate-free claim/completion. It also checks the observer command, reporting of expired leases, bounded completion sampling and the terminal-window index. It reports claim-to-completion latency for eight local test workers processing 64 no-op jobs and prints the indexed EXPLAIN ANALYZE plan against 10,000 synthetic terminal rows and 160 ready jobs. One PostgreSQL 16.16 run completed the 64 cycles in 0.060 seconds with p50 4.805 ms, p95 13.644 ms and p99 29.443 ms. The ready-job index returned one row in a 0.037 ms execution with four shared buffer hits. A disposable observer test used the terminal index to read 1,000 of 10,064 recent backtest completions in 0.833–1.192 ms across two runs. These are queue-only measurements on one local instance. They exclude real handlers and establish no application capacity target.

## Rollout and rollback

Apply the migration to disposable PostgreSQL before reviewing staging. Keep affected producers and workers disabled until staging role grants, job authorization, queue monitoring, retention and handler behavior have been verified. Alert on growing oldest-ready age, dead count and expired leases per kind. Do not grant worker privileges to HTTP-facing roles. Roll back integrations by stopping their producers and workers, then revoking their role membership. Preserve the schema while it contains in-flight jobs or idempotency history.

Evidence covers part of X01.05, X01.06, Q01.07 and Q03.05, and platform checklist IDs PLATFORM-017, PLATFORM-020, PLATFORM-022, PLATFORM-025, PLATFORM-027, PLATFORM-031, PLATFORM-032 and PLATFORM-035. Provider adapters, application API and UI integration, worker isolation, metrics export and load validation of real workloads remain open.
