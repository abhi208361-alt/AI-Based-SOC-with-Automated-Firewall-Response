import os
from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = os.getenv("APP_NAME", "AI SOC Firewall")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")
    api_prefix: str = os.getenv("API_PREFIX", "/api/v1")

    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
    mongodb_db: str = os.getenv("MONGODB_DB", "ai_soc_firewall")

    jwt_secret: str = os.getenv("JWT_SECRET", "change-this-secret-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    abuseipdb_api_key: str = os.getenv("ABUSEIPDB_API_KEY", "")
    abuseipdb_base_url: str = os.getenv("ABUSEIPDB_BASE_URL", "https://api.abuseipdb.com/api/v2/check")
    threat_intel_cache_ttl_seconds: int = int(os.getenv("THREAT_INTEL_CACHE_TTL_SECONDS", "300"))


settings = Settings()