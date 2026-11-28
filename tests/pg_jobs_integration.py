"""Exercise the durable queue against a fresh disposable PostgreSQL database."""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from os import environ
from pathlib import Path
from statistics import median
from threading import Barrier
from time import perf_counter
from uuid import uuid4

import psycopg
from psycopg import errors, sql
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parents[1]
OWNER = uuid4()
OTHER_OWNER = uuid4()
CIRCLE = uuid4()


def connect():
    return psycopg.connect(
        dbname="common_jobs_test", host="127.0.0.1", hostaddr="127.0.0.1",
        port=environ.get("PGPORT", "5432"), row_factory=dict_row, autocommit=True,
        connect_timeout=5, options="-c statement_timeout=10000",
    )


def scalar(db, statement, params=()):
    return next(iter(db.execute(statement, params).fetchone().values()))


def enqueue(db, key, *, owner=OWNER, kind="ai_research", circle=None,
            priority=1, scheduled=None, max_attempts=4):
    return scalar(db, "select common_jobs.enqueue(%s,%s,%s,'{}',%s,%s,%s,%s)",
                  (kind, owner, key, circle, priority, scheduled, max_attempts))


def status(db, job, owner=OWNER):
    return db.execute("select * from common_jobs.status(%s,%s)", (owner, job)).fetchone()


def claim(db, kind="ai_research"):
    return db.execute("select * from common_jobs.claim(%s,5)", (kind,)).fetchone()


def finish(db, job, lease, outcome="succeeded", result=None, error=None):
    return scalar(db, "select common_jobs.finish(%s,%s,%s,%s,%s)",
                  (job, lease, outcome, result, error))


def with_role(db, role):
    db.execute(sql.SQL("set role {}").format(sql.Identifier(role)))


def rejects(operation, error_type):
    try:
        operation()
    except error_type:
        return
    raise AssertionError(f"Expected {error_type.__name__}")


def test_lifecycle(db):
    for kind in ("transaction_reconciliation", "statement_generation"):
        rejects(lambda: enqueue(db, "disabled", kind=kind), errors.ObjectNotInPrerequisiteState)
        assert claim(db, kind) is None
    with db.transaction(force_rollback=True):
        rolled_back = enqueue(db, "rollback")
    assert status(db, rolled_back) is None
    priority_job = enqueue(db, "priority", priority=3)
    normal_job = enqueue(db, "normal")
    future_job = enqueue(db, "future", priority=3, scheduled=datetime.now(timezone.utc) + timedelta(hours=1))
    assert enqueue(db, "priority", priority=3) == priority_job
    rejects(lambda: enqueue(db, "priority", priority=2), errors.UniqueViolation)
    rejects(lambda: db.execute(
        "select common_jobs.enqueue('ai_research',%s,'oversized',jsonb_build_object('x',repeat('X',16500)))",
        (OWNER,),
    ), errors.InvalidParameterValue)
    assert status(db, priority_job, OTHER_OWNER) is None
    assert not scalar(db, "select common_jobs.cancel(%s,%s)", (OTHER_OWNER, priority_job))

    first = claim(db)
    assert first["id"] == priority_job and first["attempt"] == 1
    assert not scalar(db, "select common_jobs.heartbeat(%s,%s,18,30)", (priority_job, uuid4()))
    assert scalar(db, "select common_jobs.heartbeat(%s,%s,18,30)", (priority_job, first["lease_token"]))
    assert scalar(db, "select common_jobs.heartbeat(%s,%s,10,5)", (priority_job, first["lease_token"]))
    assert status(db, priority_job)["progress"] == 18
    result = uuid4()
    assert finish(db, priority_job, first["lease_token"], result=result)
    assert not finish(db, priority_job, first["lease_token"])
    assert status(db, priority_job)["result_ref"] == result
    assert status(db, priority_job)["progress"] == 100

    second = claim(db)
    assert second["id"] == normal_job
    assert scalar(db, "select common_jobs.cancel(%s,%s)", (OWNER, normal_job))
    assert not scalar(db, "select common_jobs.heartbeat(%s,%s,20,30)", (normal_job, second["lease_token"]))
    assert finish(db, normal_job, second["lease_token"], result=result)
    assert status(db, normal_job)["state"] == "cancelled"
    assert status(db, normal_job)["result_ref"] is None
    assert claim(db) is None
    assert scalar(db, "select common_jobs.cancel(%s,%s)", (OWNER, future_job))
    assert status(db, future_job)["state"] == "cancelled"


def test_recovery(db):
    job = enqueue(db, "retry", max_attempts=3)
    first = claim(db)
    assert finish(db, job, first["lease_token"], "retry", error="transient_failure")
    assert status(db, job)["error_code"] == "transient_failure"
    assert claim(db) is None
    db.execute("update common_jobs.jobs set available_at=clock_timestamp() where id=%s", (job,))
    second = claim(db)
    assert second["id"] == job and second["attempt"] == 2
    assert not finish(db, job, first["lease_token"])
    db.execute(
        "update common_jobs.jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id=%s",
        (job,),
    )
    assert not finish(db, job, second["lease_token"])
    assert not scalar(db, "select common_jobs.heartbeat(%s,%s,20,30)", (job, second["lease_token"]))
    assert scalar(db, "select common_jobs.reap_expired('ai_research')") == 1
    assert status(db, job)["state"] == "queued"
    assert status(db, job)["error_code"] == "lease_expired"
    assert status(db, job)["available_at"] > datetime.now(timezone.utc)
    db.execute("update common_jobs.jobs set available_at=clock_timestamp() where id=%s", (job,))
    third = claim(db)
    assert third["attempt"] == 3 and third["lease_token"] != second["lease_token"]
    assert finish(db, job, third["lease_token"], "retry", error="transient_failure")
    assert status(db, job)["state"] == "dead"

    cancelled = enqueue(db, "cancel-reap")
    assert claim(db)["id"] == cancelled
    assert scalar(db, "select common_jobs.cancel(%s,%s)", (OWNER, cancelled))
    db.execute(
        "update common_jobs.jobs set lease_expires_at=clock_timestamp()-interval '1 second' where id=%s",
        (cancelled,),
    )
    assert scalar(db, "select common_jobs.reap_expired('ai_research')") == 1
    assert status(db, cancelled)["state"] == "cancelled"


