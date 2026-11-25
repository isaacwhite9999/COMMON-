"""Crash and cold-backup drill on a PostgreSQL cluster created by this process."""
from argparse import ArgumentParser
from concurrent.futures import ThreadPoolExecutor
from getpass import getuser
from pathlib import Path
from shutil import copytree
from subprocess import run
from tempfile import TemporaryDirectory
from threading import Barrier
from time import monotonic, sleep

import psycopg
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parents[1]
OWNER = "96400000-0000-4000-8000-000000000001"
CIRCLE = "96500000-0000-4000-8000-000000000001"
LINES = [{"account": "cash", "side": "debit", "cents": 12345},
         {"account": "capital", "side": "credit", "cents": 12345}]
REVERSAL = [{"account": line["account"], "side": "credit" if line["side"] == "debit" else "debit",
             "cents": line["cents"]} for line in LINES]


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--postgres-bin", type=Path, required=True)
    args = parser.parse_args()
    binaries = args.postgres_bin.resolve()

    with TemporaryDirectory(prefix="common-drill-") as folder:
        root = Path(folder)
        data, backup, socket = root / "cluster", root / "backup", root / "sock"
        socket.mkdir()

        def command(tool, *params):
            run([str(binaries / tool), *map(str, params)], check=True, capture_output=True, text=True)

        def start(cluster):
            command("pg_ctl", "-D", cluster, "-l", root / "server.log", "-o", f"-h '' -k {socket}", "start")

        def stop(cluster, mode="fast"):
            command("pg_ctl", "-D", cluster, "-m", mode, "stop")

        def connect():
            return psycopg.connect(host=str(socket), port=5432, dbname="postgres", user=getuser(), autocommit=True)

        def initialize(db):
            files = [ROOT / "tests/pg_prepare.sql", *sorted((ROOT / "supabase/migrations").glob("*.sql")),
                     ROOT / "supabase/schema-drafts/external-journal.sql"]
            for path in files:
                db.execute(path.read_text(), prepare=False)
            db.execute("grant usage on schema public,auth to authenticated")
            db.execute("grant select on public.communities to authenticated")
            db.execute("insert into auth.users(id,email) values (%s,'drill@example.test')", (OWNER,))
            db.execute("""
                insert into public.communities(id, slug, name, category, visibility, created_by)
                values (%s,'recovery-fixture','Disposable recovery fixture','markets','private',%s)
            """, (CIRCLE, OWNER))

        def insert_journal(db, reference, lines, original):
            return db.execute("""
                insert into public.circle_external_journal(community_id,record_date,source_ref,lines,reverses_id)
                values (%s,current_date,%s,%s,%s) returning id
            """, (CIRCLE, reference, Jsonb(lines), original)).fetchone()[0]

        def race_journal(reference, lines, original=None, distinct_references=False):
            barrier = Barrier(2)

            def insert(index):
                try:
                    with connect() as db:
                        with db.transaction():
                            db.execute("set local role authenticated")
                            db.execute("select set_config('request.jwt.claim.sub',%s,true)", (OWNER,))
                            barrier.wait(timeout=5)
                            ref = reference + str(index) if distinct_references else reference
                            return insert_journal(db, ref, lines, original)
                except psycopg.errors.UniqueViolation:
                    return None

            with ThreadPoolExecutor(max_workers=2) as pool:
                result = [item for item in pool.map(insert, [1, 2]) if item is not None]
            assert len(result) == 1, result
            return result[0]

        def check_journal(db):
            count, delta, debits = db.execute("""
                select (select count(*) from public.circle_external_journal),
                  sum(case when line->>'side'='debit' then (line->>'cents')::bigint else -(line->>'cents')::bigint end),
                  sum(case when line->>'side'='debit' then (line->>'cents')::bigint else 0 end)
                from public.circle_external_journal j cross join jsonb_array_elements(j.lines) as line
            """).fetchone()
            assert (count, delta, debits) == (2, 0, 24690)
            assert db.execute("""
                select sum(case when line->>'side'='debit' then (line->>'cents')::bigint else -(line->>'cents')::bigint end)
                from public.circle_external_journal j cross join jsonb_array_elements(j.lines) as line
                group by line->>'account'
            """).fetchall() == [(0,), (0,)]

        command("initdb", "-D", data, "-U", getuser(), "--no-locale", "-E", "UTF8", "-A", "trust")
        start(data)
        running = data
        try:
            with connect() as db:
                initialize(db)
            entry = race_journal("bank-close-fixture", LINES)
            race_journal("reversal-fixture", REVERSAL, entry, distinct_references=True)
            with connect() as db:
                check_journal(db)
                job = db.execute("select common_jobs.enqueue('backtest',%s,'recover-1','{}')", (OWNER,)).fetchone()[0]
                acquired = db.execute("select id, lease_token from common_jobs.claim('backtest',5)").fetchone()
                assert acquired[0] == job
            print("PASS concurrent duplicate reference, single reversal, exact balancing and abandoned claim")

            stop(data)
            running = None
            copytree(data, backup, symlinks=True)
            start(data)
            running = data
            db = connect()
            try:
                db.execute("begin")
                db.execute("select set_config('request.jwt.claim.sub',%s,true)", (OWNER,))
                insert_journal(db, "interrupted-fixture", LINES, None)
                stop(data, "immediate")
                running = None
            finally:
                db.close()
            start(data)
            running = data
            with connect() as db:
                check_journal(db)
            print("PASS crash recovery preserved committed rows and rolled back an interrupted transaction")

            stop(data)
            running = None
            start(backup)
            running = backup
            with connect() as db:
                check_journal(db)
                deadline = monotonic() + 7
                while not db.execute("select common_jobs.reap_expired('backtest')").fetchone()[0]:
                    assert monotonic() < deadline, "Worker lease did not expire"
                    sleep(.1)
                state = db.execute("select state from common_jobs.status(%s,%s)", (OWNER,job)).fetchone()[0]
                assert state == "queued"
                assert db.execute("select common_jobs.finish(%s,%s,'succeeded')", acquired).fetchone() == (False,)
            print("PASS cold backup restore, lease recovery and stale completion fencing")
        finally:
            if running:
                stop(running, "immediate")


if __name__ == "__main__":
    main()
