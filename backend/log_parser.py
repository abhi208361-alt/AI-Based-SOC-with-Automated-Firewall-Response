import json
from datetime import datetime
from models.schemas import AttackLogIn

SUPPORTED_SEVERITIES = {"low", "medium", "high", "critical"}


def parse_log_line(line: str) -> AttackLogIn:
    data = json.loads(line.strip())

    severity = str(data.get("severity", "low")).lower()
    if severity not in SUPPORTED_SEVERITIES:
        severity = "low"

    payload = AttackLogIn(
        source_ip=data["source_ip"],
        destination_ip=data["destination_ip"],
        attack_type=data["attack_type"],
        severity=severity,
        timestamp=datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00")),
        raw_message=data.get("raw_message", ""),
    )
    return payload