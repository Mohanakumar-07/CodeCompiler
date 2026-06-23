"""Copy the exact contents of the local SQLite database into TiDB.

This script does not delete or modify the source SQLite database. It creates the
target schema if needed, then copies every row table-by-table in foreign-key order.

Run from the backend directory, for example:
  python migrate_sqlite_to_tidb.py \
    --source sqlite:///./test_platform.db \
    --target mysql+pymysql://USER:PASSWORD@HOST:4000/DBNAME
"""

from __future__ import annotations

import argparse
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, insert, select, text

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from database import Base  # noqa: E402
import models  # noqa: E402,F401  # Ensure all ORM tables are registered


def normalize_mysql_url(url: str) -> str:
    if url.startswith("mysql://"):
        return url.replace("mysql://", "mysql+pymysql://", 1)
    return url


def iter_table_rows(connection, table) -> list[dict]:
    result = connection.execute(select(table))
    return [dict(row) for row in result.mappings().all()]


def copy_table(source_connection, target_connection, table) -> int:
    rows = iter_table_rows(source_connection, table)
    if not rows:
        return 0
    target_connection.execute(insert(table), rows)
    return len(rows)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Copy local SQLite data into TiDB.")
    parser.add_argument(
        "--source",
        default=os.getenv("SOURCE_DATABASE_URL", "sqlite:///./test_platform.db"),
        help="Source SQLite URL or path. Default: sqlite:///./test_platform.db",
    )
    parser.add_argument(
        "--target",
        default=os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL"),
        help="Target TiDB/MySQL URL. Falls back to TARGET_DATABASE_URL or DATABASE_URL.",
    )
    parser.add_argument(
        "--allow-nonempty-target",
        action="store_true",
        help="Skip the safety check that blocks writes when TiDB already has data.",
    )
    return parser


def target_has_data(target_connection) -> bool:
    for table in Base.metadata.sorted_tables:
        count = target_connection.execute(text(f"SELECT COUNT(*) FROM {table.name}")).scalar_one()
        if count:
            return True
    return False


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if not args.target:
        raise SystemExit("A TiDB target URL is required. Set --target or TARGET_DATABASE_URL.")

    source_url = normalize_mysql_url(args.source)
    target_url = normalize_mysql_url(args.target)

    source_engine = create_engine(source_url, future=True)
    target_engine = create_engine(target_url, future=True)

    Base.metadata.create_all(bind=target_engine)

    with source_engine.connect() as source_connection, target_engine.begin() as target_connection:
        if not args.allow_nonempty_target and target_has_data(target_connection):
            raise SystemExit(
                "Target TiDB already contains data. Aborting to avoid duplicating or overwriting rows. "
                "Use --allow-nonempty-target only if you know the target is safe to append to."
            )

        try:
            target_connection.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        except Exception:
            pass

        copied_total = 0
        for table in Base.metadata.sorted_tables:
            copied = copy_table(source_connection, target_connection, table)
            if copied:
                print(f"[copied] {table.name}: {copied} row(s)")
                copied_total += copied
            else:
                print(f"[skip] {table.name}: no rows")

        try:
            target_connection.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        except Exception:
            pass

    print(f"Done. Copied {copied_total} row(s) from SQLite to TiDB.")


if __name__ == "__main__":
    main()