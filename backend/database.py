"""Database engine policy for the prototype and isolated API staging."""
from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url


def bounded_integer(name: str, default: int, minimum: int, maximum: int) -> int:
    value = int(os.getenv(name, str(default)))
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value


def build_engine(database_url: str):
    environment = os.getenv("COMMON_API_ENV", "development")
    if environment not in {"development", "staging"}:
        raise ValueError("The legacy API supports development and isolated staging only")
    url = make_url(database_url)
    options = {
        "pool_pre_ping": True,
        "pool_size": bounded_integer("COMMON_DB_POOL_SIZE", 5, 1, 50),
        "max_overflow": bounded_integer("COMMON_DB_MAX_OVERFLOW", 0, 0, 25),
        "pool_timeout": bounded_integer("COMMON_DB_POOL_TIMEOUT", 2, 1, 15),
    }
    if url.get_backend_name() == "sqlite" and environment == "development":
        if url.database in {None, "", ":memory:"}:
            return create_engine(url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
        return create_engine(url, connect_args={"check_same_thread": False, "timeout": 5}, **options)
    if url.get_backend_name() != "postgresql":
        raise ValueError("Isolated staging requires PostgreSQL")
    if url.drivername not in {"postgresql", "postgresql+psycopg"}:
        raise ValueError("Use the psycopg 3 PostgreSQL driver")
    statement_ms = bounded_integer("COMMON_DB_STATEMENT_TIMEOUT_MS", 5_000, 100, 60_000)
    return create_engine(
        url.set(drivername="postgresql+psycopg"),
        connect_args={"connect_timeout": 3, "options": f"-c statement_timeout={statement_ms} -c lock_timeout=2000"},
        **options,
    )
