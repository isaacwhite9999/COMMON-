# API operations and isolated staging

The FastAPI service serves the existing educational prototype. The member application continues to use Supabase for auth and database authorization. This service accepts the `development` and `staging` profiles. It rejects a production profile because the prototype cookie identity and authorization have not been migrated to the member identity. Staging requires PostgreSQL and serves demo accounts only.

## Run isolated staging

Create an empty PostgreSQL 16 database with UTF-8 encoding and isolated credentials. Set `COMMON_API_ENV=staging` and `DATABASE_URL` with a `postgresql://` or `postgresql+psycopg://` URL. Use a development database and no production credentials. Run `python -m backend.init_staging` once to initialize and seed the isolated prototype. The initializer checks that public has no tables or views and that there are no user schemas. PostgreSQL API instances never run schema setup at startup.

Use `uvicorn backend.app:app --limit-concurrency 64 --timeout-keep-alive 5 --timeout-graceful-shutdown 15 --no-access-log`, or the repository container entrypoint. Set `PUBLIC_ORIGIN` to the exact site origin and use `SECURE_COOKIES=true` when serving through HTTPS. For distributed staging, terminate TLS at a trusted proxy and require verified PostgreSQL TLS using connection parameters. Use the runtime database role with only the privileges required for prototype access. For an existing database, use reviewed migrations when promoting beyond this disposable initial schema.

| Setting | Default | Scope |
| --- | ---: | --- |
| `COMMON_DB_POOL_SIZE` | 5 | Persistent connections per process |
| `COMMON_DB_MAX_OVERFLOW` | 0 | Additional connections per process |
| `COMMON_DB_POOL_TIMEOUT` | 2 s | Pool checkout wait |
| `COMMON_DB_STATEMENT_TIMEOUT_MS` | 5,000 ms | PostgreSQL statement timeout |

Allocate pool capacity across every process and instance, with headroom for administration and workers. PostgreSQL connections have a 3-second connect timeout and a 2-second lock timeout. Pool exhaustion and recognized PostgreSQL connection or timeout errors return 503 with `Retry-After`. Retrying writes requires application-specific idempotency. The API limits mutation requests to 32 KiB and gives the caller five seconds to deliver the body. Deadline ownership for future external providers belongs to each adapter.

## Operational signals

- `GET /api/v1/health/live` reports process liveness independently of the database.
- `GET /api/v1/health/ready` probes the database and expected users table. It returns 503 when the database is unavailable or the table is missing.
- The API returns a correlation UUID in `X-Request-ID` and local timing in `Server-Timing`. The request log emits the matched route template, method, status, correlation ID, and duration. Keep raw access logs off when using these logs to avoid recording sensitive path segments.
- API responses send `Cache-Control: no-store`. Validation errors retain the field and reason while omitting submitted values. Never log database URLs, request bodies, cookies, invite codes, or SQL parameters.

The existing prototype proposal list stays capped at 100 and uses five statements including authentication. It loads counts for the entire page in one grouped read and the caller’s votes in one read. Vote writes use native upserts against the unique proposal/user key and write the audit event in the same transaction. These are educational community polls.

## Performance evidence

`python scripts/load_api.py --population 1000 --concurrency 16 --rounds 10` starts its own loopback server and SQLite fixture. It accepts no target URL. Re-run with populations 10000 and 100000. Each active session signs in as a disposable demo account, alternates profile and proposal reads ten times, then signs out. Reported latencies are client-observed wall time. A local run on the Codex Linux workspace, using Python 3.12, one Uvicorn process and 16 active clients, produced:

| Synthetic profiles | Requests | Requests/s | Errors | Profile p95 | Proposal p95 | Proposal p99 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 352 | 274.7 | 0 | 70.03 ms | 63.74 ms | 78.93 ms |
| 10,000 | 352 | 276.1 | 0 | 68.30 ms | 100.00 ms | 144.13 ms |
| 100,000 | 352 | 252.6 | 0 | 102.74 ms | 78.69 ms | 116.01 ms |

This short run measures the prototype with a small proposal fixture. PostgreSQL 16 is covered separately by `tests/test_api_postgres.py` against a fresh disposable loopback database. That suite checks stage initialization, readiness, timeouts and concurrent updates to one logical vote. Production capacity, database saturation, broader workload mixes, durable rate limits, metrics collection, alerting, and backup/recovery drills require separate evidence.

Acceptance coverage is partial for X01.05–06 and PLATFORM-016, 017, 027, 030–032, 035, 037–038. Reverting the change restores the legacy implementation. Disposable staging schemas can be discarded independently of member data.
