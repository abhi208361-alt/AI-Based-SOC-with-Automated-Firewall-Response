from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "AI SOC Firewall"
    APP_ENV: str = "dev"
    APP_DEBUG: bool = True

    API_PREFIX: str = "/api/v1"

    SECRET_KEY: str = "change-me-super-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "postgresql+psycopg2://soc:soc@db:5432/socdb"
    REDIS_URL: str = "redis://redis:6379/0"

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()