def test_roles(db):
    job = enqueue(db, "role-tests")
    for role in ("anon", "authenticated"):
        with_role(db, role)
        rejects(lambda: status(db, job), errors.InsufficientPrivilege)
        rejects(lambda: claim(db), errors.InsufficientPrivilege)
    with_role(db, "common_jobs_producer")
    assert status(db, job)["state"] == "queued"
    rejects(lambda: claim(db), errors.InsufficientPrivilege)
    rejects(lambda: db.execute("select payload from common_jobs.jobs"), errors.InsufficientPrivilege)
    with_role(db, "common_jobs_worker")
    rejects(lambda: enqueue(db, "forbidden"), errors.InsufficientPrivilege)
    rejects(lambda: status(db, job), errors.InsufficientPrivilege)
    active = claim(db)
    assert active["id"] == job
    assert finish(db, job, active["lease_token"])
    db.execute("reset role")


def test_concurrent_admission_and_claim(db):
    participants = 8
    barrier = Barrier(participants)

    def submit(index):
        with connect() as client:
            with_role(client, "common_jobs_producer")
            barrier.wait(timeout=5)
            duplicate = enqueue(client, "concurrent-duplicate", kind="portfolio_calculation")
            try:
                enqueue(client, f"owner-cap-{index}", kind="ai_research", circle=CIRCLE)
            except errors.RaiseException as exc:
                assert exc.diag.message_primary == "job queue admission limit reached"
                return duplicate, False
            return duplicate, True

    with ThreadPoolExecutor(max_workers=participants) as executor:
        submits = list(executor.map(submit, range(participants)))
    assert len({job for job, _ in submits}) == 1
    assert sum(accepted for _, accepted in submits) == 4
    for index in range(12):
        enqueue(db, f"circle-cap-{index}", owner=uuid4(), circle=CIRCLE)
    rejects(lambda: enqueue(db, "circle-over-cap", owner=uuid4(), circle=CIRCLE), errors.RaiseException)
    db.execute("update common_jobs.queue_limits set max_active=16 where kind='ai_research'")
    rejects(lambda: enqueue(db, "kind-over-cap", owner=uuid4()), errors.RaiseException)
    db.execute("update common_jobs.queue_limits set max_active=256 where kind='ai_research'")

    expected = {enqueue(db, f"parallel-{i}", kind="backtest", owner=uuid4()) for i in range(64)}

    def work(_):
        completions = []
        with connect() as worker:
            with_role(worker, "common_jobs_worker")
            barrier.wait(timeout=5)
            while True:
                started = perf_counter()
                job = claim(worker, "backtest")
                if job is None:
                    return completions
                assert finish(worker, job["id"], job["lease_token"])
                completions.append((job["id"], (perf_counter() - started) * 1000))

    started = perf_counter()
    with ThreadPoolExecutor(max_workers=participants) as executor:
        completions = [result for batch in executor.map(work, range(participants)) for result in batch]
    elapsed = perf_counter() - started
    assert Counter(job for job, _ in completions) == dict.fromkeys(expected, 1)
    timings = sorted(timing for _, timing in completions)
    print(f"8 workers, {len(timings)} claim+finish cycles in {elapsed:.3f}s. "
          f"p50={median(timings):.3f} ms, p95={timings[60]:.3f} ms, p99={timings[-1]:.3f} ms")


def test_claim_plan(db):
    db.execute("""
        insert into common_jobs.jobs (
            id, kind, owner_id, idempotency_key, payload, state, priority,
            available_at, max_attempts, attempts, completed_at
        )
        select gen_random_uuid(), 'backtest', gen_random_uuid(), i::text, '{}', 'succeeded',
          1, now(), 4, 1, now()
        from generate_series(1,10000) i
    """)
    for index in range(160):
        enqueue(db, f"plan-{index}", kind="backtest", owner=uuid4())
    db.execute("analyze common_jobs.jobs")
    plan = [
        next(iter(row.values())) for row in db.execute("""
            explain (analyze, buffers)
            select j.id from common_jobs.jobs j
            where j.kind = 'backtest' and j.state = 'queued' and j.available_at <= now()
            order by j.priority desc, j.available_at, j.id limit 1 for update skip locked
        """)
    ]
    assert any("jobs_ready" in line for line in plan), "\n".join(plan)
    print("\n".join(plan))


def main():
    with connect() as db:
        db.execute((ROOT / "tests/pg_prepare.sql").read_text())
        migration, = (ROOT / "supabase/migrations").glob("*_durable_job_queue.sql")
        db.execute(migration.read_text())
        for test in (test_lifecycle, test_recovery, test_roles, test_concurrent_admission_and_claim, test_claim_plan):
            test(db)
            print(f"PASS {test.__name__}")


if __name__ == "__main__":
    main()
