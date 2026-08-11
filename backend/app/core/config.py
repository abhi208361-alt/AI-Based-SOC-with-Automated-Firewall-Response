from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "AI-SOC Platform"
    APP_VERSION: str = "0.1.0"
    ENV: Literal["dev", "test", "prod"] = "dev"
    DEBUG: bool = False

    API_V1_PREFIX: str = "/api/v1"
    DOCS_ENABLED: bool = True

    SECRET_KEY: str = Field(default="", min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    DATABASE_URL: str = ""
    REDIS_URL: str = ""

    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    RATE_LIMIT_DEFAULT: str = "120/minute"
    RATE_LIMIT_LOGIN: str = "5/minute"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        # In prod, enforce strong secret key
        if v and len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters.")
        return v

    def validate_for_runtime(self) -> None:
        """
        Fail fast for production misconfiguration.
        """
        if self.ENV == "prod":
            missing = []
            if not self.SECRET_KEY:
                missing.append("SECRET_KEY")
            if not self.DATABASE_URL:
                missing.append("DATABASE_URL")
            if not self.REDIS_URL:
                missing.append("REDIS_URL")
            if missing:
                raise RuntimeError(
                    f"Missing required production settings: {', '.join(missing)}"
                )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate_for_runtime()
    return settings
