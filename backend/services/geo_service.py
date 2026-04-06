import httpx


class GeoService:
    @staticmethod
    async def lookup_ip(ip: str) -> dict:
        url = f"http://ip-api.com/json/{ip}?fields=status,country,regionName,city,lat,lon,isp,org,query"
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(url)
                data = r.json()
                if data.get("status") != "success":
                    return {"ip": ip, "country": None, "city": None, "lat": None, "lon": None, "isp": None}
                return {
                    "ip": data.get("query"),
                    "country": data.get("country"),
                    "region": data.get("regionName"),
                    "city": data.get("city"),
                    "lat": data.get("lat"),
                    "lon": data.get("lon"),
                    "isp": data.get("isp"),
                    "org": data.get("org")
                }
        except Exception:
            return {"ip": ip, "country": None, "city": None, "lat": None, "lon": None, "isp": None}