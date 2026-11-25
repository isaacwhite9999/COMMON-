"""Bounded synthetic traffic against an API and SQLite database created by this process."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import math
import os
from pathlib import Path
import socket
import subprocess
import sys
from tempfile import TemporaryDirectory
from time import perf_counter, sleep

import httpx

ROOT = Path(__file__).resolve().parents[1]


def wait_for_api(base_url: str, process: subprocess.Popen):
    with httpx.Client(timeout=1, trust_env=False) as client:
        for _ in range(60):
            if process.poll() is not None:
                break
            try:
                if client.get(f"{base_url}/api/v1/health/ready").status_code == 200:
                    return
            except httpx.RequestError:
                pass
            sleep(0.1)
    raise RuntimeError("The disposable API did not become ready")


def session(base_url: str, rounds: int):
    measurements = []

    with httpx.Client(base_url=base_url, timeout=8, trust_env=False) as client:
        def measure(method, path, **options):
            started = perf_counter()
            response = client.request(method, path, **options)
            elapsed_ms = (perf_counter() - started) * 1000
            measurements.append((method, path, response.status_code, elapsed_ms))
            return response

        demo = measure("POST", "/api/auth/demo")
        if demo.is_success:
            for _ in range(rounds):
                measure("GET", "/api/me")
                measure("GET", "/api/proposals")
            measure("POST", "/api/auth/logout", headers={"X-CSRF-Token": demo.json()["user"]["csrf"]})
    return measurements


def report(samples, elapsed, population, concurrency):
    failed = sum(status >= 400 for _, _, status, _ in samples)
    print(json.dumps({
        "fixture_users": population,
        "concurrent_sessions": concurrency,
        "requests": len(samples),
        "requests_per_second": round(len(samples) / elapsed, 1),
        "error_rate": round(failed / len(samples), 4),
    }))
    for method, path in sorted({(method, path) for method, path, *_ in samples}):
        durations = sorted(ms for m, p, _, ms in samples if (m, p) == (method, path))
        print(json.dumps({"method": method, "path": path, "count": len(durations), **{
            f"p{percentile}_ms": round(durations[math.ceil(len(durations) * percentile / 100) - 1], 2)
            for percentile in (50, 95, 99)
        }}))
    return failed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--population", type=int, choices=(1000, 10000, 100000), default=1000)
    parser.add_argument("--concurrency", type=int, choices=(4, 8, 16, 32), default=8)
    parser.add_argument("--rounds", type=int, choices=(2, 5, 10, 25), default=5)
    args = parser.parse_args()

    with TemporaryDirectory(prefix="common-load-") as directory:
        database = Path(directory) / "load.sqlite3"
        env = {**os.environ, "DATABASE_URL": f"sqlite:///{database}", "COMMON_API_ENV": "development",
               "PUBLIC_PREVIEW_ONLY": "true", "SEC_USER_AGENT": "", "PUBLIC_ORIGIN": "",
               "SECURE_COOKIES": "false"}
        with socket.socket() as listener, (Path(directory) / "api.log").open("w") as logs:
            listener.bind(("127.0.0.1", 0))
            listener.listen()
            base_url = f"http://127.0.0.1:{listener.getsockname()[1]}"
            process = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "backend.app:app", "--fd", str(listener.fileno()),
                 "--limit-concurrency", "64", "--timeout-graceful-shutdown", "5", "--no-access-log"],
                cwd=ROOT, env=env, pass_fds=(listener.fileno(),), stdout=logs, stderr=subprocess.STDOUT,
            )
            listener.close()
            try:
                wait_for_api(base_url, process)
                # Populate inert synthetic accounts separately from the active HTTP clients.
                from sqlite3 import connect
                from uuid import uuid4
                with connect(database) as db:
                    db.executemany(
                        "INSERT INTO users (id, name, demo, created_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)",
                        ((str(uuid4()), f"Synthetic account {index}") for index in range(args.population)),
                    )
                started = perf_counter()
                with ThreadPoolExecutor(max_workers=args.concurrency) as workers:
                    results = workers.map(lambda _: session(base_url, args.rounds), range(args.concurrency))
                    samples = [measurement for result in results for measurement in result]
                return int(bool(report(samples, perf_counter() - started, args.population, args.concurrency)))
            finally:
                process.terminate()
                try:
                    process.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


if __name__ == "__main__":
    raise SystemExit(main())
