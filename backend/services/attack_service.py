import random
import asyncio
from models.schemas import AttackLogIn
from services.db_service import DBService
from services.ml_service import MLService
from websocket import ws_manager
from services.playbook_service import PlaybookService
from services.mitre_service import MitreService

SEVERITY_TO_NUM = {"low": 1, "medium": 2, "high": 3, "critical": 4}


class AttackService:
    @staticmethod
    def create_attack(log_in: AttackLogIn) -> dict:
        ml_features = {
            "source_port": random.randint(1024, 65535),
            "dest_port": random.choice([22, 80, 443, 3389, 445, 53, 8080]),
            "bytes_sent": random.randint(200, 2500),
            "bytes_received": random.randint(200, 3000),
            "failed_logins": random.randint(0, 30) if "brute" in log_in.attack_type.lower() else random.randint(0, 5),
            "request_rate": random.randint(1, 120),
            "is_internal_src": 0,
            "proto": "tcp",
            "severity_num": SEVERITY_TO_NUM.get(log_in.severity, 1),
        }

        ml_result = MLService.predict(ml_features)
        mitre = MitreService.map_attack(ml_result["predicted_attack_type"])

        item = {
            "source_ip": str(log_in.source_ip),
            "destination_ip": str(log_in.destination_ip),
            "attack_type": ml_result["predicted_attack_type"],
            "detected_attack_type_raw": log_in.attack_type,
            "severity": log_in.severity,
            "timestamp": log_in.timestamp,
            "raw_message": log_in.raw_message or "",
            "risk_score": ml_result["risk_score"],
            "ml_confidence": ml_result["confidence"],
            "anomaly_detected": ml_result["anomaly_detected"],
            "anomaly_score": ml_result["anomaly_score"],
            "action_taken": "none",
            "ml_features": ml_features,
            "mitre_tactic": mitre["tactic"],
            "mitre_technique": mitre["technique"],
        }

        saved = DBService.insert_attack(item)

        playbook = PlaybookService.evaluate_attack(saved)
        saved["playbook_actions"] = playbook["actions"]

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(ws_manager.broadcast({
                "event": "new_attack",
                "data": saved
            }))
        except RuntimeError:
            pass

        return saved

    @staticmethod
    def list_attacks() -> list[dict]:
        return DBService.list_attacks()