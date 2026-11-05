from pathlib import Path

from pydantic import Field, ValidationInfo, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    TESTING: bool = False
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "medcore-api"
    JWT_AUDIENCE: str = "medcore-client"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, ge=5, le=60)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1, le=30)
    DATABASE_URL: str
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_MB: int = Field(default=10, ge=1)
    CORS_ORIGINS: list[str] = []
    TRUSTED_HOSTS: list[str] = ["localhost", "127.0.0.1"]

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, value: str, info: ValidationInfo) -> str:
        if info.data.get("TESTING", False):
            return value

        # Automatically use installed drivers if bare scheme is provided
        if value.startswith("mysql://"):
            value = "mysql+pymysql://" + value[len("mysql://") :]
        elif value.startswith("postgresql://"):
            value = "postgresql+psycopg2://" + value[len("postgresql://") :]

        try:
            url = make_url(value)
            driver = url.drivername
        except Exception as exc:
            raise ValueError(f"Invalid DATABASE_URL format: {exc}") from exc

        valid_prefixes = ("postgresql", "mysql", "sqlite")
        if not any(driver == p or driver.startswith(f"{p}+") for p in valid_prefixes):
            raise ValueError(
                f"Unsupported database driver '{driver}'. "
                "DATABASE_URL must be a valid PostgreSQL (e.g. postgresql+psycopg2://...), "
                "MySQL (e.g. mysql+pymysql://...), or SQLite connection string."
            )
        return value

    @field_validator("CORS_ORIGINS", "TRUSTED_HOSTS", mode="before")
    @classmethod
    def parse_csv(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.ENVIRONMENT.lower() == "production" and len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production.")
        return self

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
    )


settings = Settings()
