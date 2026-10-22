from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = Field(default=10, ge=1)

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if make_url(value).drivername not in {
            "postgresql",
            "postgresql+psycopg2",
        }:
            raise ValueError("DATABASE_URL must use PostgreSQL.")
        return value

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
    )


settings = Settings()
