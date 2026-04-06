import json
from pathlib import Path

MAP_PATH = Path(__file__).resolve().parent.parent / "data" / "mitre_mapping.json"

with open(MAP_PATH, "r", encoding="utf-8") as f:
    MITRE_MAP = json.load(f)


class MitreService:
    @staticmethod
    def map_attack(attack_type: str) -> dict:
        return MITRE_MAP.get(attack_type, {"tactic": "Unknown", "technique": "Unknown"})