"""Explicitly initialize a fresh disposable PostgreSQL database for legacy API staging."""
import os

from sqlalchemy import inspect
from sqlalchemy.orm import Session

from .app import engine
from .models import Base
from .seed import seed


def main():
    if os.getenv("COMMON_API_ENV") != "staging" or engine.dialect.name != "postgresql":
        raise SystemExit("Initialization requires COMMON_API_ENV=staging and a disposable PostgreSQL database.")
    with engine.begin() as connection:
        inspector = inspect(connection)
        user_schemas = {
            name for name in inspector.get_schema_names()
            if name not in {"public", "information_schema"} and not name.startswith("pg_")
        }
        if user_schemas or inspector.get_table_names(schema="public") or inspector.get_view_names(schema="public"):
            raise SystemExit("Use a fresh disposable PostgreSQL database with an empty public schema.")
        Base.metadata.create_all(connection)
        with Session(bind=connection) as db:
            seed(db)
    engine.dispose()


if __name__ == "__main__":
    main()
