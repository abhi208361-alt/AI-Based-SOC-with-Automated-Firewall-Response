from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from deps import require_role
from services.db_service import DBService

router = APIRouter(prefix="/siem", tags=["SIEM"])


@router.get("/export", dependencies=[Depends(require_role(["admin"]))])
def export_siem(limit: int = 500):
    attacks = DBService.list_attacks(limit=limit)

    ecs_docs = []
    for a in attacks:
        ecs_docs.append({
            "@timestamp": a.get("timestamp"),
            "event": {
                "kind": "alert",
                "category": ["intrusion_detection"],
                "type": ["info"],
                "severity": a.get("severity"),
                "risk_score": a.get("risk_score")
            },
            "source": {"ip": a.get("source_ip")},
            "destination": {"ip": a.get("destination_ip")},
            "threat": {
                "technique": {"id": a.get("mitre_technique"), "name": a.get("attack_type")},
                "tactic": {"name": a.get("mitre_tactic")}
            },
            "labels": {
                "ml_confidence": a.get("ml_confidence"),
                "anomaly_detected": a.get("anomaly_detected"),
                "anomaly_score": a.get("anomaly_score")
            },
            "message": a.get("raw_message", "")
        })

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "count": len(ecs_docs),
        "format": "ecs-like-json",
        "data": ecs_docs
    }