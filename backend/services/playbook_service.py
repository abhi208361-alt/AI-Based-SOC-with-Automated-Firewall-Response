from datetime import datetime, timezone
from services.db_service import DBService
from services.firewall_service import FirewallService
from models.schemas import FirewallActionRequest

AUTO_BLOCK_THRESHOLD = 85
AUTO_INCIDENT_THRESHOLD = 70


class PlaybookService:
    @staticmethod
    def evaluate_attack(attack: dict) -> dict:
        actions = []

        risk = int(attack.get("risk_score", 0))
        src_ip = attack.get("source_ip")

        # 1) Auto-incident creation
        if risk >= AUTO_INCIDENT_THRESHOLD:
            incident_id = f"inc-{attack.get('id', 'unknown')}"
            incident = {
                "incident_id": incident_id,
                "attack_id": attack.get("id"),
                "source_ip": src_ip,
                "severity": attack.get("severity"),
                "risk_score": risk,
                "status": "open",
                "title": f"High-risk attack detected from {src_ip}",
                "created_at": datetime.now(timezone.utc),
            }
            DBService.insert_incident(incident)
            actions.append(f"incident_created:{incident_id}")

        # 2) Auto-block for critical risk
        if risk >= AUTO_BLOCK_THRESHOLD and src_ip:
            req = FirewallActionRequest(ip_address=src_ip, reason=f"Auto-block by playbook (risk={risk})")
            fw = FirewallService.block_ip(req)
            actions.append("ip_blocked" if fw.get("success") else "ip_block_failed")

        return {"risk_score": risk, "actions": actions}