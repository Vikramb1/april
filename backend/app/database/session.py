from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.config import settings
from app.database.models import Base

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite only
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)
    # Idempotent migrations — add new JSON columns to tax_returns if they don't exist yet
    _new_cols = ["other_income", "dependents", "misc_info", "state_info"]
    with engine.connect() as conn:
        for col in _new_cols:
            try:
                conn.execute(text(f"ALTER TABLE tax_returns ADD COLUMN {col} JSON"))
                conn.commit()
            except Exception:
                pass  # column already exists


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
