"""Opt-in verification against a disposable, empty PostgreSQL CI database."""
import os
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from backend import app as backend
from backend import init_staging
from backend.database import build_engine
from backend.models import PollVote


def test_staging_postgres_and_concurrent_vote(monkeypatch):
    dsn = os.getenv("COMMON_TEST_POSTGRES_DSN")
    if not dsn:
        pytest.skip("No disposable PostgreSQL CI database configured")
    url = make_url(dsn)
    assert url.host in {"localhost", "127.0.0.1"} and url.database.startswith("common_test_")

    monkeypatch.setenv("COMMON_API_ENV", "staging")
    monkeypatch.setenv("SECURE_COOKIES", "false")
    engine = build_engine(dsn)
    assert not inspect(engine).get_table_names()
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    monkeypatch.setattr(backend, "engine", engine)
    monkeypatch.setattr(backend, "SessionLocal", sessions)
    monkeypatch.setattr(init_staging, "engine", engine)

    with TestClient(backend.app) as client:
        assert client.get("/api/v1/health/live").status_code == 200
        assert client.get("/api/v1/health/ready").status_code == 503
    init_staging.main()
    with pytest.raises(SystemExit, match="fresh disposable"):
        init_staging.main()
    with engine.connect() as connection:
        assert connection.scalar(text("SHOW statement_timeout")) == "5s"

    with TestClient(backend.app) as client:
        assert client.get("/api/v1/health/ready").status_code == 200
        assert client.get("/api/config").json()["public_preview_only"] is True
        demo = client.post("/api/auth/demo")
        assert demo.status_code == 200
        user = demo.json()["user"]
        listing = client.get("/api/proposals").json()["items"]
        item = next(p for p in listing if p["community_slug"] == "tesla-shareholders")
        headers = {"X-CSRF-Token": user["csrf"]}

        def cast(choice):
            return client.post(f"/api/proposals/{item['id']}/vote", json={"choice": choice}, headers=headers)

        with ThreadPoolExecutor(max_workers=4) as pool:
            responses = list(pool.map(cast, ["SUPPORT", "OPPOSE", "ABSTAIN"] * 4))
        assert {response.status_code for response in responses} == {200}
        with sessions() as db:
            votes = db.scalars(select(PollVote).where(PollVote.proposal_id == item["id"])).all()
            assert len(votes) == 1
            assert votes[0].user_id == user["id"]
