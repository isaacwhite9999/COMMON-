"""Print a read-only COMMON durable queue snapshot as JSON."""
import argparse
import json
import sys

import psycopg


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        epilog="Use libpq connection settings or an approved PGSERVICE entry for the observer login.",
    )
    parser.parse_args()
    try:
        with psycopg.connect(connect_timeout=5) as db:
            db.execute("set transaction read only")
            db.execute("set local statement_timeout='5s'")
            snapshot = db.execute("""
                select coalesce(jsonb_agg(to_jsonb(q) order by kind), '[]'::jsonb)
                from common_jobs.queue_health() q
            """).fetchone()[0]
    except psycopg.Error as exc:
        diagnostic = f"SQLSTATE {exc.sqlstate}" if exc.sqlstate else "connection unavailable"
        print(f"Could not read queue health ({diagnostic}). Check the observer connection and grants.", file=sys.stderr)
        return 1
    json.dump(snapshot, sys.stdout, indent=2, sort_keys=True)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
