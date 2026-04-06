import httpx
from core.config import settings


class ThreatIntelService:
    @staticmethod
    async def check_ip(ip: str) -> dict:
        # If no AbuseIPDB API key => mock mode (required by your spec)
        if not settings.abuseipdb_api_key:
            score = 85 if ip.startswith("185.") or ip.startswith("103.") else 25
            return {
                "ip": ip,
                "reputation_score": score,
                "malicious": score >= 70,
                "source": "mock",
                "country": "Unknown",
                "isp": "Unknown",
            }

        headers = {"Key": settings.abuseipdb_api_key, "Accept": "application/json"}
        params = {"ipAddress": ip, "maxAgeInDays": 90, "verbose": True}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(settings.abuseipdb_base_url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json().get("data", {})
            score = int(data.get("abuseConfidenceScore", 0))
            return {
                "ip": ip,
                "reputation_score": score,
                "malicious": score >= 70,
                "source": "abuseipdb",
                "country": data.get("countryCode", "Unknown"),
                "isp": data.get("isp", "Unknown"),
            }