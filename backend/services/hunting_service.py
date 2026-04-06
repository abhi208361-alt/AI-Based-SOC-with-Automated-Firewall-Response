from models.schemas import HuntQuery
from services.attack_service import AttackService


class HuntingService:
    @staticmethod
    def search(query: HuntQuery) -> dict:
        records = AttackService.list_attacks()
        filtered = []

        for r in records:
            if query.source_ip and r["source_ip"] != query.source_ip:
                continue
            if query.attack_type and query.attack_type.lower() not in r["attack_type"].lower():
                continue
            if query.severity and r["severity"] != query.severity:
                continue
            if query.start_time and r["timestamp"] < query.start_time:
                continue
            if query.end_time and r["timestamp"] > query.end_time:
                continue
            filtered.append(r)

        return {"total": len(filtered), "results": filtered}