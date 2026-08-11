import time

import httpx
from core.config import settings


class ThreatIntelService:
    _cache: dict[str, tuple[float, dict]] = {}

    @classmethod
    def _get_cached(cls, ip: str):
        entry = cls._cache.get(ip)
        if not entry:
            return None
        expires_at, value = entry
        if time.time() >= expires_at:
            cls._cache.pop(ip, None)
            return None
        return value

    @classmethod
    def _set_cached(cls, ip: str, value: dict):
        ttl = max(0, int(settings.threat_intel_cache_ttl_seconds))
        if ttl == 0:
            return
        cls._cache[ip] = (time.time() + ttl, value)

    @staticmethod
    async def check_ip(ip: str) -> dict:
        cached = ThreatIntelService._get_cached(ip)
        if cached:
            return {**cached, "cache_hit": True}

        # If no AbuseIPDB API key => mock mode (required by your spec)
        if not settings.abuseipdb_api_key:
            score = 85 if ip.startswith("185.") or ip.startswith("103.") else 25
            result = {
                "ip": ip,
                "reputation_score": score,
                "malicious": score >= 70,
                "source": "mock",
                "country": "Unknown",
                "isp": "Unknown",
                "cache_hit": False,
            }
            ThreatIntelService._set_cached(ip, result)
            return result

        headers = {"Key": settings.abuseipdb_api_key, "Accept": "application/json"}
        params = {"ipAddress": ip, "maxAgeInDays": 90, "verbose": True}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                settings.abuseipdb_base_url, headers=headers, params=params
            )
            resp.raise_for_status()
            data = resp.json().get("data", {})
            score = int(data.get("abuseConfidenceScore", 0))
            result = {
                "ip": ip,
                "reputation_score": score,
                "malicious": score >= 70,
                "source": "abuseipdb",
                "country": data.get("countryCode", "Unknown"),
                "isp": data.get("isp", "Unknown"),
                "cache_hit": False,
            }
            ThreatIntelService._set_cached(ip, result)
            return result
